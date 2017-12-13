import {Injectable} from "@angular/core";
import {Observable} from "rxjs/Observable";
import {ReplaySubject} from "rxjs/ReplaySubject";
import {AppExecutionContext, ExecutorConfig} from "../../../electron/src/storage/types/executor-config";
import {AppHelper} from "../core/helpers/AppHelper";
import {LocalRepositoryService} from "../repository/local-repository.service";
import {PlatformRepositoryService} from "../repository/platform-repository.service";
import { Http, Headers, Response, RequestOptions } from '@angular/http';
import { LoginService } from "../services/login/login.service";
import { JSGitService } from "../services/js-git/js-git.service";
import { ConfigurationService } from "../app.config";

@Injectable()
export class ArvExecutorService {

    private config        = new ReplaySubject<ExecutorConfig>(1);
    private executorState = new ReplaySubject<"VALID" | "INVALID" | "UNSET">(1);
    private userToken;
    private headers;
    private httpOptions;
    private jsgit;

    constructor(private _http: Http,
                private _loginService: LoginService,
                private _jsgit: JSGitService)
    {
        this.userToken = this._loginService.getToken("api_token");
        this.headers = new Headers({
            "Authorization": "OAuth2 " + this.userToken
        });
        this.httpOptions = new RequestOptions({ headers: this.headers });
        this.jsgit = _jsgit;
    }

    getConfig<T extends keyof ExecutorConfig>(key: T): Observable<ExecutorConfig[T]> {
         return this.config.map(c => c[key]);
    }

    /**
     * Probes the executor path for Bunny version.
     * Returns a message in the format “Version: #” if successful, or a description why it failed
     */
    getVersion(): Observable<string> {
        return null;
    }

    getExecutorState() {
        return Observable.of("VALID");
    }

    run(appID: string, content: string, jobPath: string, options = {}): Observable<string> {
        var fi = this.jsgit.getFileInfo(appID);
        return this.jsgit.getRepoCommit(fi.repoUrl, (err, commit) => {
            console.log("repo info " + fi.repoUrl + " "+ this.jsgit.getRepoUuid(fi.repoUrl) + " " + commit);
            var body = {
                container_request: {
                    name: "testing",
                    command: ["arvados-cwl-runner"],
                    container_image: "arvados/jobs:latest",
                    output_path: "/var/spool/cwl"
                }
            };
            let apiEndPoint = ConfigurationService.configuration['apiEndPoint'];
            return this._http.post(apiEndPoint+'/arvados/v1/container_requests',
                                   body, this.httpOptions).map(response => {
                                       return response.json().uuid;
                                   });
        });
    }

    getEnvironment(appID: string): Observable<ExecutorConfig> {
        return null;
    }

    /**
     * Gets the configuration parameters for the execution context of a specific app
     */
    getAppConfig(appID: string): Observable<AppExecutionContext | null> {
        // const metaFetch = AppHelper.isLocal(appID)
        //     ? this.localRepository.getAppMeta(appID, "executionConfig")
        //     : this.platformRepository.getAppMeta(appID, "executionConfig");

        // any is a hack-cast, but “executionConfig” key is actually of type AppExecutionContext
        //return (metaFetch as any).map(meta => meta || {});
        return Observable.of({ jobPath: "n/a",
                                                    executionParams: {
                                                        baseDir: "",
                                                        configurationDir: "",
                                                        cacheDir: "",
                                                        noContainer: false,
                                                        outDir: "",
                                                        quiet: false,
                                                        verbose: false
                                                    }});
    }

    setAppConfig(appID: string, data: AppExecutionContext) {
        // const isLocal = AppHelper.isLocal(appID);

        // if (isLocal) {
        //     return this.localRepository.patchAppMeta(appID, "executionConfig", data);
        // }

        // return this.platformRepository.patchAppMeta(appID, "executionConfig", data);
        return null;
    }
}
