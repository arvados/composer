
import { Injectable } from "@angular/core";
import { Observable } from "rxjs/Observable";
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
    private repository = {};
    private repo_uuid = {};
    private files = {};

    constructor(private auth: AuthService, private _http: Http) {
        this.auth.getActive().subscribe((active) => {
            this.userToken = active.token;
        });
    }

    private createRepo(repoUrl: string): Observable<any> {
        this.repo[repoUrl] = {};

        HighLevel(this.repo[repoUrl], this.userName, this.userToken, repoUrl);
        return Observable.create((observer) => {
            this.repo[repoUrl]["clone"]((data) => {

                if (!data) {
                    this.repo = {};
                    this.repository = {};
                    this.files = {};
                    observer.next([]);
                }

                this.repo[repoUrl]["resolveRepo"]((res) => {
                    this.repository[repoUrl] = res;
                    observer.next(res);
                });
            });
        });
    }

    public getContent(id: Object) : Observable<string> {
        return Observable.create((observer) => {
            this.repo[this.files[id["path"]].repoUrl]["getContentByHash"](this.files[id["path"]].hash, (content) => {
                observer.next(content);
                observer.complete();
            });
        });
    }

    public getRepo(repoUrl): Observable<any> {
        if (this.repo[repoUrl]) {
            return this.repo[repoUrl];
        } else {
            return this.createRepo(repoUrl);
        }
    }

    getFileInfo(fileKey: string) {
        return this.files[fileKey];
    }

    getRepoUuid(repoUrl: string): string {
        return this.repo_uuid[repoUrl];
    }

    getRepoCommit(repoUrl: string, branch: string): Observable<string> {
        var repos = this.repo;
        return Observable.create(function (observer) {
            repos[repoUrl].readRef('refs/heads/'+branch, (err, commitHash) => {
                observer.next(commitHash);
                observer.complete();
            });
        });
    }

    private formatFolder(folder, path, repoKey) {
        const results = [];
        for (const key in folder.body) {
            if (folder.body[key].mode === 16384) {
                results.push({
                    "dirname": "",
                    "isDir": true,
                    "isFile": false,
                    "isReadable": true,
                    "isWritable": true,
                    "language": "",
                    "name": key,
                    "path": path + key + "/",
                    "type": "",
                    "repoUrl": repoKey
                });
            } else {
                let objectKey = repoKey + "#" + path + key;
                this.files[objectKey] = {
                    path: path + key,
                    mode: folder.body[key].mode,
                    content: "",
                    hash: folder.body[key].hash,
                    repoUrl: repoKey
                };

                results.push({
                    "dirname": "",
                    "isDir": false,
                    "isFile": true,
                    "isReadable": true,
                    "isWritable": true,
                    "language": "",
                    "name": key,
                    "path": objectKey,
                    "type": "Workflow",
                    "repoUrl": repoKey
                });
            }
        }
        return results;
    }

    public saveToGitRepo(data) {
        const self = this;

        return Observable.create((observer) => {
            const dataForCommit = [];
            let fileToCommit = Object.assign({}, self.files[data.path]);
            let repoUrl = fileToCommit.repoUrl;
            delete fileToCommit.hash;
            delete fileToCommit.repoUrl;
            fileToCommit.content = data.content;
            dataForCommit.push(fileToCommit);
            self.repo[repoUrl]["commit"](dataForCommit, "commit message", (feedback) => {
                self.repo[repoUrl]["push"]((feedback) => {
                    console.log(feedback);
                    observer.next(feedback);
                    observer.complete();
                });
                self.repo[repoUrl]["resolveRepo"]((repodata) => {
                    let objectKey = data.path;
                    var repopath = self.files[objectKey].path;
                    self.repository[repoUrl] = repodata;
                    self.files[objectKey].hash = repodata[repopath].hash;
                });
            });
        });
    }
}
