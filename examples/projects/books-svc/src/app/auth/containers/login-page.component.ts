import { Component } from "@angular/core";
import { Credentials } from "@example-app/auth/models";
import { AuthSessionService } from "@example-app/auth/services";
import { LoginFormComponent } from "../components/login-form.component";

@Component({
  selector: "bc-login-page",
  template: `
    <bc-login-form
      (submitted)="onSubmit($event)"
      [pending]="session.pending()"
      [errorMessage]="session.error()"
    >
    </bc-login-form>
  `,
  styles: [],
  imports: [LoginFormComponent],
})
export class LoginPageComponent {
  constructor(readonly session: AuthSessionService) {}

  onSubmit(credentials: Credentials) {
    this.session.login(credentials);
  }
}
