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
  const tasks = (build) => build((...args) => args);
  const event = () => ({});
  tasks((on) => ({ load: on(event, () => source$) }));
`;

new RuleTester({ languageOptions: { parser } }).run(
  "require-task-event",
  rule,
  {
    valid: [
      taskWithEvent,
      `on(() => source$);`,
      `tasks((on) => ({ load: on(event, () => source$, { dispatch: false }) }));`,
    ],
    invalid: [
      {
        code: `tasks((on) => ({ startup: on(() => source$) }));`,
        errors: [{ messageId }],
      },
      {
        code: `tasks((on) => ({ startup: on(source$, { dispatch: false }) }));`,
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
    `// eslint-disable-next-line evst/require-task-event -- Subscribes to an external socket for the application lifetime.\ntasks((on) => ({ startup: on(() => source$) }));`,
    `// eslint-disable-next-line no-console\nconsole.log("allowed");`,
  ],
  invalid: [
    {
      code: `// eslint-disable-next-line evst/require-task-event\ntasks((on) => ({ startup: on(() => source$) }));`,
      errors: [{ messageId: suppressionReasonMessageId }],
    },
  ],
});
