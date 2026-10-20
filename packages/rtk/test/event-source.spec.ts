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
  selected: props<{ source: string; name: string; id: number }>(),
});
const payload = { source: "recommendation", name: "Book", id: 1 };

it("preserves native RTK action shapes and business data", () => {
  const event = fromPage.selected(payload);
  expect(event).toEqual({ type: "[Books Page] Selected", payload });
  expect(fromPage.entered()).toEqual({
    type: "[Books Page] Entered",
    payload: undefined,
  });
  expectTypeOf(event.payload).toEqualTypeOf<typeof payload>();
  expectTypeOf(event.type).toEqualTypeOf<"[Books Page] Selected">();
});

it("preserves creator metadata and standard type-based match narrowing", () => {
  expect(fromPage.entered.type).toBe("[Books Page] Entered");
  expect(String(fromPage.entered)).toBe(fromPage.entered.type);
  const event: unknown = { type: fromPage.selected.type, payload };
  expect(fromPage.selected.match(event)).toBe(true);
  if (fromPage.selected.match(event)) {
    expectTypeOf(event.payload.id).toEqualTypeOf<number>();
    expectTypeOf(event.payload.source).toEqualTypeOf<string>();
  }
  expect(fromPage.selected.match(null)).toBe(false);
  expect(fromPage.selected.match(fromPage.entered())).toBe(false);
});

it("publishes native RTK actions without metadata fields", () => {
  const observed: unknown[] = [];
  const capture: Middleware = () => (next) => (event) => {
    observed.push(event);
    return next(event);
  };
  createEvstStore({ middleware: (defaults) => defaults().concat(capture) });
  fromPage.entered.publish();
  fromPage.selected.publish(payload);
  expect(observed).toEqual([
    { type: "[Books Page] Entered", payload: undefined },
    { type: "[Books Page] Selected", payload },
  ]);
});

it("exposes readonly literal metadata only on event creators", () => {
  const group = events("Books Page", {
    bookSelected: props<{ source: string; name: string }>(),
    entered: emptyProps(),
  });
  expect(group.bookSelected.eventSource).toBe("Books Page");
  expect(group.bookSelected.eventName).toBe("Book Selected");
  expectTypeOf(group.bookSelected.eventSource).toEqualTypeOf<"Books Page">();
  expectTypeOf(group.bookSelected.eventName).toEqualTypeOf<"Book Selected">();
  expectTypeOf(group.entered.eventName).toEqualTypeOf<"Entered">();
  expect(() =>
    Object.assign(group.bookSelected, { eventSource: "Other" }),
  ).toThrow();
  expect(() =>
    Object.assign(group.bookSelected, { eventName: "Other" }),
  ).toThrow();
  expect(group.entered()).not.toHaveProperty("eventSource");
  expect(group.entered()).not.toHaveProperty("eventName");
  const event = group.bookSelected({ source: "recommendation", name: "Title" });
  expect(event).not.toHaveProperty("eventSource");
  expect(event).not.toHaveProperty("eventName");
  function invalid() {
    // @ts-expect-error Creator metadata is readonly.
    group.bookSelected.eventSource = "Books Page";
    // @ts-expect-error Creator metadata is readonly.
    group.bookSelected.eventName = "Book Selected";
  }
  expectTypeOf(invalid).toBeFunction();
});
