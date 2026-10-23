import type { ESLint, Linter } from "eslint";
import eventPublisherOwnership from "./rules/event-publisher-ownership";
import eventGroupSourcePrefix from "./rules/event-group-source-prefix";
import noDuplicateEventHandlers from "./rules/no-duplicate-event-handlers";
import noSequentialEventPublishes from "./rules/no-sequential-event-publishes";
import noUnpublishedEvents from "./rules/no-unpublished-events";
import noUnsubscribedEvents from "./rules/no-unsubscribed-events";
import noUnusedViews from "./rules/no-unused-views";
import noViewSubscription from "./rules/no-view-subscription";
import noViewSubscriptionSuppressionReason from "./rules/no-view-subscription-suppression-reason";
import requireTaskDispatchFalse from "./rules/require-task-dispatch-false";
import requireTaskEvent from "./rules/require-task-event";
import requireTaskEventSuppressionReason from "./rules/require-task-event-suppression-reason";

const core = {
  rules: {
    "evst/event-group-source-prefix": "warn",
    "evst/event-publisher-ownership": "warn",
    "evst/no-duplicate-event-handlers": "warn",
    "evst/no-sequential-event-publishes": "warn",
    "evst/no-unpublished-events": "warn",
    "evst/no-unsubscribed-events": "warn",
    "evst/no-unused-views": "warn",
  },
} as const;

/** A flat config that registers the EVST plugin and enables its rules. */
type Preset = Linter.Config & {
  name: string;
  plugins: { evst: ESLint.Plugin };
  rules: NonNullable<Linter.Config["rules"]>;
};

/** ESLint plugin providing rules for EVST applications using NgRx or RTK. */
const plugin = {
  /** Package identity reported to ESLint. */
  meta: { name: "@evst/eslint-plugin", version: "0.5.2" },
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
    "require-task-dispatch-false": requireTaskDispatchFalse,
    "require-task-event": requireTaskEvent,
    "require-task-event-suppression-reason": requireTaskEventSuppressionReason,
  },
  /** Self-contained flat configs, suitable for defineConfig's extends array. */
  configs: {} as Record<"rtk" | "evst-ngrx", Preset>,
};

// Register after construction because each preset refers back to this plugin.
// typescript-eslint rule types are adapted to ESLint's public plugin type here.
const registeredPlugin = plugin as unknown as ESLint.Plugin;
Object.assign(plugin.configs, {
  rtk: {
    name: "evst/rtk",
    plugins: { evst: registeredPlugin },
    rules: { ...core.rules },
  },
  "evst-ngrx": {
    name: "evst/evst-ngrx",
    plugins: { evst: registeredPlugin },
    rules: {
      ...core.rules,
      "evst/no-view-subscription": "warn",
      "evst/no-view-subscription-suppression-reason": "error",
      "evst/require-task-dispatch-false": "error",
      "evst/require-task-event": "warn",
      "evst/require-task-event-suppression-reason": "error",
    },
  },
} satisfies Record<"rtk" | "evst-ngrx", Preset>);

export = plugin;
