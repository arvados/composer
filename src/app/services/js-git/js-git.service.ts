import { Injectable } from '@angular/core';

import * as request from 'js-git/net/request-xhr';
import * as consume from 'culvert/consume';
import * as httpTransport from 'js-git/net/transport-http';
import * as fetchPackProtocol from 'js-git/net/git-fetch-pack';

import * as memDB from 'js-git/mixins/mem-db';
import * as ReadCombiner from 'js-git/mixins/read-combiner';
import * as PackOps from 'js-git/mixins/pack-ops';
import * as Walkers from 'js-git/mixins/walkers';
import * as Formats from 'js-git/mixins/formats';

@Injectable()
export class JSGitService {

    private repo = {};
    private host = "https://git.qr1hi.arvadosapi.com/";
    private repoName = "jbesic/jbesic.git";
    private userToken = "2ksnd9c7ar3ws45fz40r6gd2varednda5i4smog04d064u3edc";

    private clone(repo, transport, options): any {
        var api = fetchPackProtocol(transport);
        api.take(function (err, refs) {
            for(var ref in refs) {
                repo.updateRef(ref, refs[ref], function(err, commit) {
                    console.log('Added to a local repository', ref);
                });
                api.put({want: refs[ref]});
            }

            api.put(null);
            api.put({done: true});
        });

        api.take(function (err, channels) {
            repo.unpack(channels.pack, options, function(err, hashes) {
                for (var i = 0; i < options.wants.length; i++) {
                    var name = options.wants[i];
                    repo.readRef(name, function(err, refHash) {
                        repo.logWalk(refHash, function(err, logStream) {
                            function collectHashes(err, commit) {
                                // commit: This is the commit for the current branch
                                if (commit !== undefined) {
                                    repo.loadAs("tree", commit.tree, function(err, tree) {
                                        for (var directory in tree) {
                                            repo.loadAs('tree', tree[directory].hash, function(err, files) {
                                                for (var file in files) {
                                                    repo.loadAs('text', files[file].hash, function(err, content) {
                                                        // content: Files content for the current directory
                                                        console.log(content);
                                                    });
                                                }
                                            });
                                        }
                                    });

                                    // Find solution for older commits
                                    //logStream.read(collectHashes);
                                }
                            }

                            // walk through commits
                            logStream.read(collectHashes);
                        });
                    });
                }
            });
        });

    }

    constructor() {

        (function () {
            var cors_api_host = '127.0.0.1:8080';
            var cors_api_url = 'http://' + cors_api_host + '/';
            var slice = [].slice;
            var origin = window.location.protocol + '//' + window.location.host;
            var open = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function () {
                var args = slice.call(arguments);
                var targetOrigin = /^https?:\/\/([^\/]+)/i.exec(args[1]);
                if (targetOrigin && targetOrigin[0].toLowerCase() !== origin &&
                    targetOrigin[1] !== cors_api_host) {
                    args[1] = cors_api_url + args[1];
                }
                return open.apply(this, args);
            };

        })();

        var self = this;

        var _httpTransport = httpTransport(request);
        memDB(self.repo);
        ReadCombiner(self.repo);
        PackOps(self.repo);
        Walkers(self.repo);
        Formats(self.repo);



        var transport = _httpTransport(self.host + self.repoName, 'none', self.userToken);
        var api = fetchPackProtocol(transport, function (err) {
            console.log("Network Error:\n" + err.toString() + "\n");
            throw err;
        });

        var refs = self.clone(self.repo, transport, {
            depth: 10,
            wants: ["refs/heads/master"],
            onProgress: function () {
                //console.log("onProgress", arguments);
            }
        });

    }

}