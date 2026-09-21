import { events } from '@ngrx-sugar/store';
import { props } from '@ngrx/store';
import { Credentials } from '@example-app/auth/models';

export const LoginPageActions = events('Login Page', {
  login: props<{ credentials: Credentials }>(),
});
