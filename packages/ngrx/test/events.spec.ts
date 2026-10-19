import { emptyProps, props } from "@ngrx/store";
import { describe, it, expect, expectTypeOf } from "vitest";
import { events } from "../src/index.js";

describe("events", () => {
  const actions = events("Auth/API", {
    loginSuccess: props<{ user: string }>(),
    loginFailure: props<{ error: string }>(),
    loginRedirect: emptyProps(),
  });

  it("preserves keys and creates readable event types", () => {
    expect(Object.keys(actions)).toEqual([
      "loginSuccess",
      "loginFailure",
      "loginRedirect",
    ]);
    expect(actions.loginSuccess({ user: "Ada" })).toEqual({
      source: "Auth/API",
      name: "Login Success",
      type: "[Auth/API] Login Success",
      user: "Ada",
    });
    expect(actions.loginFailure({ error: "Invalid credentials" })).toEqual({
      source: "Auth/API",
      name: "Login Failure",
      type: "[Auth/API] Login Failure",
      error: "Invalid credentials",
    });
    expect(actions.loginSuccess.type).toBe("[Auth/API] Login Success");
  });

  it("retains readonly literal sources for every creator form", () => {
    const event = actions.loginSuccess({ user: "Ada" });
    expectTypeOf(event.source).toEqualTypeOf<"Auth/API">();
    expectTypeOf(event.name).toEqualTypeOf<"Login Success">();
    expectTypeOf(
      actions.loginRedirect().name,
    ).toEqualTypeOf<"Login Redirect">();
    expectTypeOf(actions.loginRedirect().source).toEqualTypeOf<"Auth/API">();
    const custom = events("Custom", {
      changed: (value: number) => ({ value }),
    });
    expectTypeOf(custom.changed(1).source).toEqualTypeOf<"Custom">();
    expectTypeOf(custom.changed(1).name).toEqualTypeOf<"Changed">();
    expect(custom.changed(1).source).toBe("Custom");
    expect(() => Object.assign(event, { source: "Other" })).toThrow();
    expect(() => Object.assign(event, { name: "Other" })).toThrow();
    function invalid() {
      // @ts-expect-error Event source metadata is readonly.
      event.source = "Auth/API";
      // @ts-expect-error Event name metadata is readonly.
      event.name = "Login Success";
      events("Test", {
        // @ts-expect-error name is reserved for event metadata.
        changed: props<{ name: string }>(),
      });
      events("Test", {
        // @ts-expect-error Creator results cannot override name metadata.
        changed: () => ({ name: "Other" }),
      });
      events("Test", {
        // @ts-expect-error source is reserved for event metadata.
        changed: props<{ source: string }>(),
      });
      events("Test", {
        // @ts-expect-error Creator results cannot override source metadata.
        changed: () => ({ source: "Other" }),
      });
    }
    expectTypeOf(invalid).toBeFunction();
  });

  it("supports empty props", () => {
    expect(actions.loginRedirect()).toEqual({
      source: "Auth/API",
      name: "Login Redirect",
      type: "[Auth/API] Login Redirect",
    });
  });

  it("preserves literal types and payload signatures", () => {
    expectTypeOf(
      actions.loginSuccess.type,
    ).toEqualTypeOf<"[Auth/API] Login Success">();
    expectTypeOf(actions.loginSuccess).parameters.toEqualTypeOf<
      [{ user: string }]
    >();
    expectTypeOf(actions.loginRedirect).parameters.toEqualTypeOf<[]>();
  });
});

