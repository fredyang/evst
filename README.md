# EVST

**Event, View, State, Task**

A minimalist, event-driven programming model for applications using the Redux
pattern, with implementations for Angular/NgRx and React/Redux Toolkit.

| Package               | Integration                              | Guide                                            |
| --------------------- | ---------------------------------------- | ------------------------------------------------ |
| `@evst/ngrx-store`    | Angular, NgRx Store and Effects          | [NgRx README](packages/ngrx/README.md)           |
| `@evst/rtk`           | React, Redux Toolkit and React Redux     | [RTK README](packages/rtk/README.md)             |
| `@evst/eslint-plugin` | Shared conventions and framework presets | [ESLint guide](packages/eslint-plugin/README.md) |

- [Why EVST?](#why-evst)
- [Understanding the programming model](#understanding-the-programming-model)
- [Checking conventions with ESLint](#checking-conventions-with-eslint)
- [Choosing an implementation](#choosing-an-implementation)
- [Exploring the Books examples](#exploring-the-books-examples)
- [Developing the workspace](#developing-the-workspace)

## Why EVST?

The Redux pattern is event-driven at its core, but its APIs also allow actions
to act as commands that coordinate specific responses. EVST makes the
event-driven model explicit: Events describe what happened, while State and
Task independently define how the application responds.

Reducers, selectors, side effects, and component interactions are usually
defined through separate APIs and spread across files. Understanding a feature
means tracing the connections between them. EVST organizes these primitives
around four concepts - Event, View, State, and Task - to make those relationships
explicit and feature behavior easier to follow.

EVST's event-driven programming model depends on two essential rules:

1. Each event is published from only one place in the code.
2. Each occurrence is reported with a single event. States and Tasks independently
   decide how to respond.

Breaking either rule can lead back to command-driven code, even with EVST.
`@evst/eslint-plugin` provides checks to help keep these rules from being broken.

## Understanding the programming model

Events and Views connect consumer code with provider code. Components publish
Events to describe what happened and read Views to render state. Provider code
declares how State and Task handle those Events and which Views expose the
resulting state. Components do not need to know how the Events are
handled.

![EVST programming model: components read Views and publish Events; State and Task subscribe to Events through handlers; State exposes Views and Task returns outcome Events.](images/evst.svg)

| Object    | Role                                                                        |
| --------- | --------------------------------------------------------------------------- |
| **Event** | Describes something that happened and belongs to its source.                |
| **View**  | Exposes a read-only projection of state to consumer code.                   |
| **State** | Subscribes to events through pure state handlers and exposes Views.         |
| **Task**  | Subscribes to events, performs side effects, and can return outcome events. |

“Consumer” and “provider” describe programming roles here. They do not refer
specifically to Angular dependency injection or React's Provider component.

A View represents data, not a UI component. State handles Events through pure
state transitions; Tasks handle side effects and can return outcome Events.

See the [NgRx guide](packages/ngrx/README.md) or [RTK guide](packages/rtk/README.md)
for APIs, examples, and registration.

## Checking conventions with ESLint

`@evst/eslint-plugin` checks these conventions through complete `evst-ngrx` and `rtk` presets under the same `evst/` rule namespace.
Shared checks cover source naming, explicit publisher ownership, sequential
publication, duplicate state handlers, and unused events and derived Views.

The `evst-ngrx` preset adds Angular View-subscription and Task-source checks.
Static analysis does not prove every convention: for example, returned Task
outcomes are recognized by usage analysis but are not checked for publisher
ownership. Configuration and limitations are documented in the
[ESLint guide](packages/eslint-plugin/README.md).

## Choosing an implementation

EVST provides a consistent programming interface across NgRx and Redux Toolkit.
Both implementations organize features around Event, View, State, and Task,
while preserving framework-specific integrations such as Angular Signals,
RxJS Observables, and React hooks.

The following table summarizes how each implementation integrates with its framework:

| Concern           | `@evst/ngrx-store`                          | `@evst/rtk`                                               |
| ----------------- | ------------------------------------------- | --------------------------------------------------------- |
| Component Views   | Angular Signals; Observables also available | React Redux hooks                                         |
| State transitions | Immutable NgRx reducers                     | RTK reducers with Immer support                           |
| Tasks             | NgRx Effects and RxJS pipelines             | RTK listener middleware and sync/async handlers           |
| Store setup       | `provideEvstStore()` and feature providers  | `createEvstStore()` returns an RTK store with `provide()` |
| Event publication | `.publish()`                                | `.publish()`                                              |

The [NgRx guide](packages/ngrx/README.md) and
[RTK guide](packages/rtk/README.md) each walk through a Books feature,
including setup, consumer code, registration, linting, and tests.

## Exploring the Books examples

The [Books overview](example.md) describes the example applications.

- [EVST NgRx Books](examples/projects/evst-ngrx-books) can be compared with
  [NgRx Books](examples/projects/ngrx-books) and its
  [standalone version](examples/projects/ngrx-books-standalone).
- [EVST RTK Books](examples/projects/evst-rtk-books) can be compared with
  [RTK Books](examples/projects/rtk-books), using the same React UI and feature
  behavior.

## Developing the workspace

Commands run from the private npm workspace root:

```sh
npm install
npm run build
npm test
```

Individual packages can be checked independently:

```sh
npm test --workspace @evst/ngrx-store
npm test --workspace @evst/rtk
npm test --workspace @evst/eslint-plugin
npm run lint:evst-ngrx-books
npm run lint:evst-rtk-books
```

`npm run docs:api` generates the NgRx API reference at
`packages/ngrx/docs/api/index.html`. `npm run pack:all` creates installable
archives for the workspace packages.

EVST is MIT-licensed; see the [license](LICENSE). The
[third-party notices](NOTICE) acknowledge the NgRx Books examples.
