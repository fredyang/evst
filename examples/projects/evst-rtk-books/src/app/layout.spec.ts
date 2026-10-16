// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { clearEvstStore } from "@evst/rtk";
import { evst } from "../evst";
import { Provider } from "react-redux";
import { AppLayout } from "./layout";
import { fromUser } from "../core/evst/core.evst";

let root: Root;
const store = evst;
let host: HTMLDivElement;
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  clearEvstStore();
});

it("guards Books, loads its feature after login, and supports navigation and sign out", async () => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  expect(Object.keys(store.getState()).sort()).toEqual(["auth", "core"]);
  await act(async () => {
    root.render(
      createElement(Provider, {
        store: evst,
        children: createElement(
          MemoryRouter,
          { initialEntries: ["/books"] },
          createElement(AppLayout),
        ),
      }),
    );
  });
  expect(host.textContent).toContain("Login");
  expect(store.getState()).not.toHaveProperty("books");
  await act(async () => {
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await act(async () => {
    await vi.waitFor(() => expect(store.getState()).toHaveProperty("books"));
  });
  expect(host.textContent).toContain("My Collection");

  const clickButton = async (label: string) => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (element) =>
        element.textContent === label ||
        element.getAttribute("aria-label") === label,
    );
    expect(button).toBeDefined();
    await act(async () => button!.click());
  };
  await clickButton("Toggle navigation");
  const browse = Array.from(document.querySelectorAll("a")).find((element) =>
    element.textContent?.includes("Browse Books"),
  );
  await act(async () => browse!.click());
  expect(host.textContent).toContain("Browse Books");
  await clickButton("Toggle navigation");
  const signOut = Array.from(document.querySelectorAll('[role="button"]')).find(
    (element) => element.textContent?.includes("Sign Out"),
  );
  await act(async () => (signOut as HTMLElement).click());
  expect(document.body.textContent).toContain("Are you sure");
  await clickButton("Cancel");
  expect(store.getState().auth.user).not.toBeNull();
  await clickButton("Toggle navigation");
  const signOutAgain = Array.from(
    document.querySelectorAll('[role="button"]'),
  ).find((element) => element.textContent?.includes("Sign Out"));
  await act(async () => (signOutAgain as HTMLElement).click());
  await clickButton("Sign Out");
  expect(host.textContent).toContain("Login");
  expect(store.getState().auth.user).toBeNull();
  expect(store.getState().books.collection.loaded).toBe(false);
  await act(async () => {
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await act(async () => {
    await vi.waitFor(() =>
      expect(store.getState().books.collection.loaded).toBe(true),
    );
  });
  expect(host.textContent).toContain("My Collection");
  expect(store.getState().books.books.ids).toEqual([]);
  await act(async () => fromUser.idleTimeoutElapsed.publish());
  expect(host.textContent).toContain("Login");
  expect(store.getState().auth.user).toBeNull();
});
