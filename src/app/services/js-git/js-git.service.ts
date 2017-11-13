import { Injectable } from '@angular/core';
import * as run from 'gen-run';
import { LoginService } from "../../services/login/login.service";
import JsGit from './js-git';

@Injectable()
export class JSGitService {

    private host = "https://git.4xphq.arvadosapi.com/";
    private repoName: string;
    private userName = 'none';
    private userToken = "60pl0ltxezueb6kuqwdiyg29o18l6nmx38rjd9si91jif34fbw";

    constructor() { }

    private extractRepoName(data: string) {
        let startIndex = data.indexOf(this.host);
        let hostLength = this.host.length;
        let repoName = data.substring(startIndex + hostLength);

        return /^\//.test(repoName) ? repoName.substring(1) : repoName;
    }

    private createRepo(data: string): JsGit {
        let repo = new JsGit({
            host: this.host,
            repoName: this.extractRepoName(data),
            userName: this.userName,
            userToken: this.userToken
        });

        return repo;
    }

    public init(data, callback: Function): any {
        var self = this;
        run(function* () {
            let repo = self.createRepo(data);
            yield* repo.clone();
            var results = yield* repo.getFiles();
            callback(results);
        });
    }

}