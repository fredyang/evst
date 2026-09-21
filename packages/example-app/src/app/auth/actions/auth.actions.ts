import { events } from '@ngrx-sugar/store';
import { emptyProps } from '@ngrx/store';

export const AuthActions = events('Auth', {
  logout: emptyProps(),
  logoutConfirmation: emptyProps(),
  logoutConfirmationDismiss: emptyProps(),
});
