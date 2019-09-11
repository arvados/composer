// Copyright (C) The Composer Authors. All rights reserved.
//
// SPDX-License-Identifier: Apache-2.0

import { Injectable, Injector, ReflectiveInjector } from "@angular/core";

import * as Yaml from "js-yaml";
import { LoadOptions } from "js-yaml";

import { Observable } from "rxjs/Observable";
import { ReplaySubject } from "rxjs/ReplaySubject";
import { App } from "../../../electron/src/sbg-api-client/interfaces/app";
import { Project } from "../../../electron/src/sbg-api-client/interfaces/project";
import { RawApp } from "../../../electron/src/sbg-api-client/interfaces/raw-app";
import { AppMeta } from "../../../electron/src/storage/types/app-meta";
import { RecentAppTab } from "../../../electron/src/storage/types/recent-app-tab";
import { TabData } from "../../../electron/src/storage/types/tab-data-interface";
import { IpcService } from "../services/ipc.service";
import { AuthCredentials } from "../auth/model/auth-credentials";
import { ExecutorConfig } from "../../../electron/src/storage/types/executor-config";
import { CookieService } from 'ngx-cookie';
import { Http, Headers, Response, BrowserXhr, RequestOptions, BaseRequestOptions, ResponseOptions, BaseResponseOptions, ConnectionBackend, XHRBackend, XSRFStrategy, CookieXSRFStrategy } from '@angular/http';
import { ConfigurationService } from '../app.config'

@Injectable()
export class ArvadosRepositoryService {

    private apps: ReplaySubject<App[]> = new ReplaySubject(1);
    private publicApps: ReplaySubject<App[]> = new ReplaySubject(1);
    private projects: ReplaySubject<Project[]> = new ReplaySubject(1);
    private openRepos: ReplaySubject<string[]> = new ReplaySubject(1);
    private expandedNodes: ReplaySubject<string[]> = new ReplaySubject(1);
    private openTabs: ReplaySubject<TabData<any>[]> = new ReplaySubject(1);
    private recentApps: ReplaySubject<RecentAppTab[]> = new ReplaySubject(1);
    private appMeta: ReplaySubject<Object> = new ReplaySubject(1);

    private credentials: ReplaySubject<AuthCredentials[]> = new ReplaySubject(1);
    private activeCredentials: ReplaySubject<AuthCredentials> = new ReplaySubject(1);

    private selectedAppsPanel: ReplaySubject<"myApps" | "publicApps"> = new ReplaySubject(1);
    private publicAppsGrouping: ReplaySubject<"toolkit" | "category"> = new ReplaySubject(1);

    private gitsubscribed = false;
    private gitRepos: ReplaySubject<Object[]> = new ReplaySubject(1);

    private repo_uuid = {};

    constructor(private ipc: IpcService,
        private _http: Http,
        private _cookieService: CookieService,
        private _config: ConfigurationService,
        private parentInjector: Injector) {

        let injector = ReflectiveInjector.resolveAndCreate([
            Http,
            BrowserXhr,
            { provide: RequestOptions, useClass: BaseRequestOptions },
            { provide: ResponseOptions, useClass: BaseResponseOptions },
            { provide: ConnectionBackend, useClass: XHRBackend },
            { provide: XSRFStrategy, useFactory: () => new CookieXSRFStrategy() },
        ], parentInjector);

        this.listen("apps").subscribe(this.apps);
        this.listen("projects").subscribe(this.projects);
        //this.listen("openTabs").subscribe(this.openTabs);
        this.listen("publicApps").subscribe(this.publicApps);
        this.listen("recentApps").subscribe(this.recentApps);
        //this.listen("openProjects").subscribe(this.openProjects);
        this.listen("expandedNodes").subscribe(this.expandedNodes);
        //this.listen("appMeta").subscribe(this.appMeta);

        this.openTabs.next([]);
        this.appMeta.next({});

        console.log("checking token " + this.getToken("api_token"));
        if (this.storeToken("api_token") || this.getToken("api_token")) {
            console.log("using token " + this.getToken("api_token"));
            _config.configDoc.subscribe((conf) => {
                const token = this.getToken("api_token");
                const apiEndPoint = conf['Services']['Controller']['ExternalURL'];
                const headers = new Headers({ "Authorization": "OAuth2 " + token });
                const httpOptions = new RequestOptions({ "headers": headers });
                this._http.get(apiEndPoint + "/arvados/v1/users/current", httpOptions).subscribe(
                    response => {
                        const u = response.json();
                        this.setActiveCredentials(new AuthCredentials(apiEndPoint + "/0123456789abcd", token, {
                            username: u["username"],
                            first_name: u["first_name"],
                            last_name: u["last_name"],
                            email: u["email"]
                        }));
                    },
                    error => {
                        this.setActiveCredentials(null);
                    });
            });
        } else {
            this.setActiveCredentials(null);
        }

        this.getActiveCredentials().subscribe(auth => {
            if (auth !== null) {
                this.refreshGitRepos(auth);
            }
        });
    }

