import { expect, it, vi } from "vitest";
import { concat, exhaust, latest, merge } from "../src/utils/concurrency";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

it("ignores an older result even for repeated identical inputs", async () => {
  const first = deferred<string>();
  const second = deferred<string>();
  const pending = [first, second];
  const run = latest((_query: string) => pending.shift()!.promise);
  const old = run("react");
  const recent = run("react");
  second.resolve("new");
  expect(await recent).toBe("new");
  first.resolve("old");
  expect(await old).toBeUndefined();
});

it("a skipped invocation supersedes pending work", async () => {
  const pending = deferred<string>();
  const run = latest(async (query: string) =>
    query ? pending.promise : undefined,
  );
  const old = run("react");
  await run("");
  pending.resolve("old");
  expect(await old).toBeUndefined();
});

it("discards superseded errors and propagates current errors", async () => {
  const first = deferred<string>();
  const second = deferred<string>();
  const pending = [first, second];
  const run = latest(() => pending.shift()!.promise);
  const old = run();
  const recent = run();
  first.reject(new Error("old"));
  expect(await old).toBeUndefined();
  const assertion = expect(recent).rejects.toThrow("current");
  second.reject(new Error("current"));
  await assertion;
});

it("keeps independently wrapped operations isolated", async () => {
  const pending = deferred<string>();
  const first = latest(() => pending.promise);
  const second = latest(async () => "second");
  const result = first();
  expect(await second()).toBe("second");
  pending.resolve("first");
  expect(await result).toBe("first");
});

it("queues concat invocations in arrival order", async () => {
  const calls: string[] = [];
  const run = concat(async (value: string) => {
    calls.push(value);
    return value;
  });

  const first = run("first");
  const second = run("second");
  expect(calls).toEqual([]);
  await expect(first).resolves.toBe("first");
  await expect(second).resolves.toBe("second");
  expect(calls).toEqual(["first", "second"]);
});

it("allows merge invocations to run concurrently", async () => {
  const first = deferred<string>();
  const second = deferred<string>();
  const pending = [first, second];
  const run = merge(() => pending.shift()!.promise);

  const older = run();
  const newer = run();
  second.resolve("second");
  first.resolve("first");

  await expect(newer).resolves.toBe("second");
  await expect(older).resolves.toBe("first");
});

it("ignores exhaust invocations while one is running", async () => {
  const first = deferred<string>();
  const operation = vi.fn(() => first.promise);
  const run = exhaust(operation);

  const active = run();
  await expect(run()).resolves.toBeUndefined();
  expect(operation).toHaveBeenCalledOnce();

  first.resolve("done");
  await expect(active).resolves.toBe("done");
  await expect(run()).resolves.toBe("done");
  expect(operation).toHaveBeenCalledTimes(2);
});
