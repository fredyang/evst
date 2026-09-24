const { describe, it } = require("node:test");
const { RuleTester } = require("eslint");
const { parser } = require("typescript-eslint");
const { default: rule, messageId } = require("../dist/rules/event-hygiene");
RuleTester.describe = describe;
RuleTester.it = it;
("use strict");
const valid = () => [
  `events('Books/API', { bookLoaded: props(), 'booksLoaded': props(), HTTPRequestFailed: props(), version2Loaded: props() })`,
  `events('Books/API', { ...events, [eventName]: props() })`,
  `events(source, { loadBook: props() })`,
  `events('Books/API', events)`,
  `events()`,
  `events('Collection Page', { entered: emptyProps() })`,
  `events('Books/API', { searchSuccess: props(), 'searchFailure': props(), searchDone: props() })`,
  `export const loadCustomer = createAction('[Customer Page] Customer Load Requested')`,
  `export const loadCustomerSuccess = createAction('[Customer API] Customer Loaded', props<{ customer: Customer }>())`,
  `export const loadCustomerFail = createAction('[Customer API] Customer Load Failed', (error: string) => ({ error, timestamp: +Date.now() }))`,
  ...[
    "Customers Loaded",
    "Entered",
    "entered",
    "Loaded",
    "Done",
    "Message Sent",
    "Work Done",
    "Search Success",
    "Search Failure",
    "Search success",
    "Search failure",
    "Customers Loaded Success",
    "Cache Built",
    "Customer Selected",
    "Customers loaded",
  ].map((event) => `createAction('[Customers Page] ${event}')`),
  `createAction("[Customers Page] Customers Loaded")`,
  `createAction(123)`,
  `export const computed = createAction(iDoNotCrash)`,
  `export const withIncorrectFunction = createActionType('Just testing')`,
];
const invalid = () => [
  {
    code: `events('Book Exists Guard', { loadBook: props(), 'searchBooks': props() })`,
    errors: [
      {
        messageId,
        data: { actionType: "[Book Exists Guard] Load Book" },
        type: "Identifier",
      },
      {
        messageId,
        data: { actionType: "[Book Exists Guard] Search Books" },
        type: "Literal",
      },
    ],
  },
  {
    code: `events('', { entered: emptyProps() })`,
    errors: [{ messageId, data: { actionType: "[] Entered" } }],
  },
  ...[
    "[Customers Page] Load Customers",
    "[Collection Page] Enter",
    "Entered",
    "[] Entered",
    "[ ] Entered",
    "[Customers Page] Customers Load",
    "[Customers Page] Customers Loading",
    "[Customers Page] Success",
    "[Customers Page] Failure",
    "[Customers Page] Search Success Pending",
    "[Customers Page] ",
    "[] Customers Loaded",
    "[ ] Customers Loaded",
    "Customers Loaded",
    "prefix [Customers Page] Customers Loaded",
    "",
  ].map((actionType) => ({
    code: `createAction('${actionType}')`,
    errors: [{ messageId, data: { actionType } }],
  })),
  {
    code: 'createAction("[Customers Page] Load Customers")',
    errors: [
      { messageId, data: { actionType: "[Customers Page] Load Customers" } },
    ],
  },
  {
    code: "createAction('Load Customer')",
    errors: [{ messageId, data: { actionType: "Load Customer" } }],
  },
];
new RuleTester({ languageOptions: { parser } }).run("event-hygiene", rule, {
  valid: valid(),
  invalid: invalid(),
});
