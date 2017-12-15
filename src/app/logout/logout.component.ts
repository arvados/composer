import {Component, Input, OnInit, ViewContainerRef, ViewEncapsulation} from "@angular/core";
import {AbstractControl, FormControl, FormGroup, Validators} from "@angular/forms";
import {AuthService} from "../auth/auth.service";

@Component({
    encapsulation: ViewEncapsulation.None,

    selector: "logout",
    template: `
        <button class="btn btn-primary" (click)="logout()">Logout</button>
    `,
    styleUrls: []
})
export class LogoutComponent {

    constructor(private _authService: AuthService) {}

    logout(): void {
        this._authService.setActiveCredentials(null);
    }

}