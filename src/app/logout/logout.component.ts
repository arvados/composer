import {Component, Input, OnInit, ViewContainerRef, ViewEncapsulation} from "@angular/core";
import {AbstractControl, FormControl, FormGroup, Validators} from "@angular/forms";
import {AuthService} from "../auth/auth.service";
import { ConfigurationService } from "../app.config";

@Component({
    encapsulation: ViewEncapsulation.None,

    selector: "logout",
    template: `
        <button class="btn btn-primary" (click)="logout()">Logout</button>
    `,
    styleUrls: []
})
export class LogoutComponent {

    private workbenchUrl: string;

    constructor(private _authService: AuthService,
                private _config: ConfigurationService) {
    }

    logout(): void {
        this._config.discoveryDoc.take(1).subscribe((conf) => {
            this._authService.setActiveCredentials(null);
            window.location.href = conf["workbenchUrl"] + "/logout";
        });
    }

}
