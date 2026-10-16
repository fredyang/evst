import {
  createEnvironmentInjector,
  ErrorHandler,
  ɵINJECTOR_SCOPE,
} from "@angular/core";
import { createAction, props, Store } from "@ngrx/store";
import { map, tap } from "rxjs";
import { expect, expectTypeOf, it, vi } from "vitest";
import { evst, view, provideEvstStore } from "../src/index.js";

const added = createAction("[Composition] Added", props<{ amount: number }>());
const reset = createAction("[Composition] Reset");

it("accumulates typed views, state and tasks across repeated composition calls", () => {
  const firstSeen: number[] = [],
    secondSeen: string[] = [];
  const built = vi.fn();
  const base = evst("counter", { count: 0 });
  const first = base
    .view(({ count }) => ({ doubled: view(count, (n) => n * 2) }))
    .state((on) => ({
      add: on(added, (s, { amount }) => ({ count: s.count + amount })),
    }))
    .task((on, views) => {
      built();
      expect(views).not.toHaveProperty("text");
      return {
        first: on(
          added,
          (pipe) =>
            pipe(
              tap(() =>
                firstSeen.push(views.doubled({ counter: { count: 2 } })),
              ),
            ),
          { dispatch: false },
        ),
      };
    });
  const final = first
    .view(({ doubled }) => ({ text: view(doubled, (n) => `${n}!`) }))
    .task((on, views) => ({
      second: on(
        added,
        (pipe) =>
          pipe(
            tap(() => {
              expectTypeOf(views.text).returns.toEqualTypeOf<string>();
              secondSeen.push(views.text({ counter: { count: 2 } }));
            }),
          ),
        { dispatch: false },
      ),
    }))
    .state((on) => ({ reset: on(reset, () => ({ count: 0 })) }));
  expectTypeOf(final.effects).toHaveProperty("first");
  expectTypeOf(final.effects).toHaveProperty("second");
  expectTypeOf(base).not.toHaveProperty("effects");
  expectTypeOf(final).not.toHaveProperty("on");
  expect(first.views).not.toHaveProperty("text");
  expect(first.effects).not.toHaveProperty("second");
  expect(final.effects.first).toBe(first.effects.first);
  expect(built).toHaveBeenCalledOnce();
  const injector = createEnvironmentInjector(
    [
      { provide: ɵINJECTOR_SCOPE, useValue: "root" },
      ErrorHandler,
      provideEvstStore({ devtools: false }),
      final.provide(),
    ],
    null!,
  );
  try {
    const store = injector.get(Store);
    store.dispatch(added({ amount: 2 }));
    expect(store.selectSignal(final.views.text)()).toBe("4!");
    expect(firstSeen).toEqual([4]);
    expect(secondSeen).toEqual(["4!"]);
    store.dispatch(reset());
    expect(store.selectSignal(final.views.count)()).toBe(0);
  } finally {
    injector.destroy();
  }
});

it("rejects repeated state labels, event type strings, task labels and view names", () => {
  const base = evst("counter", { count: 0 })
    .state((on) => ({ add: on(added, (s) => s) }))
    .task((on) => ({ save: on(added, (pipe) => pipe(map(() => reset()))) }));
  expect(() => base.state((on) => ({ add: on(reset, (s) => s) }))).toThrow(
    'State handler "add"',
  );
  const alias = createAction(added.type);
  expect(() => base.state((on) => ({ another: on(alias, (s) => s) }))).toThrow(
    "already handled",
  );
  expect(() =>
    evst("counter", { count: 0 }).state((on) => ({
      duplicate: on(added, added, (s) => s),
    })),
  ).toThrow("already handled");
  expect(() =>
    base.task((on) => ({
      save: on(reset, (pipe) => pipe(map(() => reset()))),
    })),
  ).toThrow('Task "save"');
  expect(() => base.view(({ count }) => ({ count }))).toThrow('View "count"');
  expect(() => base.view(({ count }) => ({ root: count }))).toThrow(
    'View "root"',
  );
  expect(() =>
    base.task((on) => ({
      other: on(added, (pipe) => pipe(map(() => reset()))),
    })),
  ).not.toThrow();
});

it("retains NgRx replacement behavior for feature keys", () => {
  const first = evst("counter", { count: 0 }).state((on) => ({
    add: on(added, (s) => ({ count: s.count + 1 })),
  }));
  const second = evst("counter", { count: 0 }).state((on) => ({
    add: on(added, (s) => ({ count: s.count + 10 })),
  }));
  const injector = createEnvironmentInjector(
    [
      { provide: ɵINJECTOR_SCOPE, useValue: "root" },
      ErrorHandler,
      provideEvstStore({ devtools: false }),
      first.provide(),
      second.provide(),
    ],
    null!,
  );
  try {
    injector.get(Store).dispatch(added({ amount: 0 }));
    expect(injector.get(Store).selectSignal(second.views.count)()).toBe(10);
  } finally {
    injector.destroy();
  }
});

it("keeps standalone views composable across features", () => {
  const auth = evst("auth", { loggedIn: true });
  const books = evst("books", { title: "Book" });
  const summary = view(
    auth.views.loggedIn,
    books.views.title,
    (loggedIn, title) => (loggedIn ? title : ""),
  );
  expectTypeOf(summary).returns.toEqualTypeOf<string>();
  expect(summary({ auth: { loggedIn: true }, books: { title: "Book" } })).toBe(
    "Book",
  );
});
