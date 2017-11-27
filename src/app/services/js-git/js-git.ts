import { Injectable } from '@angular/core';

import * as modes from 'js-git/lib/modes';
import * as request from 'js-git/net/request-xhr';
import * as consume from 'culvert/consume';
import * as httpTransport from 'js-git/net/transport-http';
import * as fetchPackProtocol from 'js-git/net/git-fetch-pack';
import * as sendPackProtocol from 'js-git/net/git-send-pack';

import * as CreateTree from 'js-git/mixins/create-tree';
import * as MemDB from 'js-git/mixins/mem-db';
import * as ReadCombiner from 'js-git/mixins/read-combiner';
import * as PackOps from 'js-git/mixins/pack-ops';
import * as Walkers from 'js-git/mixins/walkers';
import * as Formats from 'js-git/mixins/formats';

import { CookieService } from 'ngx-cookie';

@Injectable()
export default class JSGit {

    private repo = {
        fetch: null,
        push: null
    };

    constructor(private settings: { repoName, userName, userToken }) {

        let _cookieService: CookieService;

        if (!this.settings.userName) {
            this.settings.userName = 'none';
        }

        if (!this.settings.userToken) {
            this.settings.userToken = _cookieService.get("api_token");
        }

        MemDB(this.repo);
        CreateTree(this.repo);
        ReadCombiner(this.repo);
        PackOps(this.repo);
        Walkers(this.repo);
        Formats(this.repo);

        let _httpTransport = httpTransport(request);
        let transport = _httpTransport(this.settings.repoName, this.settings.userName, this.settings.userToken);
        this.repo.fetch = fetchPackProtocol(transport);
        this.repo.push = sendPackProtocol(transport);

    }

    public *getFiles(): any {
        let self = this;
        let fetch = self.repo.fetch;

        let refHash = yield self.repo['readRef']('refs/heads/master');
        let commit = yield self.repo['loadAs']('commit', refHash);

        let object, files = [];
        if (commit !== undefined) {
            let treeStream = yield self.repo['treeWalk'](commit.tree);
            while (object = yield treeStream.read(), object !== undefined) {
                let loadType = object.body ? 'tree' : 'text';
                let content = yield self.repo['loadAs'](loadType, object.hash);
                files.push(object);
            }
        }

        return files;
    }

    public *clone(): any {
        let self = this;
        let fetch = self.repo.fetch;

        let refs = yield fetch.take;
        fetch.put({ want: refs['refs/heads/master'] });

        fetch.put(null);
        fetch.put({ done: true });

        let channels = yield fetch.take;
        yield self.repo['unpack'](channels.pack, {});

        for (let ref in refs) {
            yield self.repo['updateRef']('refs/heads/master', refs['refs/heads/master']);
        }
    }

    public *commit(): any {
        let self = this;
        let refHash = yield self.repo['readRef']('refs/heads/master');
        let commit = yield self.repo['loadAs']('commit', refHash);

        // Changes to files that already exists
        let changes = [
            {
                path: "/test/justAdded22.txt",
                mode: modes.file,
                content: ""
            },
            {
                path: "/test/second.txt",
                mode: modes.file,
                content: "This is the updated content 111safa."
            }
        ];

        changes['base'] = commit.tree;

        let treeHash = yield self.repo['createTree'](changes);
        let commitHash = yield self.repo['saveAs']("commit", {
            author: {
                name: commit.author.name,
                email: commit.author.email
            },
            tree: treeHash,
            parent: refHash,
            message: "This is the commit message.\n"
        });

        yield self.repo['updateRef']('refs/heads/master', commitHash);
    }

    public *push(): any {
        let self = this;
        let push = self.repo.push;

        let refHash = yield self.repo['readRef']('refs/heads/master');
        let commit = yield self.repo['loadAs']('commit', refHash);

        let sendPack = yield push.take;

        push.put({ oldhash: commit.parents[0], newhash: refHash, ref: 'refs/heads/master' });
        push.put(null);

        let hashes = [refHash], object;
        let treeStream = yield self.repo['treeWalk'](commit.tree);
        while (object = yield treeStream.read(), object !== undefined) {
            hashes.push(object.hash);
        }

        let stream = yield self.repo['pack'](hashes, {});
        let packObject;
        while (packObject = yield stream.take, packObject !== undefined) {
            push.put(packObject);
        }

        push.put({flush: true});
    }

}