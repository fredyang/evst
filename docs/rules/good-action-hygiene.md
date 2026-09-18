# Enforcing event names

The rule checks string literals passed to `createAction` and static event keys in `createEventGroup(source, events)`.

Names must contain a nonempty `[Source]` followed by an event ending in a recognized past-tense word, or a subject followed by `Success` or `Failure`.

```ts
// Accepted
createAction('[Books Page] Entered');
createEventGroup('Books API', { booksLoaded: props(), searchFailure: props() });

// Reported
createAction('[Books Page] Load Books');
createEventGroup('Books Page', { loadBooks: props() });
```

This is a naming heuristic, not a grammatical or architectural guarantee. Dynamic values, computed keys, spreads, aliased calls, and NgRx `createActionGroup` are not checked. No type information is required.
