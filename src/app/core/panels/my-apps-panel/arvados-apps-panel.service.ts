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
        return this.arvRepository.getGitRepos()
            .map(items => {
                return items.map(item => {
                    var children_sub = new ReplaySubject(1);
                    item["start_load"] = () => {
                        children_sub.next([{
                            id: "loading",
                            data: null,
                            type: "loading",
                            label: "loading...",
                            isExpandable: false,
                            isExpanded: Observable.of(false),
                            icon: ""
                            iconExpanded: "",
                            children: Observable.empty()
                        }]);

                        const repoUrl = item["clone_urls"][1];
                        this._jsgit.getRepo(repoUrl).subscribe((r) => {
                            var ch = [];
                            for (const f in r) {
                                const ent = r[f];
                                ch.push({
                                    id: repoUrl+"#"+ent.path,
                                    data: {},
                                    type: "app",
                                    label: ent.path,
                                    isExpandable: false,
                                    isExpanded: Observable.of(false),
                                    icon: ""
                                    iconExpanded: "",
                                    children: Observable.empty()
                                });
                            }
                            children_sub.next(ch);
                        });
                    };
                    var app = ArvadosAppsPanelService.makeTreeNode({
                        id: item["uuid"],
                        data: item,
                        type: "gitrepo",
                        label: item["name"],
                        isExpanded: this.expandedNodes.map(list => list.indexOf(item["uuid"]) !== -1),
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
