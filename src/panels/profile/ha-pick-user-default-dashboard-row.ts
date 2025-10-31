import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { CoreFrontendUserData } from "../../data/frontend";
import type { HomeAssistant } from "../../types";
import "./ha-pick-dashboard-row";

@customElement("ha-pick-user-default-dashboard-row")
class UserDefaultDashboardRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public coreUserData?: CoreFrontendUserData | null;

  protected render(): TemplateResult {
    return html`
      <ha-pick-dashboard-row
        .hass=${this.hass}
        .narrow=${this.narrow}
        .headerKey=${"ui.panel.profile.user_default_dashboard.header"}
        .descriptionKey=${"ui.panel.profile.user_default_dashboard.description"}
        .currentValue=${this.coreUserData?.defaultPanel}
        .onDashboardChanged=${this._handleDashboardChanged}
      ></ha-pick-dashboard-row>
    `;
  }

  private _handleDashboardChanged = (urlPath: string) => {
    fireEvent(this, "hass-user-default-dashboard-select", urlPath);
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-user-default-dashboard-row": UserDefaultDashboardRow;
  }
}
