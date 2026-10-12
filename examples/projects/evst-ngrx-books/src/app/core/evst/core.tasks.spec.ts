import { DOCUMENT } from "@angular/common";
import { createEnvironmentInjector } from "@angular/core";
import { Actions } from "@ngrx/effects";
import type { Action } from "@ngrx/store";
import { Subject, type Observable } from "rxjs";
import { vi } from "vitest";
import { fromUser } from "./core.events";
import { coreTasks } from "./core.tasks";

describe("coreTasks", () => {
  it("publishes an idle-timeout event after five minutes without activity", () => {
    vi.useFakeTimers();
    const document = new EventTarget();
    const injector = createEnvironmentInjector(
      [
        { provide: Actions, useValue: new Actions(new Subject<Action>()) },
        { provide: DOCUMENT, useValue: document },
      ],
      null!,
    );
    try {
      const output: Action[] = [];
      injector.runInContext(() =>
        (coreTasks.effects.idle as () => Observable<unknown>)().subscribe(
          (event) => output.push(event as Action),
        ),
      );
      document.dispatchEvent(new Event("mousemove"));
      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(output).toEqual([fromUser.idleTimeoutElapsed()]);
    } finally {
      injector.destroy();
      vi.useRealTimers();
    }
  });
});
