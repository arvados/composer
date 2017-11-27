import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import * as run from 'gen-run';
import { LoginService } from "../../services/login/login.service";
import JsGit from './js-git';


import { Http, Headers, RequestOptions } from '@angular/http';

@Injectable()
export class JSGitService {

    private host = "https://4xphq.arvadosapi.com/";
    private userName = 'none';
    private userToken = "4e3lve4d7rqmpft49cavdp81w53ypv5vhqhhezr8qhdklsmh8n";
    private repo;
    private repository;

    constructor(private _http: Http) {}

    private createRepo(data: string): JsGit {
        let repo = new JsGit({
            repoName: data,
            userName: this.userName,
            userToken: this.userToken
        });
        return repo;
    }


    public getContent(hash) {
        let content;
        let self = this;
        return Observable.create((observer) => {
            run(function* () {
                content = yield self.repo['repo']['loadAs']('text', hash);
                observer.next(content);
            });
        })
    }

    public init(repoUrl): Observable<any> {
        var self = this;
        let headers = new Headers({ 'Authorization': 'OAuth2 ' + '4e3lve4d7rqmpft49cavdp81w53ypv5vhqhhezr8qhdklsmh8n' });
        let options = new RequestOptions({ headers: headers });

        if (/repositories$/.test(repoUrl)) {
            return this._http.get(repoUrl, options).map(response => {
                let userRepositories = response.json();
                let parsedRepositories = [];
                userRepositories.items.forEach(element => {
                    if (element.hasOwnProperty('clone_urls')) {
                        let temp = {
                            "dirname": element.name,
                            "isDir": true,
                            "isFile": false,
                            "isReadable": true,
                            "isWritable": true,
                            "language": "",
                            "name": element.name,
                            "path": element.clone_urls[1],
                            "type": ""
                        }
                        parsedRepositories.push(temp);
                    }
                });
                return parsedRepositories;
            })
        } else {
            return Observable.create((data) => {
                let children = [];
                run(function* () {

                    if (!self.repo) {
                        self.repo = self.createRepo(repoUrl);
                        yield* self.repo.clone();
                    }

                    var results = self.repository = yield* self.repo.getFiles();
                    for (let i = 0; i < results.length; i++) {
                        let child;
                        if (results[i].mode === 16384) {
                            child = {
                                "dirname": results[i].path,
                                "isDir": true,
                                "isFile": false,
                                "isReadable": true,
                                "isWritable": true,
                                "language": "CommandLineTool",
                                "name": "folder",
                                "path": results[i].path,
                                "type": ""
                            }
                        }
                        else {
                            child = {
                                "dirname": "",
                                "isDir": false,
                                "isFile": true,
                                "isReadable": true,
                                "isWritable": true,
                                "language": "CommandLineTool",
                                "name": "folder",
                                "path": results[i].hash,
                                "type": "Workflow"
                            }
                        }
                        children.push(child);
                    }
                    data.next(children);
                })
            });
        }
    }

}