    refreshGitRepos(auth: AuthCredentials) {
        const apiEndPoint = auth.url.substr(0, auth.url.length - 15);
        const headers = new Headers({ "Authorization": "OAuth2 " + auth.token });
        const httpOptions = new RequestOptions({ "headers": headers });
        this._http.get(apiEndPoint + "/arvados/v1/repositories", httpOptions).subscribe(response => {
            this.gitRepos.next(response.json()["items"].map(i => {
                this.repo_uuid[i["clone_urls"][1]] = i["uuid"];
                return {
                    name: i["name"],
                    url: i["clone_urls"][1]
                }
            }));
        });
    }

    getCredentials(): Observable<AuthCredentials[]> {
        return this.credentials;
    }

    getActiveCredentials(): Observable<AuthCredentials> {
        return this.activeCredentials;
    }

    setActiveCredentials(activeCredentials: AuthCredentials = null): Promise<any> {
        if (!activeCredentials) {
            this._cookieService.remove('api_token');
        }
        this.activeCredentials.next(activeCredentials);
        this.setCredentials([activeCredentials]);
        return Promise.resolve(activeCredentials);
    }

    setCredentials(credentials: AuthCredentials[]): Promise<any> {
        this.credentials.next(credentials);
        return Promise.resolve(credentials);
    }

    private storeToken(token: string): boolean {
        if (document.location.search[0] != '?') {
            return false;
        }

        var params = {};
        document.location.search.slice(1).split('&').map(function(kv) {
            var e = kv.indexOf('=');
            if (e < 0) {
                return false;
            }

            params[decodeURIComponent(kv.slice(0, e))] = decodeURIComponent(kv.slice(e + 1));
        })

        if (!params.hasOwnProperty(token)) {
            return false;
        }

        this._cookieService.put(token, params[token]);
        history.replaceState({}, '', document.location.origin + document.location.pathname);
    }

    private getToken(token: string): string {
        return this._cookieService.get(token)
    }

    getGitRepos(): Observable<Object[]> {
        return this.gitRepos;
    }

    getRepoUuid(repoUrl: string): string {
        return this.repo_uuid[repoUrl];
    }

    getOpenTabs(): Observable<TabData<any>[] | null> {
        return this.openTabs;
    }

    getAppsForProject(projectID): Observable<App[]> {
        return this.apps.map(apps => {
            // Apps may not be present, fallback to an empty array
            return (apps || []).filter(app => app.project === projectID);
        });
    }

    getProjects(): Observable<Project[]> {
        return this.projects;
    }

    getPublicApps(): Observable<App[] | null> {
        return this.publicApps;
    }

    getPrivateApps(): Observable<App[]> {
        return this.apps;
    }

    getRecentApps(): Observable<RecentAppTab[]> {
        return this.recentApps;
    }

    fetch(): Observable<any> {
        this.getActiveCredentials().take(1).subscribe(auth => {
            if (auth !== null) {
                this.refreshGitRepos(auth);
            }
        });
        return this.gitRepos;
    }

    getOpenProjects(): Observable<Project[]> {
        return Observable.of([]);
    }

    getClosedProjects(): Observable<Project[]> {
        return Observable.of([]);
    }

    private listen(key: string) {
        return this.ipc.watch("watchLocalRepository", { key });
    }

    private patch(data: { [key: string]: any }) {
        return this.ipc.request("patchLocalRepository", data);
    }

    setNodeExpansion(nodesToExpand: string | string[], isExpanded: boolean): void {
        this.expandedNodes.take(1).subscribe(expandedNodes => {

            const patch = new Set(expandedNodes);
            let modified = false;

            [].concat(nodesToExpand).forEach((item) => {
                const oldSize = patch.size;

                isExpanded ? patch.add(item) : patch.delete(item);

                if (oldSize !== patch.size) {
                    modified = true;
                }
            });

            if (modified) {
                //this.patch({
                //    expandedNodes: Array.from(patch)
                //});
                this.expandedNodes.next(Array.from(patch));
            }

        });
    }

    addOpenProjects(projectIDs: string[], expandNodes: boolean = false) {
    }

    removeOpenProjects(...projectIDs: string[]) {
    }

    getExpandedNodes() {
        return this.expandedNodes;
    }

    createApp(appID: string, content: string): Promise<string> {
        return this.ipc.request("createPlatformApp", {
            id: appID,
            content: content
        }).toPromise();
    }

