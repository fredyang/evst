import { createEnvironmentInjector, ErrorHandler } from "@angular/core";
import { INITIAL_OPTIONS } from "@ngrx/store-devtools";
import { afterEach, expect, it, vi } from "vitest";
import { provideStoreSugar } from "../src/index.js";

const mode = vi.hoisted(() => ({ development: true }));
vi.mock("@angular/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@angular/core")>()),
  isDevMode: () => mode.development,
}));
afterEach(() => {
  mode.development = true;
});

it("omits DevTools in production even when options are supplied", () => {
  mode.development = false;
  const options = vi.fn(() => ({ name: "Books" }));
  const injector = createEnvironmentInjector(
    [ErrorHandler, provideStoreSugar({ devtools: options })],
    null!,
  );
  try {
    expect(injector.get(INITIAL_OPTIONS, null)).toBeNull();
    expect(options).not.toHaveBeenCalled();
  } finally {
    injector.destroy();
  }
});

it("preserves custom DevTools option factories", () => {
  const options = vi.fn(() => ({ name: "Books", maxAge: 25 }));
  const injector = createEnvironmentInjector(
    [ErrorHandler, provideStoreSugar({ devtools: options })],
    null!,
  );
  try {
    expect(injector.get(INITIAL_OPTIONS)).toBe(options);
    expect(options).toHaveBeenCalled();
  } finally {
    injector.destroy();
  }
});
