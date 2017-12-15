import {Inject, Injectable, InjectionToken, Optional} from "@angular/core";

@Injectable()
export class WebstubService {

    constructor() {
    }

    getRemote() {
        return {
            process: {
                argv: []
            }
        };
    }
}
