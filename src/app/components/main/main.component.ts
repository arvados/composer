import {Component, ViewContainerRef, ViewEncapsulation} from "@angular/core";
import "rxjs/add/observable/fromEvent";
import "rxjs/add/operator/bufferCount";
import "rxjs/add/operator/concat";
import "rxjs/add/operator/concatAll";
import "rxjs/add/operator/delay";
import {Observable} from "rxjs/Observable";
import {AuthService} from "../../auth/auth.service";
import {GlobalService} from "../../core/global/global.service";
import {SystemService} from "../../platform-providers/system.service";
import {PlatformAPI} from "../../services/api/platforms/platform-api.service";
import {GuidService} from "../../services/guid.service";
import {JavascriptEvalService} from "../../services/javascript-eval/javascript-eval.service";
import {ContextService} from "../../ui/context/context.service";
import {MarkdownService} from "../../ui/markdown/markdown.service";
import {ModalService} from "../../ui/modal/modal.service";
import {UrlValidator} from "../../validators/url.validator";

@Component({
    encapsulation: ViewEncapsulation.None,

    selector: "ct-cottontail",
    template: `
        <ct-layout data-test="layout"></ct-layout>
        <div id="runnix" [class.active]="runnix | async"></div>

    `,
    styleUrls: ["./../../../assets/sass/main.scss", "./main.component.scss"],
    providers: [
        UrlValidator,
        PlatformAPI,
        MarkdownService,
        ContextService,
        // FIXME: this needs to be handled in a system-specific way
        GuidService
    ],
})
export class MainComponent {

    public runnix: Observable<boolean>;

    constructor(modal: ModalService,
                system: SystemService,
                vcRef: ViewContainerRef,
                auth: AuthService,
                global: GlobalService,
                // DON'T REMOVE THIS PLEASE I KNOW IT DOESN'T HAVE ANY USAGES
                js: JavascriptEvalService) {

        system.boot();

        // When we first get active credentials (might be undefined if no user is active), sync data with the platform
        auth.getActive().take(1).toPromise().then(credentials => credentials && global.reloadPlatformData());

        /**
         * Hack for angular's inability to provide the vcRef to a service with DI.
         * {@link ModalService.rootViewRef}
         */
        modal.setViewContainer(vcRef);

        this.runnix = Observable.fromEvent(document, "keyup").map((e: KeyboardEvent) => e.keyCode).bufferCount(10, 1)
            .filter(seq => seq.toString() === [38, 38, 40, 40, 37, 39, 37, 39, 66, 65].toString())
            .map(seq => Observable.of(true).concat(Observable.of(false).delay(3000)))
            .concatAll();
    }
}
