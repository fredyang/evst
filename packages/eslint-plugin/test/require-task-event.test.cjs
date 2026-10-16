const { describe, it } = require("node:test");
const { RuleTester } = require("eslint");
const { parser } = require("typescript-eslint");
const {
  default: rule,
  messageId,
} = require("../dist/rules/require-task-event");
const {
  default: suppressionReasonRule,
  messageId: suppressionReasonMessageId,
} = require("../dist/rules/require-task-event-suppression-reason");

RuleTester.describe = describe;
RuleTester.it = it;

const taskWithEvent = `
  const task = (build) => build((...args) => args);
  const event = () => ({});
  task((on) => ({ load: on(event, () => source$) }));
`;

new RuleTester({ languageOptions: { parser } }).run(
  "require-task-event",
  rule,
  {
    valid: [
      taskWithEvent,
      `task((on) => ({ load: on(event, (pipe) => pipe()) }));`,
      `evst("books", {}).task((on, views) => ({ load: on(event, (pipe) => pipe()) }));`,
      `on(() => source$);`,
      `task((on) => ({ load: on(event, () => source$, { dispatch: false }) }));`,
      `task((on) => ({ load: on(event, (pipe) => pipe(), { dispatch: false }) }));`,
      `source$.subscribe(() => on(() => source$));`,
    ],
    invalid: [
      {
        code: `task((on) => ({ startup: on(() => source$) }));`,
        errors: [{ messageId }],
      },
      {
        code: `evst("books", {}).task((on, views) => ({ startup: on(() => source$) }));`,
        errors: [{ messageId }],
      },
      {
        code: `task((on) => ({ startup: on(() => source$, { dispatch: false }) }));`,
        errors: [{ messageId }],
      },
      {
        code: `task((on) => ({ startup: on(source$, { dispatch: false }) }));`,
        errors: [{ messageId }],
      },
    ],
  },
);

new RuleTester({
  languageOptions: { parser },
  plugins: { evst: { rules: { "require-task-event": rule } } },
}).run("require-task-event-suppression-reason", suppressionReasonRule, {
  valid: [
    `// eslint-disable-next-line evst/require-task-event -- Subscribes to an external socket for the application lifetime.\ntask((on) => ({ startup: on(() => source$) }));`,
    `// eslint-disable-next-line no-console\nconsole.log("allowed");`,
  ],
  invalid: [
    {
      code: `// eslint-disable-next-line evst/require-task-event\ntask((on) => ({ startup: on(() => source$) }));`,
      errors: [{ messageId: suppressionReasonMessageId }],
    },
  ],
});
