# Enforcing event publisher ownership

An event should have one publishing boundary. Publishing the same event from
different components can indicate a command shared across callers.

```ts
// collection-page.ts - reported
BooksPageEvents.entered.publish();

// find-book-page.ts - reported
BooksPageEvents.entered.publish();

// Accepted
BooksPageEvents.entered.publish();
BooksPageEvents.bookSelected.publish({ id: "42" });
```

With type-aware linting (`parserOptions.project` or `projectService`), the rule
checks publishers throughout the TypeScript program and reports every conflicting
call in the file being linted. Each message lists all publisher paths with line
and column numbers. Imports with different aliases resolve to the same event.
Without a TypeScript program, the check covers only calls within the current file.

Each reported call produces a separate navigable Problems entry in VS Code when
its file is linted. Paths within the message are plain text. After a publisher is
removed, the diagnostics clear on the next lint of the affected files. VS Code
may retain diagnostics in other files until those files are revalidated; a
project-wide ESLint run checks all files against the updated program. Declaration
files and external libraries are excluded, but other files included by the
TypeScript project are checked even if ESLint ignores them.
