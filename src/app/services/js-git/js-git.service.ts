
import { Injectable } from "@angular/core";
import { Observable } from "rxjs/Observable";
import { ReplaySubject } from "rxjs/ReplaySubject";
import * as HighLevel from "js-git/mixins/high-level";

import { Http, Headers, Response, RequestOptions } from '@angular/http';
import {AuthService} from "../../auth/auth.service"

@Injectable()
export class JSGitService {
    private userName = "none";
    private userToken;
    private headers;
    private httpOptions;
    private repo = {};

    constructor(private auth: AuthService, private _http: Http) {
        this.auth.getActive().subscribe((active) => {
            this.userToken = active.token;
        });
    }

    private createRepo(repoUrl: string): Observable<any> {
        const repoObj = {};
        HighLevel(repoObj, this.userName, this.userToken, repoUrl);

        repoObj["contents"] = new ReplaySubject(1);
        this.repo[repoUrl] = repoObj;

        this.repo[repoUrl]["clone"]((data) => {

            if (!data) {
                return;
            }

            repoObj["resolveRepo"]((res) => {
                console.log(res);
                repoObj["contents"].next(res);
            });
        });
        return repoObj["contents"];
    }

    public getFileContent(fileKey: string) : Observable<string> {
        const sp = fileKey.split("#", 2);
        const repo = this.repo[sp[0]];
        return repo["contents"].flatMap((contents) => {
            const filehash = contents[sp[1]].hash;
            return Observable.create((observer) => {
                repo["getContentByHash"](filehash, (content) => {
                    observer.next(content);
                    observer.complete();
                });
            });
        });
    }

    public getRepoContents(repoUrl): Observable<any> {
        if (this.repo[repoUrl]) {
            return this.repo[repoUrl]["contents"];
        } else {
            return this.createRepo(repoUrl);
        }
    }

    getFileInfo(fileKey: string): Observable<any> {
        const sp = fileKey.split("#", 2);
        return this.getRepoContents(sp[0]).map(r => r[sp[1]]);
    }

    getRepoHead(repoUrl: string, branch: string): Observable<string> {
        var repos = this.repo;
        return Observable.create(function (observer) {
            repos[repoUrl].readRef('refs/heads/'+branch, (err, commitHash) => {
                observer.next(commitHash);
                observer.complete();
            });
        });
    }

    public saveToGitRepo(path: string, content: string) {
        const self = this;
        const sp = path.split("#", 2);
        const repoObj = this.repo[sp[0]];

        return Observable.create((observer) => {
            const fileToCommit = {
                path: sp[1],
                mode: 33188,
                content
            };
            const dataForCommit = [fileToCommit];
            repoObj["commit"](dataForCommit, "commit message", (feedback) => {
                repoObj["push"]((feedback) => {
                    console.log(feedback);
                    observer.next(content);
                    observer.complete();
                });
                repoObj["resolveRepo"]((res) => {
                    repoObj["contents"].next(res);
                });
            });
        });
    }
}
