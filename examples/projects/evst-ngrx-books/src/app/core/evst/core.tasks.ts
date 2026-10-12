import { DOCUMENT } from "@angular/common";
import { inject } from "@angular/core";
import { task } from "@evst/ngrx";
import { fromEvent, map, merge, switchMap, timer } from "rxjs";
import { fromUser } from "./core.events";

export const coreTasks = task.handle((on) => ({
  // eslint-disable-next-line evst/require-task-event -- Observes browser activity for the application lifetime to publish idle timeouts.
  idle: on((document = inject(DOCUMENT)) =>
    merge(
      fromEvent(document, "click"),
      fromEvent(document, "keydown"),
      fromEvent(document, "mousemove"),
    ).pipe(
      switchMap(() => timer(5 * 60 * 1000)),
      map(() => fromUser.idleTimeoutElapsed()),
    ),
  ),
}));
