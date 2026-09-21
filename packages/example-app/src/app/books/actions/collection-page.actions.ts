import { events } from '@ngrx-sugar/store';
import { emptyProps } from '@ngrx/store';

export const CollectionPageActions = events('Collection Page', {
  /**
   * Load Collection Action
   */
  enter: emptyProps(),
});
