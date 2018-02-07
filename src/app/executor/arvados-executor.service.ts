import {Injectable} from "@angular/core";
import {Observable} from "rxjs/Observable";
import {ReplaySubject} from "rxjs/ReplaySubject";
import {AppExecutionContext, ExecutorParamsConfig, ExecutorConfig} from "../../../electron/src/storage/types/executor-config";
import {AppHelper} from "../core/helpers/AppHelper";
import {LocalRepositoryService} from "../repository/local-repository.service";
import {PlatformRepositoryService} from "../repository/platform-repository.service";
import {ArvadosRepositoryService} from "../repository/arvados-repository.service";
import {WorkflowModel, CommandLineToolModel} from "cwlts/models";
import { Http, Headers, Response, RequestOptions } from '@angular/http';
import { AuthService } from "../auth/auth.service";
import { JSGitService } from "../services/js-git/js-git.service";
import { ConfigurationService } from "../app.config";

@Injectable()
export class ArvExecutorService {

    private executorState = new ReplaySubject<"VALID" | "INVALID" | "UNSET">(1);
    private jsgit;

    constructor(private _http: Http,
                private _authService: AuthService,
                private _jsgit: JSGitService,
                private _config: ConfigurationService,
                private _arvRepo: ArvadosRepositoryService)
    {
        this.jsgit = _jsgit;
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


    makeOutputDirectoryName(rootDir, appID, user = "local", time = new Date()) {
        return "";
    }

    private serialize(model: WorkflowModel | CommandLineToolModel): string {
        let serialized;

        if (model instanceof WorkflowModel) {
            serialized = model.serializeEmbedded();
        } else {
            serialized = model.serialize();
        }

        // Bunny traverses mistakenly into this to look for actual inputs, it might have been resolved by now
        delete serialized["sbg:job"];

        return serialized;
    }

    execute(appID: string,
            model: WorkflowModel | CommandLineToolModel,
            jobValue: Object = {},
            executorPath?: string,
            executionParams: Partial<ExecutorParamsConfig> = {}): Observable<any> {

        const sp = JSGitService.splitFileKey(appID);
        const self = this;

        return self.jsgit.getRepoHead(sp.repoUrl, 'master').flatMap((commithash) => {
            const input_defaults = {};
            for (var i in model["inputs"]) {
                var input = model["inputs"][i];
                if (input["default"] !== undefined) {
                    let shortid;
                    if (input["id"][0] == "#") {
                        shortid = input["id"].substr(1);
                    } else {
                        let shortsplit = input["id"].split("/");
                        shortid = shortsplit[shortsplit.length-1];
                    }
                    input_defaults[shortid] = input["default"]
                }
            }
            var body = {
                container_request: {
                    name: sp.path,
                    command: ["arvados-cwl-runner", "--local", "--api=containers",
                              "/var/lib/cwl/run"+sp.path,
                              "/var/lib/cwl/cwl.input.json"],
                    container_image: "arvados/jobs",
                    cwd: "/var/spool/cwl",
                    output_path: "/var/spool/cwl",
                    priority: 500,
                    mounts: {
                        "/var/lib/cwl/cwl.input.json": {
                            "kind": "json",
                            "content": input_defaults
                        },
                        "/var/lib/cwl/workflow.json": {
                            "kind": "json",
                            "content": this.serialize(model)
                        },
                        "stdout": {
                            "kind": "file",
                            "path": "/var/spool/cwl/cwl.output.json"
                        },
                        "/var/spool/cwl": {
                            "kind": "collection",
                            "writable": true
                        },
                        "/var/lib/cwl/run": {
                            kind: "git_tree",
                            uuid: self._arvRepo.getRepoUuid(sp.repoUrl),
                            commit: commithash,
                            path: "/"
                        }
                    },
                    runtime_constraints: {
                        vcpus: 1,
                        ram: 256000000,
                        API: true
                    }
                }
            };
            return self._authService.getActive().take(1).flatMap((tok) => {
                const headers = new Headers({
                    "Authorization": "OAuth2 " + tok.token
                });
                return self._config.configuration.take(1).flatMap((conf) => {
                    const apiEndPoint = conf['apiEndPoint'];
                    return self._http.post(apiEndPoint+'/arvados/v1/container_requests',
                                           body, new RequestOptions({ headers }));
                });
            });
        }).flatMap(response => {
            return self._config.discoveryDoc.take(1).map((conf) => {
                var url = conf["workbenchUrl"] + "/container_requests/" + response.json().uuid;
                console.log("opening tab "+url);
                window.open(url, "_blank");
                return url;
            });
        });
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
