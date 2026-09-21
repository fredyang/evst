import { events } from '@ngrx-sugar/store';
import { emptyProps } from '@ngrx/store';

export const LayoutActions = events('Layout', {
  openSidenav: emptyProps(),
  closeSidenav: emptyProps(),
});