    saveAppRevision(appID: string, content: string, revisionNote?: string): Promise<string> {

        const appContent = Yaml.safeLoad(content, { json: true } as LoadOptions);
        if (typeof revisionNote === "string") {
            appContent["sbg:revisionNotes"] = revisionNote;
        }
        content = JSON.stringify(appContent, null, 4);

        return this.ipc.request("saveAppRevision", {
            id: appID,
            content: content
        }).toPromise();
    }

    pushRecentApp(recentTabData: RecentAppTab, limit = 20): Promise<any> {
        return this.getRecentApps().map(apps => apps || []).take(1).toPromise().then((entries) => {
            const update = [recentTabData].concat(entries).filter((val, idx, arr) => {
                const duplicateIndex = arr.findIndex(el => el.id === val.id);
                return duplicateIndex === idx;
            }).slice(0, limit);

            return this.patch({ recentApps: update }).toPromise();
        });
    }

    setOpenTabs(openTabs: TabData<any>[]): Promise<any> {
        return this.patch({ openTabs }).toPromise();
    }

    getUpdates(appIDs: string[]): Promise<{
        id: string;
        name: string;
        revision: number;
    }[]> {
        return this.ipc.request("getAppUpdates", { appIDs }).toPromise();
    }

    getApp(id: string, forceFetch = false): Promise<RawApp> {
        return this.ipc.request("getPlatformApp", { id, forceFetch }).toPromise().then((appText: string) => {
            return JSON.parse(appText);
        });
    }

    getAppContent(id: string, forceFetch = false): Promise<string> {
        return this.ipc.request("getPlatformApp", { id, forceFetch }).toPromise();
    }

    getProject(projectSlug: string): Promise<Project> {
        return this.ipc.request("getProject", projectSlug).toPromise();
    }

    searchAppsFromOpenProjects(substring?: string): Observable<App[]> {

        const term = substring.toLowerCase();

        return this.getOpenProjects()
            .map(projects => projects || [])
            .flatMap(openProjects => {

                const openProjectIDs = openProjects.map(project => project.id);

                return this.getPrivateApps().map(apps => {

                    return (apps || []).filter(app => {

                        if (openProjectIDs.indexOf(app.project) === -1) {
                            return false;
                        }

                        if (!substring) {
                            return true;
                        }

                        const appID = app.id.toLowerCase();
                        const appName = app.name.toLowerCase();

                        return appID.indexOf(term) !== -1 || appName.indexOf(term) !== -1;
                    });
                });
            });
    }

    searchPublicApps(substring?: string): Observable<App[]> {
        const term = substring.toLowerCase();

        return this.getPublicApps().map(apps => {
            return (apps || []).filter(app => {

                if (!substring) {
                    return true;
                }

                const appID = app.id.toLowerCase();
                const appName = app.name.toLowerCase();

                return appID.indexOf(term) !== -1 || appName.indexOf(term) !== -1;
            });
        });
    }

    getAppMeta<T>(appID: string, key?: string): Observable<AppMeta> {
        return this.appMeta.map(meta => {

            if (meta === null) {
                return meta;
            }

            const data = meta[appID];

            if (key && data) {
                return data[key];
            }

            return data;

        });
    }

    patchAppMeta(appID: string, key: keyof AppMeta, value: any): Promise<any> {
        return this.appMeta.take(1).map((meta) => {

            if (meta === null) {
                return meta;
            }

            if (meta[appID] === undefined) {
                meta[appID] = {};
            }

            meta[appID][key] = value;

            this.appMeta.next(meta);

            return meta;
        }).toPromise();

        /*return this.ipc.request("patchAppMeta", {
          profile: "user",
          appID,
          key,
          value
          }).toPromise();*/
    }

    //Local stubs
    getLocalFolders(): Observable<string[]> {
        return Observable.of([]);
    }

    getExpandedFolders(): Observable<string[]> {
        return Observable.of([]);
    }

    getSelectedAppsPanel(): Observable<"myApps" | "publicApps"> {
        return this.selectedAppsPanel;
    }

    setSelectedAppsPanel(selectedAppsPanel: "myApps" | "publicApps"): Promise<any> {
        return this.patch({ selectedAppsPanel }).toPromise();
    }

    getPublicAppsGrouping(): Observable<"toolkit" | "category"> {
        return this.publicAppsGrouping;
    }

    setPublicAppsGrouping(publicAppsGrouping: "toolkit" | "category" | "none"): Promise<any> {
        return this.patch({ publicAppsGrouping }).toPromise();
    }

    getExecutorConfig(): Observable<ExecutorConfig> {
        return Observable.of({
            path: "",
            choice: "",
            outDir: ""
        });
    }
}
