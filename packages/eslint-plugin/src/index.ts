import eventPublisherOwnership from "./rules/event-publisher-ownership";
import eventGroupSourcePrefix from "./rules/event-group-source-prefix";
import noDuplicateEventHandlers from "./rules/no-duplicate-event-handlers";
import noSequentialEventPublishes from "./rules/no-sequential-event-publishes";
import noUnpublishedEvents from "./rules/no-unpublished-events";
import noUnsubscribedEvents from "./rules/no-unsubscribed-events";
import noUnusedViews from "./rules/no-unused-views";
import noViewSubscription from "./rules/no-view-subscription";
import noViewSubscriptionSuppressionReason from "./rules/no-view-subscription-suppression-reason";
import requireTaskEvent from "./rules/require-task-event";
import requireTaskEventSuppressionReason from "./rules/require-task-event-suppression-reason";

/** ESLint plugin providing rules for event-oriented NgRx applications. */
const plugin = {
  /** Package identity reported to ESLint. */
  meta: { name: "@evst/eslint-plugin", version: "0.1.0" },
  /** Available rules, keyed by their names within the plugin namespace. */
  rules: {
    "event-publisher-ownership": eventPublisherOwnership,
    "event-group-source-prefix": eventGroupSourcePrefix,
    "no-duplicate-event-handlers": noDuplicateEventHandlers,
    "no-sequential-event-publishes": noSequentialEventPublishes,
    "no-unpublished-events": noUnpublishedEvents,
    "no-unsubscribed-events": noUnsubscribedEvents,
    "no-unused-views": noUnusedViews,
    "no-view-subscription": noViewSubscription,
    "no-view-subscription-suppression-reason":
      noViewSubscriptionSuppressionReason,
    "require-task-event": requireTaskEvent,
    "require-task-event-suppression-reason": requireTaskEventSuppressionReason,
  },
  configs: {
    ngrx: {
      rules: {
        "evst/event-publisher-ownership": "warn",
        "evst/no-duplicate-event-handlers": "warn",
        "evst/no-sequential-event-publishes": "warn",
      },
    },
    evst: {
      rules: {
        "evst/event-group-source-prefix": "warn",
        "evst/event-publisher-ownership": "warn",
        "evst/no-sequential-event-publishes": "warn",
        "evst/no-unpublished-events": "warn",
        "evst/no-unsubscribed-events": "warn",
        "evst/no-unused-views": "warn",
        "evst/no-view-subscription": "warn",
        "evst/no-view-subscription-suppression-reason": "error",
        "evst/require-task-event": "warn",
        "evst/require-task-event-suppression-reason": "error",
      },
    },
  },
};

export = plugin;
