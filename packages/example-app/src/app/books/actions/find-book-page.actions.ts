import { events } from '@ngrx-sugar/store';
import { props } from '@ngrx/store';

export const FindBookPageActions = events('Find Book Page', {
  searchBooks: props<{ query: string }>(),
});
