
import { Injectable } from "@angular/core";
import { Observable } from "rxjs/Observable";
import { ReplaySubject } from "rxjs/ReplaySubject";
import * as HighLevel from "js-git/mixins/high-level";

import { Http, Headers, Response, RequestOptions } from '@angular/http';
import {AuthService} from "../../auth/auth.service"

@Injectable()
export class JSGitService {
    private userCred;
    private headers;
    private httpOptions;
    private repo = {};

    constructor(private auth: AuthService, private _http: Http) {
        this.auth.getActive().subscribe((active) => {
            if (active) {
		this.userCred = active;
            } else {
                this.userCred = null;
            }
        });
    }

    private createRepo(repoUrl: string): Observable<any> {
        const repoObj = {};
        HighLevel(repoObj, this.userCred.user.username, this.userCred.token, repoUrl);

        repoObj["contents"] = new ReplaySubject(1);
        this.repo[repoUrl] = repoObj;

	this.repo[repoUrl]["clone"]('refs/heads/master', 1, (data) => {
	    if (data instanceof Error) {
		repoObj["contents"].next(data);
		return;
	    }
            if (!data) {
                return;
            }
            repoObj["resolveRepo"]('refs/heads/master', (res) => {
                console.log(res);
                repoObj["contents"].next(res);
            });
        });
        return repoObj["contents"];
    }

    static splitFileKey(fileKey: string): {repoUrl: string, path: string} {
        const sp = fileKey.split("#", 2);
        return {repoUrl: sp[0], path: sp[1]};
    }

    public getFileContent(fileKey: string) : Observable<string> {
        const sp = JSGitService.splitFileKey(fileKey);
        const repo = this.repo[sp.repoUrl];
        return repo["contents"].flatMap((contents) => {
            const filehash = contents[sp.path].hash;
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

    getLoadedRepos(): Observable<Array<string>> {
        const rp = [];
        for (let a in this.repo) {
            rp.push(a);
        }
        return Observable.of(rp);
    }

    getFileInfo(fileKey: string): Observable<any> {
        const sp = JSGitService.splitFileKey(fileKey);
        return this.getRepoContents(sp.repoUrl).map(r => r[sp.path]);
    }

    getRepoHead(repoUrl: string, branch: string): Observable<string> {
        const repoObj = this.repo[repoUrl];
        return Observable.create(function (observer) {
            repoObj.readRef('refs/heads/'+branch, (err, commitHash) => {
                observer.next(commitHash);
                observer.complete();
            });
        });
    }

    public saveToGitRepo(fileKey: string, content: string): Observable<Object> {
        const self = this;
        const sp = JSGitService.splitFileKey(fileKey);
        const repoObj = this.repo[sp.repoUrl];

        return Observable.create((observer) => {
            let path = sp.path;
            if (path.startsWith("/")) {
                path = path.substr(1);
            }
            const fileToCommit = {
                path: path,
                mode: 33188,
                content
            };
            const dataForCommit = [fileToCommit];
	    const metadata = {
		message: "commit message goes here",
		author: {
		    name: this.userCred.user.first_name + " " + this.userCred.user.last_name,
		    email: this.userCred.user.email
		}
	    };
            repoObj["commit"]('refs/heads/master', dataForCommit, metadata, (feedback) => {
                repoObj["resolveRepo"]('refs/heads/master', (res) => {
                    repoObj["contents"].next(res);
                    repoObj["push"]('refs/heads/master', (feedback) => {
			console.log(feedback);
			observer.next(content);
			observer.complete();
                    });
                });
            });
        }).share();
    }
}
