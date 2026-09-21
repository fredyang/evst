import { events } from '@ngrx-sugar/store';
import { props } from '@ngrx/store';

export const ViewBookPageActions = events('View Book Page', {
  selectBook: props<{ id: string }>(),
});
