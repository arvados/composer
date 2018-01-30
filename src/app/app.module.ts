import {IpcWebService} from './services/ipc.web.service';
import {NgModule, APP_INITIALIZER} from "@angular/core";
import {FormBuilder, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {HttpModule} from "@angular/http";
import {BrowserModule} from "@angular/platform-browser";
import "rxjs/Rx";
import {AuthService, CREDENTIALS_REGISTRY} from "./auth/auth.service";
import {MainComponent} from "./components/main/main.component";
import {PlatformConnectionService} from "./core/auth/platform-connection.service";
import {CoreModule} from "./core/core.module";
import {DataGatewayService} from "./core/data-gateway/data-gateway.service";
import {GlobalService} from "./core/global/global.service";
import {ArvadosGlobalService} from "./core/global/arvados-global.service";
import {CWLModule} from "./cwl/cwl.module";
import {EditorCommonModule} from "./editor-common/editor-common.module";
import {FileRepositoryService} from "./file-repository/file-repository.service";
import {ArvadosFileRepositoryService} from "./file-repository/arvados-file.service";
import {StatusBarService} from "./layout/status-bar/status-bar.service";
import {NativeModule} from "./native/native.module";
import {WebstubModule} from "./webstub/webstub.module";
import {LocalRepositoryService} from "./repository/local-repository.service";
import {PlatformRepositoryService} from "./repository/platform-repository.service";
import {ArvadosRepositoryService} from "./repository/arvados-repository.service";
import {DomEventService} from "./services/dom/dom-event.service";
import {IpcService} from "./services/ipc.service";
import {JavascriptEvalService} from "./services/javascript-eval/javascript-eval.service";
import {SettingsService} from "./services/settings/settings.service";
import {ToolEditorModule} from "./tool-editor/tool-editor.module";
import {ModalService} from "./ui/modal/modal.service";
import {UIModule} from "./ui/ui.module";
import {WorkflowEditorModule} from "./workflow-editor/workflow-editor.module";
import {OpenExternalFileService} from "./core/open-external-file/open-external-file.service";
import {ExportAppService} from "./services/export-app/export-app.service";

import {ConfigurationService} from "./app.config";
import {LoginComponent} from "./login/login.component";
import {environment} from './../environments/environment';
import {CookieModule} from 'ngx-cookie';
import {JSGitService} from "./services/js-git/js-git.service";
import {SchemaSaladResolver} from "./schema-salad-resolver/schema-salad-resolver.service"

@NgModule({
    providers: [
        ConfigurationService,
        ArvadosRepositoryService,
        {
            provide: CREDENTIALS_REGISTRY,
            useExisting: ArvadosRepositoryService
        },
        AuthService,
        DataGatewayService,
        DomEventService,
        ExportAppService,
        FormBuilder,
        IpcWebService,
        IpcService,
        JavascriptEvalService,
        ArvadosFileRepositoryService,
	SchemaSaladResolver,
        {
            provide: FileRepositoryService,
            useExisting: ArvadosFileRepositoryService
        },
        {
            provide: LocalRepositoryService,
            useExisting: ArvadosRepositoryService
        },
        {
            provide: PlatformRepositoryService,
            useExisting: ArvadosRepositoryService
        },
        {
            provide: GlobalService,
            useClass: ArvadosGlobalService
        },

        //LocalRepositoryService,
        //PlatformRepositoryService,
        OpenExternalFileService,
        ModalService,
        PlatformConnectionService,
        SettingsService,
        StatusBarService,
        JSGitService
    ],
    declarations: [
        MainComponent,
        LoginComponent,
    ],
    entryComponents: [
        MainComponent,
        LoginComponent,
    ],
    imports: [
        BrowserModule,
        FormsModule,
        HttpModule,
        CoreModule,
        ReactiveFormsModule,
        UIModule,
        CWLModule,
        EditorCommonModule,
        ToolEditorModule,
        WorkflowEditorModule,
        WebstubModule,
//        NativeModule,
        CookieModule.forRoot(),
    ],
})
export class AppModule {

    constructor(private _authService: AuthService) {}

    ngDoBootstrap(app) {

        console.log("booting");

        let rootComponent = "ct-cottontail";
        let InitComponent:any = MainComponent;

        if (environment.browser) {
            console.log("Starting");
            this._authService.getActive().subscribe((cred) => {
                if (!cred) {
                    rootComponent = "login";
                    InitComponent = LoginComponent;
                }
                document.body.appendChild(document.createElement(rootComponent));
                app.bootstrap(InitComponent);
            });
        } else {
            document.body.appendChild(document.createElement(rootComponent));
            app.bootstrap(InitComponent);
        }
    }

}
