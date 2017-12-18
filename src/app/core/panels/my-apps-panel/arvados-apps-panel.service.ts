import {ChangeDetectorRef, Injectable} from "@angular/core";
import {Observable} from "rxjs/Observable";
import {ReplaySubject} from "rxjs/ReplaySubject";
import {App} from "../../../../../electron/src/sbg-api-client/interfaces/app";
import {Project} from "../../../../../electron/src/sbg-api-client/interfaces/project";
import {AuthService} from "../../../auth/auth.service";
import {AuthCredentials} from "../../../auth/model/auth-credentials";
import {FileRepositoryService} from "../../../file-repository/file-repository.service";
import {NotificationBarService} from "../../../layout/notification-bar/notification-bar.service";
import {StatusBarService} from "../../../layout/status-bar/status-bar.service";
import {PlatformRepositoryService} from "../../../repository/platform-repository.service";
import {ArvadosRepositoryService} from "../../../repository/arvados-repository.service";
import {IpcService} from "../../../services/ipc.service";
import {TreeNode} from "../../../ui/tree-view/tree-node";
import {FilesystemEntry} from "../../data-gateway/data-types/local.types";
import {GlobalService} from "../../global/global.service";
import {WorkboxService} from "../../workbox/workbox.service";
import {AppsPanelService} from "../common/apps-panel.service";
import {AppHelper} from "../../helpers/AppHelper";
import {getDragImageClass, getDragTransferDataType} from "../../../ui/tree-view/tree-view-utils";
import {JSGitService} from "../../../services/js-git/js-git.service";

const yaml   = require("js-yaml");

@Injectable()
export class ArvadosAppsPanelService extends AppsPanelService {

    expandedNodes: Observable<string[]>;
    rootFolders: Observable<TreeNode<any>[]>;

    constructor(private auth: AuthService,
                private ipc: IpcService,
                private global: GlobalService,
                private arvRepository: ArvadosRepositoryService,
                protected fileRepository: FileRepositoryService,
                protected notificationBar: NotificationBarService,
                protected workbox: WorkboxService,
                protected statusBar: StatusBarService,
                cdr: ChangeDetectorRef,
                protected platformRepository: PlatformRepositoryService,
                private _jsgit: JSGitService) {

        super(fileRepository, platformRepository, notificationBar, workbox, statusBar, cdr);

        this.expandedNodes      = this.arvRepository.getExpandedNodes();
        this.rootFolders        = this.getRootFolders();
    }

    private static makeTreeNode(data: Partial<TreeNode<any>>): TreeNode<any> {
        return Object.assign({
            type: "source",
            icon: "fa-folder",
            isExpanded: Observable.of(false),
            isExpandable: true,
            iconExpanded: "fa-folder-open",
        }, data);
    }

