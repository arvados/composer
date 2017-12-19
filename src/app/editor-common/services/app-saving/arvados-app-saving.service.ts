import {Injectable} from "@angular/core";
import {FormControl} from "@angular/forms";
import {PlatformRepositoryService} from "../../../repository/platform-repository.service";
import {ModalService} from "../../../ui/modal/modal.service";
import {AppSaver} from "./app-saver.interface";
import {JSGitService} from "../../../services/js-git/js-git.service"

@Injectable()
export class ArvadosAppSavingService implements AppSaver {

    constructor(private _jsgit: JSGitService) {
    }

    save(appID: string, content: string, revisionNote?: string): Promise<any> {
        return this._jsgit.saveToGitRepo(appID, content).toPromise();
    }

}
