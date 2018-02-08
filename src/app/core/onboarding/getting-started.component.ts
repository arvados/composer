import {ChangeDetectionStrategy, Component} from "@angular/core";
import {AuthService} from "../../auth/auth.service";
import {SystemService} from "../../platform-providers/system.service";
import {ModalService} from "../../ui/modal/modal.service";
import {SendFeedbackModalComponent} from "../modals/send-feedback-modal/send-feedback.modal.component";

@Component({
    styleUrls: ["getting-started.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: "ct-getting-started",
    template: `
        <!--Caption-->
        <p class="text-title">Getting Started</p>

        <!--Items-->
        <div class="items">
            <!--Item-->
            <div class="item">
                <p class="subtitle">Before you start building</p>

                <p>
                   Choose a git repository on the left or choose <i class="fa fa-fw fa-gear"></i> Manage Repositories to create a new one.
                   <!--
                    Learn how to
                    <a #localWorkspaceLink
                       href="http://docs.rabix.io/rabix-composer-configuration#add-a-local-workspace"
                       (click)="system.openLink(localWorkspaceLink.href, $event)"
                       data-test="local-workspace-link">
                        add a local workspace
                    </a>
                    and
                    <a #connectingPlatformLink
                       href="http://docs.rabix.io/rabix-composer-configuration#connect-a-platform-account"
                       (click)="system.openLink(connectingPlatformLink.href, $event)"
                       data-test="connecting-platform-link">
                        connect your Platform account.
                    </a>
                   -->
                </p>
            </div>

            <!--Item-->
            <div class="item">
                <p class="subtitle">Build tools and workflows</p>
                <p>
                    Wrap your command line tool and create workflows
                    using the <a href="http://www.commonwl.org/user_guide/" target="_blank">Common Workflow Language</a>.
                </p>
            </div>

            <!--Item-->
            <div class="item">
                <p class="subtitle">Need help?</p>
                <p>If you have problems, ideas, or other comments, let us know.</p>
                <p>
                   <a href="mailto:support@curoverse.com">support@curoverse.com</a>
                </p>
            </div>
        </div>
    `
})
export class GettingStartedComponent {

    constructor(public auth: AuthService,
                public system: SystemService,
                private modal: ModalService) {
    }

    initiateFeedbackDialog() {

        this.auth.getActive().take(1).subscribe(credentials => {
            if (credentials) {
                this.modal.fromComponent(SendFeedbackModalComponent, "Send Feedback");
                return;
            }
            this.system.openLink("mailto:support@sbgenomics.com?subject=Rabix Composer Feedback");
        });
    }
}