    /**
     * Gives an observable of root tree nodes.
     */
    getRootFolders(): Observable<TreeNode<any>[]> {
        const self = this;
        return this.arvRepository.getGitRepos()
            .map(items => {
                return items.map(item => {
                    const children_sub: ReplaySubject<TreeNode<any>[]> = new ReplaySubject(1);

                    item["start_load"] = function() {
                        children_sub.next([{
                            id: "loading",
                            data: null,
                            type: "loading",
                            label: "loading...",
                            isExpandable: false,
                            isExpanded: Observable.of(false),
                            icon: "",
                            iconExpanded: "",
                            children: Observable.empty()
                        }]);

                        const repoUrl = item["url"];
                        self._jsgit.getRepoContents(repoUrl).subscribe((dirents) => {

                            function load_dir(dirname: string): Observable<TreeNode<any>[]> {
                                const pending = [];
                                for (const filename in dirents[dirname].body) {
                                    const ent = dirents[dirname].body[filename];
                                    const key = repoUrl+"#"+dirname+filename;
                                    if (ent.mode === 16384) {
                                        // directory
                                        pending.push(Observable.of({
                                            id: key,
                                            data: {},
                                            type: "",
                                            label: filename,
                                            isExpandable: true,
                                            isExpanded: self.expandedNodes.map(list => list.indexOf(key) !== -1),
                                            icon: "fa-folder",
                                            iconExpanded: "fa-folder-open",
                                            children: load_dir(dirname+filename+"/")
                                        }));
                                    } else {
                                        // file
                                        pending.push(self._jsgit.getFileContent(key).map((content) => {
                                            const parsed = yaml.safeLoad(content);
                                            const cwltype = parsed ? parsed["class"] : "";

                                            let icon;
                                            if (cwltype === "Workflow") {
                                                icon = "fa-share-alt";
                                            } else if (cwltype === "CommandLineTool") {
                                                icon = "fa-terminal";
                                            } else {
                                                cwltype = "Code";
                                                icon = "fa-file";
                                            }

                                            return {
                                                id: key,
                                                data: {
                                                    id: key,
                                                    name: filename,
                                                    raw: parsed,
                                                    isWritable: true,
                                                    type: cwltype
                                                },
                                                type: "file",
                                                label: filename,
                                                isExpandable: false,
                                                isExpanded: Observable.of(false),
                                                icon,
                                                iconExpanded: "",
                                                children: Observable.empty()
                                            };
                                        }).take(1));
                                    }
                                }
                                return Observable.forkJoin(...pending);
                            }

                            load_dir("/").subscribe((newchildren) => {
                                children_sub.next(newchildren);
                            });
                        });
                    };

                    var app = ArvadosAppsPanelService.makeTreeNode({
                        id: item["url"],
                        data: item,
                        type: "gitrepo",
                        label: item["name"],
                        isExpandable: true,
                        isExpanded: self.expandedNodes.map(list => list.indexOf(item["url"]) !== -1),
                        children: children_sub
                    });

                    return app;
                });
            });
    }

    reloadPlatformData() {
        //this.global.reloadPlatformData();
    }

    updateLocalNodeExpansionState(path: string, state: boolean): void {
        this.arvRepository.setNodeExpansion(path, state);
    }

    updatePlatformNodeExpansionState(path: string, state: boolean): void {
        this.arvRepository.setNodeExpansion(path, state);
    }

    private createDirectoryListingTreeNodes(listing: FilesystemEntry[]) {
        return listing.map(fsEntry => {


            const id    = fsEntry.path;

            const label = (typeof fsEntry.name === "string") ? fsEntry.name :  AppHelper.getBasename(fsEntry.path);

            let icon           = "fa-folder";
            const iconExpanded = "fa-folder-open";

            if (fsEntry.type === "Workflow") {
                icon = "fa-share-alt";
            } else if (fsEntry.type === "CommandLineTool") {
                icon = "fa-terminal";
            } else if (fsEntry.isFile) {
                icon = "fa-file";
            }

            let children = undefined;

            if (fsEntry.isDir) {
                let pathData = (fsEntry.repoUrl) ? {path: fsEntry.path, repoUrl: fsEntry.repoUrl} : fsEntry.path;
                children = Observable.empty()
                    .concat(this.ipc.request("readDirectory", pathData))
                    .map(list => this.createDirectoryListingTreeNodes(list));
            }

            return ArvadosAppsPanelService.makeTreeNode({
                id,
                icon,
                label,
                children,
                iconExpanded,
                data: fsEntry,
                dragLabel: label,
                dragDropZones: ["graph-editor", "job-editor"],
                isExpandable: fsEntry.isDir,
                dragTransferData: {name: fsEntry.path, type: getDragTransferDataType(fsEntry)},
                type: fsEntry.isDir ? "folder" : "file",
                isExpanded: this.expandedNodes.map(list => list.indexOf(fsEntry.path) !== -1),
                dragEnabled: true,
                dragImageClass: getDragImageClass(fsEntry)
            });
        });
    }

}
