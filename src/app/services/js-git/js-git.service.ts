
import { Injectable } from "@angular/core";
import { Observable } from "rxjs/Observable";
import { LoginService } from "../../services/login/login.service";
import * as HighLevel from "js-git/mixins/high-level";

import { Http, Headers, Response, RequestOptions } from '@angular/http';

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

    private is_clonned = false;

    constructor(private _http: Http, private _loginService: LoginService) {
        this.userToken = this._loginService.getToken("api_token");
        this.headers = new Headers({ "Authorization": "OAuth2 " + this.userToken });
        this.httpOptions = new RequestOptions({ headers: this.headers });
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

                this.repo[repoUrl]["resolveRepo"]((data) => {
                    this.repository[repoUrl] = data;
                    const level = data["/"];
                    observer.next(this.formatFolder(level, "/", repoUrl));
                });
            });
        });
    }

    public getContent(id: string) {

        return Observable.create((observer) => {
            this.repo[this.files[id].repoUrl]["getContentByHash"](this.files[id].hash, (content) => {
                observer.next(content);
            });
        });
    }

    public init(data): Observable<any> {

        if (/repositories$/.test(data)) {
            return this._http.get(data, this.httpOptions).map(response => {
                const userRepositories = response.json();
                const parsedRepositories = [];
                userRepositories.items.forEach(element => {
                    if (element.hasOwnProperty("clone_urls") && element.clone_urls[1] !== "https://git.4xphq.arvadosapi.com/arvados.git" && element.name != "arvados") {
                        this.repo_uuid[element.clone_urls[1]] = element.uuid;
                        parsedRepositories.push({
                            "dirname": element.name,
                            "isDir": true,
                            "isFile": false,
                            "isReadable": true,
                            "isWritable": true,
                            "language": "",
                            "name": element.name,
                            "path": element.clone_urls[1],
                            "type": "",
                            "repoUrl": element.clone_urls[1]
                        });
                    }
                });
                return parsedRepositories;
            });
        } else if (/.git$/.test(data.path)) {
            return this.createRepo(data.repoUrl);
        } else {
            return Observable.create((observer) => {
                const folder = this.repository[data.repoUrl][data.path];

                if (folder.mode === 16384) {
                    observer.next(this.formatFolder(folder, data.path, data.repoUrl));
                }
            });
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
            let fileToCommit = Object.assign({}, this.files[data.path]);
            let repoUrl = fileToCommit.repoUrl;
            delete fileToCommit.hash;
            delete fileToCommit.repoUrl;
            fileToCommit.content = data.content;
            dataForCommit.push(fileToCommit);
            self.repo[repoUrl]["commit"](dataForCommit, "commit message", (feedback) => {
                self.repo[repoUrl]["push"]((feedback) => {
                });
                observer.next(true);
            });
        });
    }
}
