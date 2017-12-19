import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";

import {WebstubService} from "./webstub.service";
import {ElectronProxyService} from "../native/proxy/electron-proxy.service";
import {NativeSystemService} from "../native/system/native-system.service";

@NgModule({
    imports: [
        CommonModule
    ],
    declarations: [],
    providers: [
        {
          provide: ElectronProxyService,
          useClass: WebstubService
        },
        {
          provide: NativeSystemService,
          useClass: WebstubService
        }
    ]
})
export class WebstubModule {
}
