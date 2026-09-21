import { events } from '@ngrx-sugar/store';
import { props, emptyProps } from '@ngrx/store';
import { User } from '@example-app/auth/models';

export const AuthApiActions = events('Auth/API', {
  loginSuccess: props<{ user: User }>(),
  loginFailure: props<{ error: any }>(),
  loginRedirect: emptyProps(),
});
