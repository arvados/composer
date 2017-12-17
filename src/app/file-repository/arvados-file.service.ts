import {Injectable} from "@angular/core";
import {Observable} from "rxjs/Observable";
import {Subject} from "rxjs/Subject";
import {JSGitService} from "../services/js-git/js-git.service";

@Injectable()
export class ArvadosFileRepositoryService {

    private watchedPaths     = [];
    private directoryReloads = new Subject<string>();

    constructor(private _jsgit: JSGitService) {
    }

    watch(path: string): Observable<any> { return Observable.empty(); }

    reloadPath(path: string): void { }

    saveFile(path: string, content: string): Promise<any> {
        console.log("saveFile");
        return null;
    }

    fetchFile(path: string, forceFetch = false): Promise<string> {
        console.log("Fetching content "+path);
        return this._jsgit.getFileContent(path).take(1).toPromise();
    }
}
