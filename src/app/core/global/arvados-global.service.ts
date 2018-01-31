import {Injectable} from "@angular/core";
import {NotificationBarService} from "../../layout/notification-bar/notification-bar.service";
import {StatusBarService} from "../../layout/status-bar/status-bar.service";
import {ArvadosRepositoryService} from "../../repository/arvados-repository.service";
import {ErrorWrapper} from "../helpers/error-wrapper";
import {LocalRepositoryService} from "../../repository/local-repository.service";
import {ModalService} from "../../ui/modal/modal.service";
import {UpdatePlatformModalComponent} from "../modals/update-platform-modal/update-platform-modal.component";
import {IpcService} from "../../services/ipc.service";
import {GitHubRelease} from "../../../../electron/src/github-api-client/interfaces/github-release";
import {noop} from "../../lib/utils.lib";
import {AboutPageModalComponent} from "../modals/about-page-modal/about-page-modal.component";

@Injectable()
export class ArvadosGlobalService {

    constructor(private arvRepository: ArvadosRepositoryService,
                private notificationBar: NotificationBarService,
                private statusBar: StatusBarService) {
    }

    reloadPlatformData() {
        const process = this.statusBar.startProcess("Getting available repositories.");
        this.arvRepository.fetch().take(1).subscribe((data) => {
            this.statusBar.stopProcess(process, "Refreshed repositories");

        }, err => {
            this.notificationBar.showNotification("Cannot sync platform data. " + new ErrorWrapper(err));
            this.statusBar.stopProcess(process, "Failed to fetch platform data.");
        });
    }

    checkForPlatformUpdates(showModal: boolean = false): Promise<GitHubRelease> {
        return Promise.resolve(null);
    }

    showAboutPageModal() {
    }
}
