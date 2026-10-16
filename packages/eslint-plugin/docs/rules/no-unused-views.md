# Reporting unused state views

The rule reports a `.view()` property when no statically named reference to
that view exists in the TypeScript program.

```ts
export const authState = evst("auth", initialState).view(() => ({
  user: view((state) => state.user), // Reported
  loggedIn: view((state) => Boolean(state.user)),
}));

export const authViews = authState.views;

authViews.loggedIn.signal();
```

The rule is a suggestion. Dynamic property access, such as `authViews[name]`,
suppresses reporting for that views object because static analysis cannot
determine which views it uses.

Direct feature views, exported aliases, and destructured views count as usages.
Repeated `.view()` calls are checked individually, including calls after `.task()`.
Views read through the second callback parameter of fluent `.task((on, views) => ...)`
count as usages in both NgRx and RTK, including when the parameter is renamed.
