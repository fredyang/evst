import { events } from '@ngrx-sugar/store';
import { props } from '@ngrx/store';

import { Book } from '@example-app/books/models';

export const CollectionApiActions = events('Collection/API', {
  /**
   * Add Book to Collection Actions
   */
  addBookSuccess: props<{ book: Book }>(),
  addBookFailure: props<{ book: Book }>(),

  /**
   * Remove Book from Collection Actions
   */
  removeBookSuccess: props<{ book: Book }>(),
  removeBookFailure: props<{ book: Book }>(),

  /**
   * Load Collection Actions
   */
  loadBooksSuccess: props<{ books: Book[] }>(),
  loadBooksFailure: props<{ error: any }>(),
});
