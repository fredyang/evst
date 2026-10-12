import { Component } from "@angular/core";
import { Credentials } from "@example-app/auth/models";
import { authViews } from "@example-app/auth/evst/auth.state";
import { fromLoginPage } from "@example-app/auth/evst/auth.events";
import { LoginFormComponent } from "../components/login-form.component";

@Component({
  selector: "bc-login-page",
  template: `
    <bc-login-form
      (submitted)="onSubmit($event)"
      [pending]="pending()"
      [errorMessage]="error()"
    >
    </bc-login-form>
  `,
  styles: [],
  imports: [LoginFormComponent],
})
export class LoginPageComponent {
  readonly pending = authViews.loginPagePending.signal();
  readonly error = authViews.loginPageError.signal();

  onSubmit(credentials: Credentials) {
    fromLoginPage.login.publish({ credentials });
  }
}
