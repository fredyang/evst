import { events } from '@ngrx-sugar/store';
import { props } from '@ngrx/store';

import { Book } from '@example-app/books/models';

export const BooksApiActions = events('Books/API', {
  searchSuccess: props<{ books: Book[] }>(),
  searchFailure: props<{ errorMsg: string }>(),
});
