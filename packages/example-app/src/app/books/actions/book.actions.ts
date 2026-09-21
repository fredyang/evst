import { events } from '@ngrx-sugar/store';
import { props } from '@ngrx/store';

import { Book } from '@example-app/books/models';

export const BookActions = events('Book Exists Guard', {
  loadBook: props<{ book: Book }>(),
});
