import { createElement, type ReactNode } from "react";
import { Provider } from "react-redux";
import type { Evst } from "./store.js";

/** Supplies the EVST store to component Views through React Redux context. */
export function EvstProvider({
  evst,
  children,
}: {
  evst: Evst;
  children?: ReactNode;
}) {
  return createElement(Provider, { store: evst.store, children });
}
