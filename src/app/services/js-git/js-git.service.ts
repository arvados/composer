import {Injectable} from '@angular/core';
import * as run from 'gen-run';
import {LoginService} from "../../services/login/login.service";
import JsGit from './js-git';

@Injectable()
export class JSGitService {

    private repo = {};
    private host = "https://git.4xphq.arvadosapi.com/";
    private repoName = "jbesic/jbesic.git";
    private userName = 'none';
    private userToken = "60pl0ltxezueb6kuqwdiyg29o18l6nmx38rjd9si91jif34fbw";

    constructor() {
        let jsGit = new JsGit({
            host: this.host,
            repoName: this.repoName,
            userName: this.userName,
            userToken: this.userToken
        });

        run(function* () {
            yield* jsGit.clone();
            yield* jsGit.commit();
            yield* jsGit.push();
        });

    }

}