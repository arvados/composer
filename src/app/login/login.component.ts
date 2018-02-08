import {Component, OnInit, ViewEncapsulation, Input} from "@angular/core";
import {Observable} from "rxjs/Observable";
import {ReplaySubject} from "rxjs/ReplaySubject";
import {ConfigurationService} from "../app.config";
import {environment} from './../../environments/environment';

@Component({
    encapsulation: ViewEncapsulation.None,

    selector: "login",
    template: `
        <div class="web-login">
            <div class="m-2">
                <a class="btn btn-primary btn-block" href="{{apiEndPoint}}">Click here to log in</a>
            </div>
        </div>
    `,
    styleUrls: [
        "./login.component.scss"
    ]
})
export class LoginComponent implements OnInit {

    @Input()
    apiEndPoint: string;

    constructor(private _config: ConfigurationService) { }

    ngOnInit(): any {
        this._config.configuration.subscribe((conf) => {
            let apiEndPoint = conf['apiEndPoint'];
            apiEndPoint = apiEndPoint.lastIndexOf('/') === apiEndPoint.length ? apiEndPoint.slice(0, -1) : apiEndPoint;
            const returnTo = encodeURIComponent(document.location.href.replace(/\?.*/, ''));
            this.apiEndPoint = apiEndPoint + '/login?return_to=' + returnTo;
        });
    }

}
