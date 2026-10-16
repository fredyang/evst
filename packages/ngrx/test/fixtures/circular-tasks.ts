import { inject } from "@angular/core";
import { Actions, ofType } from "@ngrx/effects";
import { Store } from "@ngrx/store";
import { map, type Observable } from "rxjs";
import { task, type Tasks } from "../../src/index.js";
import { circularState } from "./circular-state.js";

export const circularTasks: Tasks = task((on) => ({
  increment: on((): Observable<{ type: string; count: number }> => {
    const value = inject(Store).selectSignal(circularState.views.count);
    return inject(Actions).pipe(
      ofType("[Circular] Clicked"),
      map(() => ({ type: "[Circular] Counted", count: value() + 1 })),
    );
  }),
}));
