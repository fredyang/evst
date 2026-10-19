import { afterEach, expect, it, vi } from "vitest";
import {
  clearEvstStore,
  createEvstStore,
  emptyProps,
  events,
  evst,
  props,
  task,
} from "../src/index.js";

afterEach(clearEvstStore);
const fromTest = events("Test", { run: emptyProps(), added: props<number>() });
const counter = evst("counter", { count: 0 }).state((on) => ({
  add: on(fromTest.added, (state, amount) => {
    state.count += amount;
  }),
}));
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

it("dispatches synchronous and asynchronous startup results", async () => {
  const effects = task((on) => ({
    sync: on(() => fromTest.added(1)),
    async: on(async () => fromTest.added(2)),
    empty: on(async () => {}),
  }));
  const store = createEvstStore(counter, effects);
  expect(store.getState().counter.count).toBe(1);
  await flush();
  expect(store.getState().counter.count).toBe(3);
});

it("cleans event and View effects before rerunning and on stop", () => {
  const calls: string[] = [];
  const effects = task((on) => ({
    event: on(fromTest.run, () => {
      calls.push("event");
      return () => {
        calls.push("clean event");
      };
    }),
    view: on(counter.views.count, (count) => {
      calls.push(`view ${count}`);
      return () => {
        calls.push(`clean view ${count}`);
      };
    }),
  }));
  createEvstStore(counter, effects);
  fromTest.run.publish();
  fromTest.run.publish();
  fromTest.added.publish(1);
  fromTest.added.publish(1);
  clearEvstStore();
  expect(calls).toEqual([
    "event",
    "clean event",
    "event",
    "view 1",
    "clean view 1",
    "view 2",
    "clean event",
    "clean view 2",
  ]);
});

it("immediately runs late cleanup and suppresses late events after stopping", async () => {
  let finishCleanup!: (cleanup: () => void) => void;
  let finishEvent!: (event: ReturnType<typeof fromTest.added>) => void;
  let cleaned = 0;
  const effects = task((on) => ({
    startup: on(
      () =>
        new Promise<() => void>((resolve) => {
          finishCleanup = resolve;
        }),
    ),
    event: on(
      fromTest.run,
      () =>
        new Promise<ReturnType<typeof fromTest.added>>((resolve) => {
          finishEvent = resolve;
        }),
    ),
  }));
  const store = createEvstStore(counter, effects);
  fromTest.run.publish();
  clearEvstStore();
  finishCleanup(() => {
    cleaned++;
  });
  finishEvent(fromTest.added(10));
  await flush();
  expect(cleaned).toBe(1);
  expect(store.getState().counter.count).toBe(0);
});

it("cleans an older async invocation without replacing newer cleanup", async () => {
  let finish!: (cleanup: () => void) => void;
  const calls: string[] = [];
  let runs = 0;
  const effects = task((on) => ({
    event: on(fromTest.run, () => {
      if (++runs === 1)
        return new Promise<() => void>((resolve) => {
          finish = resolve;
        });
      return () => {
        calls.push("new");
      };
    }),
  }));
  createEvstStore(counter, effects);
  fromTest.run.publish();
  fromTest.run.publish();
  finish(() => {
    calls.push("old");
  });
  await flush();
  expect(calls).toEqual(["old"]);
  clearEvstStore();
  expect(calls).toEqual(["old", "new"]);
});

it("dispatches async View results and saves async cleanup", async () => {
  let cleaned = 0;
  const effects = task((on) => ({
    view: on(counter.views.count, async (count) => {
      if (count === 1) return fromTest.added(1);
      return () => {
        cleaned++;
      };
    }),
  }));
  const store = createEvstStore(counter, effects);
  fromTest.added.publish(1);
  await flush();
  expect(store.getState().counter.count).toBe(2);
  clearEvstStore();
  expect(cleaned).toBe(1);
});

it("reports rejected startup effects without an unhandled rejection", async () => {
  const error = new Error("startup failed");
  const report = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    createEvstStore(
      counter,
      task((on) => ({
        failed: on(async () => {
          throw error;
        }),
      })),
    );
    await flush();
    expect(report).toHaveBeenCalledWith("EVST startup Task failed", error);
  } finally {
    report.mockRestore();
  }
});

it("rejects unsupported return types", () => {
  task((on) => ({
    // @ts-expect-error Numbers are not Task results.
    invalid: on(() => 123),
    // @ts-expect-error Promises of strings are not Task results.
    invalidAsync: on(fromTest.run, async () => "invalid"),
    // @ts-expect-error View effects must return a supported Task result.
    invalidView: on(counter.views.count, () => true),
  }));
});
