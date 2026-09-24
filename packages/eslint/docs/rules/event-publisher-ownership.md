# Enforcing event publisher ownership

An event should normally have one publishing boundary. Repeated publication of
the same event in one module can indicate a command shared across callers.

```ts
// Reported
BooksPageEvents.entered.publish();
BooksPageEvents.entered.publish();

// Accepted
BooksPageEvents.entered.publish();
BooksPageEvents.bookSelected.publish({ id: "42" });
```

This rule checks one source file at a time, as ESLint rules do not reliably
perform project-wide ownership analysis. A workspace-level analysis is required
to detect publishers in separate files.
