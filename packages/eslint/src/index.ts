import eventHygiene from "./rules/event-hygiene";
import eventPublisherOwnership from "./rules/event-publisher-ownership";
import noSequentialEventPublishes from "./rules/no-sequential-event-publishes";
import noUnusedViews from "./rules/no-unused-views";

/** ESLint plugin providing rules for event-oriented NgRx applications. */
const plugin = {
  /** Package identity reported to ESLint. */
  meta: { name: "@ngrx-sugar/eslint", version: "0.1.0" },
  /** Available rules, keyed by their names within the plugin namespace. */
  rules: {
    "event-hygiene": eventHygiene,
    "event-publisher-ownership": eventPublisherOwnership,
    "no-sequential-event-publishes": noSequentialEventPublishes,
    "no-unused-views": noUnusedViews,
  },
};

export = plugin;
