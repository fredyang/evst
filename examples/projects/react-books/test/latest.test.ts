import { expect, it } from "vitest";
import { latest } from "../src/utils/latest";

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
