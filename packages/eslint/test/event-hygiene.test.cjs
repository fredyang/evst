const { describe, it } = require("node:test");
const { RuleTester } = require("eslint");
const { parser } = require("typescript-eslint");
const { default: rule, messageId } = require("../dist/rules/event-hygiene");

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parser } }).run("event-hygiene", rule, {
  valid: [
    `createAction("[Books Page] Load Books")`,
    `createAction("[User] Idle")`,
    `createAction("[User] Idle Timed Out")`,
    `events("Auth", { login: props(), logout: props() })`,
    `events("User", { idle: props(), idleTimedOut: props() })`,
    `events(source, { anything: props() })`,
    `createAction(actionType)`,
  ],
  invalid: [
    {
      code: `createAction("Books loaded")`,
      errors: [{ messageId, data: { eventType: "Books loaded" } }],
    },
    {
      code: `createAction("[] Idle")`,
      errors: [{ messageId, data: { eventType: "[] Idle" } }],
    },
    {
      code: `createAction("[User] ")`,
      errors: [{ messageId, data: { eventType: "[User] " } }],
    },
    {
      code: `events("", { idle: props() })`,
      errors: [{ messageId, data: { eventType: "[]" } }],
    },
    {
      code: `events("   ", { idle: props() })`,
      errors: [{ messageId, data: { eventType: "[]" } }],
    },
  ],
});
