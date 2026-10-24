# Reporting unused state views

The rule reports a `.view()` property when no statically named reference to
that view exists in the TypeScript program.

## Failing example

`doubled` is declared but never read through a statically named reference. The
`.view()` property is reported.

```ts
export const counterState = evst("counter", { count: 0 }).view((views) => ({
  doubled: view(views.count, (count) => count * 2),
}));
```

## Passing example

Reading the View from a component makes its usage explicit. The signal is created
in an Angular injection context.

```ts
export const counterState = evst("counter", { count: 0 }).view((views) => ({
  doubled: view(views.count, (count) => count * 2),
}));

@Component({
  selector: "app-counter",
  template: `<output>{{ doubled() }}</output>`,
})
export class Counter {
  protected readonly doubled = counterState.views.doubled.signal();
}
```

Removing the `.view()` property is the appropriate fix when the projection is
unnecessary.

## Analysis scope

The rule is a suggestion. Dynamic property access, such as `authViews[name]`,
suppresses reporting for that views object because static analysis cannot
determine which views it uses.

Direct feature views, exported aliases, and destructured views count as usages.
Repeated `.view()` calls are checked individually, including calls after `.task()`.
Views read through the second callback parameter of fluent `.task((on, views) => ...)`
count as usages in both NgRx and RTK, including when the parameter is renamed.
