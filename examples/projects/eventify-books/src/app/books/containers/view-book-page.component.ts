import { Component, OnDestroy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Subscription } from "rxjs";
import { map } from "rxjs/operators";

import { fromViewBookPage } from "@example-app/books/store/books.events";
import { SelectedBookPageComponent } from "./selected-book-page.component";

/**
 * Note: Container components are also reusable. Whether or not
 * a component is a presentation component or a container
 * component is an implementation detail.
 *
 * The View Book Page's responsibility is to map router params
 * to a 'Select' book action. Actually showing the selected
 * book remains a responsibility of the
 * SelectedBookPageComponent
 */
@Component({
  selector: "bc-view-book-page",
  template: ` <bc-selected-book-page></bc-selected-book-page> `,
  imports: [SelectedBookPageComponent],
})
export class ViewBookPageComponent implements OnDestroy {
  actionsSubscription: Subscription;

  constructor(route: ActivatedRoute) {
    this.actionsSubscription = route.params
      .pipe(map((params) => params.id))
      .subscribe((id) => fromViewBookPage.selectBook.publish({ id }));
  }

  ngOnDestroy() {
    this.actionsSubscription.unsubscribe();
  }
}
