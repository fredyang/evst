import { events } from '@ngrx-sugar/store';
import { props } from '@ngrx/store';

import { Book } from '@example-app/books/models';

export const SelectedBookPageActions = events('Selected Book Page', {
  /**
   * Add Book to Collection Action
   */
  addBook: props<{ book: Book }>(),

  /**
   * Remove Book from Collection Action
   */
  removeBook: props<{ book: Book }>(),
});
