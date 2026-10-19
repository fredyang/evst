import type { Middleware } from "@reduxjs/toolkit";
import { afterEach, expect, expectTypeOf, it } from "vitest";
import {
  clearEvstStore,
  createEvstStore,
  emptyProps,
  events,
  props,
} from "../src/index.js";

afterEach(clearEvstStore);
const fromPage = events("Books Page", {
  entered: emptyProps(),
  selected: props<{ source: string; id: number }>(),
});

it("retains readonly literal sources without changing payloads", () => {
  const event = fromPage.selected({ source: "payload", id: 1 });
  expectTypeOf(event.source).toEqualTypeOf<"Books Page">();
  expectTypeOf(event.name).toEqualTypeOf<"Selected">();
  expectTypeOf(fromPage.entered().source).toEqualTypeOf<"Books Page">();
  expectTypeOf(fromPage.entered().name).toEqualTypeOf<"Entered">();
  expect(event).toEqual({
    name: "Selected",
    type: "[Books Page] Selected",
    source: "Books Page",
    payload: { source: "payload", id: 1 },
  });
  expect(() => Object.assign(event, { source: "Other" })).toThrow();
  expect(() => Object.assign(event, { name: "Other" })).toThrow();
  function invalid() {
    // @ts-expect-error Event source metadata is readonly.
    event.source = "Books Page";
    // @ts-expect-error Event name metadata is readonly.
    event.name = "Selected";
  }
  expectTypeOf(invalid).toBeFunction();
});

it("preserves creator metadata and source-aware match narrowing", () => {
  expect(fromPage.entered.type).toBe("[Books Page] Entered");
  expect(String(fromPage.entered)).toBe(fromPage.entered.type);
  const event: unknown = fromPage.selected({ source: "payload", id: 1 });
  expect(fromPage.selected.match(event)).toBe(true);
  if (fromPage.selected.match(event)) {
    expectTypeOf(event.source).toEqualTypeOf<"Books Page">();
    expectTypeOf(event.name).toEqualTypeOf<"Selected">();
    expectTypeOf(event.payload.id).toEqualTypeOf<number>();
  }
  expect(fromPage.selected.match(null)).toBe(false);
  expect(fromPage.selected.match(fromPage.entered())).toBe(false);
  expect(
    fromPage.selected.match({ type: fromPage.selected.type, source: "Other" }),
  ).toBe(false);
});

it("includes source metadata when publishing", () => {
  const observed: unknown[] = [];
  const capture: Middleware = () => (next) => (event) => {
    observed.push(event);
    return next(event);
  };
  createEvstStore({ middleware: (defaults) => defaults().concat(capture) });
  fromPage.entered.publish();
  fromPage.selected.publish({ source: "payload", id: 1 });
  expect(observed).toEqual([
    fromPage.entered(),
    fromPage.selected({ source: "payload", id: 1 }),
  ]);
});

it("preserves payload names and infers readable event labels", () => {
  const group = events("Test", {
    bookSelected: props<{ name: string }>(),
    entered: emptyProps(),
  });
  const event = group.bookSelected({ name: "Book title" });
  expectTypeOf(event.name).toEqualTypeOf<"Book Selected">();
  expect(event.name).toBe("Book Selected");
  expect(event.payload.name).toBe("Book title");
  expect(group.bookSelected.match({ ...event, name: "Other" })).toBe(false);
});
