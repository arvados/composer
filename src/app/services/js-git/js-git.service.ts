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

    public repo = {};
    private githubName = "jbesic/jbesic.git";
    private githubToken = "2ksnd9c7ar3ws45fz40r6gd2varednda5i4smog04d064u3edc";
    private host = "https://git.qr1hi.arvadosapi.com/";
    private defaultPorts = {
        git: 9418,
        http: 80,
        https: 443
    };

    private clone(repo, transport, options): any {
        var api = fetchPackProtocol(transport);
        api.take(function () {
            var refs = arguments[1];
            var wants = options.wants;
            wants.forEach(function (want) {
                // Skip peeled refs
                if (/\^\{\}$/.test(want)) return;
                // Ask for the others
                var result = api.put({want: refs[want]});
            });
            if (options.depth) {
                api.put({deepen: options.depth});
            }
            api.put(null);
            api.put({done: true});
            api.put();

            api.take(function (err, channels) {
                repo.unpack(channels.pack, options, function(err, value) {
                    for (var i = 0; i < wants.length; i++) {
                        var name = wants[i];
                        if (name === "HEAD" || !refs[name]) continue;
                        repo.updateRef(name, refs[name], function(err, commit) {
                            // repo.logWalk we use to walk through commits
                            repo.logWalk(commit, function(err, logStream) {
                                logStream.read(function(err, commit) {
                                    // repo.treeWalk we use to walk through directories and files
                                    /*repo.treeWalk(commit.tree, function(err, treeStream) {
                                        treeStream.read(function(err, object) {
                                            console.log(object)
                                        });
                                    });*/

                                    repo.loadAs("tree", commit.tree, function(err, directory) {
                                        repo.loadAs("tree", directory.test.hash, function(err, files) {
                                            repo.loadAs('text', files['test.cwl'].hash, function(err, content) {
                                                console.log(content);
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    }
                });
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

        var transport = _httpTransport(self.host + self.githubName, 'none', self.githubToken);
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