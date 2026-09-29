import eventHygiene from "./rules/event-hygiene";
import eventPublisherOwnership from "./rules/event-publisher-ownership";
import noSequentialEventPublishes from "./rules/no-sequential-event-publishes";
import noUnpublishedEvents from "./rules/no-unpublished-events";
import noUnsubscribedEvents from "./rules/no-unsubscribed-events";
import noUnusedViews from "./rules/no-unused-views";
import requireTaskEvent from "./rules/require-task-event";
import requireTaskEventSuppressionReason from "./rules/require-task-event-suppression-reason";

/** ESLint plugin providing rules for event-oriented NgRx applications. */
const plugin = {
  /** Package identity reported to ESLint. */
  meta: { name: "@ngrx-sugar/eslint", version: "0.1.0" },
  /** Available rules, keyed by their names within the plugin namespace. */
  rules: {
    "event-hygiene": eventHygiene,
    "event-publisher-ownership": eventPublisherOwnership,
    "no-sequential-event-publishes": noSequentialEventPublishes,
    "no-unpublished-events": noUnpublishedEvents,
    "no-unsubscribed-events": noUnsubscribedEvents,
    "no-unused-views": noUnusedViews,
    "require-task-event": requireTaskEvent,
    "require-task-event-suppression-reason": requireTaskEventSuppressionReason,
  },
  configs: {
    ngrx: {
      rules: {
        "ngrx-sugar/event-hygiene": "error",
        "ngrx-sugar/event-publisher-ownership": "warn",
        "ngrx-sugar/no-sequential-event-publishes": "warn",
      },
    },
    sugar: {
      rules: {
        "ngrx-sugar/event-hygiene": "error",
        "ngrx-sugar/event-publisher-ownership": "warn",
        "ngrx-sugar/no-sequential-event-publishes": "warn",
        "ngrx-sugar/no-unpublished-events": "warn",
        "ngrx-sugar/no-unsubscribed-events": "warn",
        "ngrx-sugar/no-unused-views": "warn",
        "ngrx-sugar/require-task-event": "warn",
        "ngrx-sugar/require-task-event-suppression-reason": "error",
      },
    },
  },
};

export = plugin;