describe("events compatibility", () => {
  it("supports creator functions and preserves their arguments", () => {
    const actions = events("Auth/API", {
      // The explicit default-parameter type avoids circular contextual inference.
      // eslint-disable-next-line @typescript-eslint/no-inferrable-types
      loginFailed: (error: Error, attempt: number = 1) => ({
        error,
        attempt,
      }),
    });
    const error = new Error("Invalid credentials");
    expect(actions.loginFailed(error)).toEqual({
      source: "Auth/API",
      name: "Login Failed",
      type: "[Auth/API] Login Failed",
      error,
      attempt: 1,
    });
    expect(actions.loginFailed(error, 2).attempt).toBe(2);
    expect(actions.loginFailed.type).toBe("[Auth/API] Login Failed");
    expectTypeOf(actions.loginFailed).parameters.toEqualTypeOf<
      [Error, number?]
    >();
    expectTypeOf(
      actions.loginFailed.type,
    ).toEqualTypeOf<"[Auth/API] Login Failed">();
  });

  it("keeps acronym and digit labels consistent with literal types", () => {
    const actions = events("Test", {
      loadHTTPError: emptyProps(),
      loadHTTP: emptyProps(),
      version2Ready: emptyProps(),
      a: emptyProps(),
      login: emptyProps(),
    });
    // Typed expected values check both the runtime labels and their inferred types.
    const expected: {
      [K in keyof typeof actions]: (typeof actions)[K]["type"];
    } = {
      loadHTTPError: "[Test] Load HTTP Error",
      loadHTTP: "[Test] Load HTTP",
      version2Ready: "[Test] Version2 Ready",
      a: "[Test] A",
      login: "[Test] Login",
    };
    for (const key of Object.keys(actions) as (keyof typeof actions)[]) {
      expect(actions[key]().type).toBe(expected[key]);
      expect(actions[key]().name).toBe(expected[key].replace("[Test] ", ""));
    }
  });

  it("supports empty groups and keys that shadow object properties", () => {
    expect(events("Test", {})).toEqual({});
    const actions = events("Test", {
      constructor: emptyProps(),
      toString: emptyProps(),
    });
    expect(Object.hasOwn(actions, "constructor")).toBe(true);
    expect(actions.constructor()).toEqual({
      source: "Test",
      name: "Constructor",
      type: "[Test] Constructor",
    });
    expect(actions.toString()).toEqual({
      source: "Test",
      name: "To String",
      type: "[Test] To String",
    });
  });

  it.each([
    "",
    "Login",
    "login success",
    "login_success",
    "login-success",
    "1login",
    "loginÉchec",
  ])("rejects invalid event key %j at runtime", (key) => {
    // Simulate JavaScript callers bypassing compile-time checks.
    expect(() => events("Test", { [key]: emptyProps() } as any)).toThrow(
      "Invalid event key",
    );
  });

  it.each(["", "   "])("rejects an empty source %j at runtime", (source) => {
    expect(() => events(source as any, { login: emptyProps() })).toThrow(
      "Invalid event source",
    );
  });

  it("preserves NgRx payload restrictions and rejects invalid declarations", () => {
    // These calls are checked by tsc but intentionally never executed.
    function checkInvalidDeclarations(
      source: string,
      eventDefinitions: Record<string, ReturnType<typeof emptyProps>>,
    ) {
      // @ts-expect-error Sources must be string literals.
      events(source, { login: emptyProps() });
      // @ts-expect-error Sources must not be empty.
      events("", { login: emptyProps() });
      // @ts-expect-error Event keys must be string literals.
      events("Test", eventDefinitions);
      events("Test", {
        // @ts-expect-error Keys must start lowercase.
        Login: emptyProps(),
      });
      events("Test", {
        // @ts-expect-error Unicode keys are not supported.
        loginÉchec: emptyProps(),
      });
      events("Test", {
        // @ts-expect-error Creator results cannot override the event type.
        login: () => ({ type: "override" }),
      });
      events("Test", {
        // @ts-expect-error Creator results cannot be arrays.
        login: () => ["user"],
      });
      events("Test", {
        // @ts-expect-error Use emptyProps for empty payloads.
        login: () => ({}),
      });
      events("Test", {
        // @ts-expect-error Creator results must be objects.
        login: () => "user",
      });
      // @ts-expect-error The user payload is required.
      actionsForTypes.login();
      // @ts-expect-error The payload must have the declared shape.
      actionsForTypes.login({ user: 42 });
      // @ts-expect-error Empty actions do not accept payloads.
      actionsForTypes.logout({ user: "Ada" });
    }
    const actionsForTypes = events("Test", {
      login: props<{ user: string }>(),
      logout: emptyProps(),
    });
    expectTypeOf(checkInvalidDeclarations).toBeFunction();
  });
});
