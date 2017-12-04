import { Injectable } from "@angular/core";
import { Observable } from "rxjs/Observable";
import * as run from "gen-run";
import { LoginService } from "../../services/login/login.service";
import JsGit from "./js-git";
import * as HighLevel from "js-git/mixins/high-level";

import { Http, Headers, Response, RequestOptions } from '@angular/http';

@Injectable()
export class JSGitService {

    private userName = "none";
    private userToken = "3h4ji3cve5g75chh2xn3t8t2dme9zv53v3ly9oqw7t1vc0w0lt";
    private headers;
    private httpOptions;
    private repo = {};
    private repository = {};
    private files = {};

    constructor(private _http: Http) {
        this.headers = new Headers({ "Authorization": "OAuth2 " + "4e3lve4d7rqmpft49cavdp81w53ypv5vhqhhezr8qhdklsmh8n" });
        this.httpOptions = new RequestOptions({ headers: this.headers });
    }

    private createRepo(data: string): Observable<any> {
        const self = this;
        HighLevel(this.repo, self.userName, self.userToken, data);
        return Observable.create((observer) => {
            this.repo["clone"]((data) => {
                this.repo["resolveRepo"]((data) => {

                    this.repository = data;
                    const level = data["/"];
                    this.formatFolder(level, data);
                    observer.next(this.formatFolder(level, "/"));
                });
            });
        });
    }

    public getContent(hash: string) {
        return Observable.create((observer) => {
            this.repo["getContentByHash"](hash, (content) => {
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
                    if (element.hasOwnProperty("clone_urls")) {
                        parsedRepositories.push({
                            "dirname": element.name,
                            "isDir": true,
                            "isFile": false,
                            "isReadable": true,
                            "isWritable": true,
                            "language": "",
                            "name": element.name,
                            "path": element.clone_urls[1],
                            "type": ""
                        });
                    }
                });
                return parsedRepositories;
            });
        } else if (/.git$/.test(data)) {
            return this.createRepo("https://git.4xphq.arvadosapi.com/rdzakmic/rdzakmic.git");
        } else {
            return Observable.create((observer) => {
                const folder = this.repository[data];
                if (folder.mode === 16384) {
                    observer.next(this.formatFolder(folder, data));
                }
            });
        }
    }

    private formatFolder(folder, path) {
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
                    "name": path,
                    "path": path + key + "/",
                    "type": ""
                });
            } else {

                this.files[folder.body[key].hash] = {
                    path: path + key,
                    mode: folder.body[key].mode,
                    content: ""
                };

                results.push({
                    "dirname": "",
                    "isDir": false,
                    "isFile": true,
                    "isReadable": true,
                    "isWritable": true,
                    "language": "",
                    "name": key,
                    "path": folder.body[key].hash,
                    "type": "Workflow"
                });
            }
        }
        return results;
    }
    public saveToGitRepo(data) {
        const self = this;
        return Observable.create((observer) => {
            const dataForCommit = [];
            const fileToCommit = this.files[data.path];
            fileToCommit.content = data.content;
            dataForCommit.push(fileToCommit);
            this.repo["commit"](dataForCommit, "commit message", (feedback) => {
                self.repo["push"]((feedback) => {
                });
                observer.next(true);
            });
        });
    }
}
