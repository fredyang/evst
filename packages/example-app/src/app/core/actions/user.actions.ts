import { events } from '@ngrx-sugar/store';
import { emptyProps } from '@ngrx/store';

export const UserActions = events('User', {
  idleTimeout: emptyProps(),
});
