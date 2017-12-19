import { ReflectiveInjector } from '@angular/core';
import { Injectable, Injector } from '@angular/core';
import { ToolHintsComponent } from './../tool-editor/sections/hints/tool-hints.component';
import { Observable } from 'rxjs/Observable';
import { EventEmitter } from '@angular/core';
import { ConfigurationService } from "../app.config";
import * as YAML from "js-yaml";

@Injectable()
export class IpcWebService {

    private _event: EventEmitter<any>;
    private _cntr: IpcWebControler;

    constructor(private parentInjector:Injector) {
        this._event = new EventEmitter();
        this._cntr = new IpcWebControler();
    }

    public on(event: string, f: Function) {
        this._event.subscribe(data => {
            setTimeout(() => f(data.sender, data.response), 1000);
        });
    }

    public send(event: string, data: { id: string, watch: boolean, message: any, data: any }) {
        if (this._cntr[data.message]) {
            this._cntr[data.message](data.data)
                .subscribe(response_data => {

                    this._event.emit({
                        sender: {
                            sender: this._event
                        },
                        response: {
                            data: response_data,
                            id: data.id
                        }
                    });
                });
        }
    }
}

export class IpcWebControler {

    constructor() {
    }

    public checkForPlatformUpdates(): Observable<any> {
        return Observable.empty(null);
    }

    public readDirectory(data: any): Observable<any> {
        return Observable.empty(null);
    }

    public patchLocalRepository(data: any): Observable<any> {
        return Observable.empty().startWith(null);
    }

    public patchUserRepository(data: any): Observable<any> {
        return Observable.empty().startWith(null);
    }

    // data == file path
    public getLocalFileContent(data: any): Observable<any> {
        console.log("getLocalFileContent");
        console.log(data);
        return Observable.empty(null);
    }
    public saveFileContent(data): Observable<any> {
        console.log("saveFileContent");
        console.log(data);
        return Observable.empty(null);
    }

    /**
     *
     * @param data Object({content: string, path: string})
     */
    public resolveContent(data: any): Observable<any> {
        return Observable.empty(null);
    }

    /**
     *
     * @param data Object({local: bool, swapContent: string, swapID: string})
     */
    public patchSwap(data: any): Observable<any> {
        return Observable.empty().startWith(null);
    }

    public watchUserRepository(data: any): Observable<any> {
        return Observable.empty().startWith(null);
    }

    public watchLocalRepository(data: any): Observable<any> {
        switch (data.key) {
            case "openTabs":
            case "recentApps":
                return Observable.empty().startWith([]);

            case "localFolders":
                return Observable.empty().startWith([]);

            case "expandedNodes":
                return Observable.empty().startWith([]);

            case "executorConfig":
                return Observable.empty().startWith({ paht: "" });

            case "selectedAppsPanel":
                return Observable.empty().startWith("myApps");

            case "publicAppsGrouping":
                return Observable.empty().startWith('toolkit');

            case "activeCredentials":
                return Observable.empty().startWith(null);

            case "credentials":
                return Observable.empty().startWith([]);

            case "ignoredUpdateVersion":
                return Observable.empty().startWith(null);
        }

        return Observable.empty().delay(2000).startWith([]);
    }
}
