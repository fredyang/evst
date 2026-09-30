import eventHygiene from "./rules/event-hygiene";
import eventPublisherOwnership from "./rules/event-publisher-ownership";
import eventGroupSourcePrefix from "./rules/event-group-source-prefix";
import noSequentialEventPublishes from "./rules/no-sequential-event-publishes";
import noUnpublishedEvents from "./rules/no-unpublished-events";
import noUnsubscribedEvents from "./rules/no-unsubscribed-events";
import noUnusedViews from "./rules/no-unused-views";
import requireTaskEvent from "./rules/require-task-event";
import requireTaskEventSuppressionReason from "./rules/require-task-event-suppression-reason";

/** ESLint plugin providing rules for event-oriented NgRx applications. */
const plugin = {
  /** Package identity reported to ESLint. */
  meta: { name: "@ngrx-eventify/eslint", version: "0.1.0" },
  /** Available rules, keyed by their names within the plugin namespace. */
  rules: {
    "event-hygiene": eventHygiene,
    "event-publisher-ownership": eventPublisherOwnership,
    "event-group-source-prefix": eventGroupSourcePrefix,
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
        "ngrx-eventify/event-hygiene": "error",
        "ngrx-eventify/event-publisher-ownership": "warn",
        "ngrx-eventify/no-sequential-event-publishes": "warn",
      },
    },
    sugar: {
      rules: {
        "ngrx-eventify/event-hygiene": "error",
        "ngrx-eventify/event-group-source-prefix": "warn",
        "ngrx-eventify/event-publisher-ownership": "warn",
        "ngrx-eventify/no-sequential-event-publishes": "warn",
        "ngrx-eventify/no-unpublished-events": "warn",
        "ngrx-eventify/no-unsubscribed-events": "warn",
        "ngrx-eventify/no-unused-views": "warn",
        "ngrx-eventify/require-task-event": "warn",
        "ngrx-eventify/require-task-event-suppression-reason": "error",
      },
    },
  },
};

export = plugin;
