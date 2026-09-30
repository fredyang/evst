import { DOCUMENT } from "@angular/common";
import { inject, Injectable } from "@angular/core";
import { fromEvent, merge, Subscription, timer } from "rxjs";
import { switchMap } from "rxjs/operators";
import { AuthSessionService } from "@example-app/auth/services";

/** Logs out after five minutes without a click, key press, or mouse movement. */
@Injectable({ providedIn: "root" })
export class IdleTimeoutService {
  private readonly document = inject(DOCUMENT);
  private readonly session = inject(AuthSessionService);
  private subscription?: Subscription;

  initialize(): void {
    if (this.subscription) return;

    this.subscription = merge(
      fromEvent(this.document, "click"),
      fromEvent(this.document, "keydown"),
      fromEvent(this.document, "mousemove"),
    )
      .pipe(switchMap(() => timer(5 * 60 * 1000)))
      .subscribe(() => {
        if (this.session.loggedIn()) {
          this.session.logout();
        }
      });
  }
}
