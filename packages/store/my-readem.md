# EVST

table of content

@ai: please build up the table on content here

1. why `'ngrx-entifiy`
2. ..

embed full source code url

## Why `evst`

@ai: I want to talk to about the intention of the this library, please
expand my idea.

1. Fundermentially, NgRx has an event driven achitecture inside. It separate
   traditonal object.method with action and handler. However, lots of adopter do
   not understand the power of this separation, continue to to use command driven
   mindset, and lots of ngrx project fail eventually because of this.

NgRx team clearly understand this,

> Actions are one of the main building blocks in NgRx. Actions express unique
> events that happen throughout your application. From user interaction with the
> page, external interaction through network requests, and direct interaction with
> device APIs, these and more events are described with actions.

However, they never stress this enough, that Treating Action as events is key of
the success of the NgRx project. NgRx does not force user to use event-driven style
to use NgRx. And most developer tend to model the action using command, and they
get it wrong at the first step.

This `evst` make event-first as the core value.

2. NgRx is techincal sound framework, it has loose API to to put things
   together, people call it boilterplate. Such as you need to create actions,
   reducer, selector, effects, register reducer, and effect as provider, ect.
   Although this has been greatly improved with function like createActionGroup,
   createFeature, but they feels like still not cohesive , and I feelt like it is
   ducktape.

`evst` want to present them together in a more unified way, using fluet API. and
hide some of the concept like store, selector, dispath.

## Coding workflow

As the name of the library suggest, the the coding model revolve 4 object, `Event`, `View`, `State` and `Task`
The following show the relationship and their method.

![](../../images/ngrx-evntify-coding-model.png)

### Provider Code

#### Modeling event

Event describe what happened to the publisher, publisher publish an event without who
is subscribe to the event, and how it is being handle.

```ts
export const fromSource = events('Source', {
  eventName1: props<Type1>(),
  eventName2: props<Type2>(),
});

for example

export const fromBooksPage = events("Books Page", {
  entered: emptyProps(),
  bookSelected: props<{ id: string }>(),
});
```

event variable has naming convention `fromSource`, this is ensure that
developer is aware that event belongs to the event source, not event handler.
Which is oposite of command. Show example of bad naming.

#### Modeling state

1. create state witih initliazed value of strongly type interface
2. expose view to be consumed by componnet
3. handle event with event handler

All these can be defined in one fluid api, @ai: please show an example below

```ts
const xxxState = state(stateName, initialState);
.withViews(xxx)
.on(event, fn)
```

#### define task collection

Task collection subscribe events with task funtion
We use similar syntax with state `on(xx, fn)`

@ai: give me practical example

```ts
const taskCollection = tasks((on) => ({
  doThis: on(fromXXx.event1, fn1),
  doThat: on(fromXXx.event1, fn1),
}));
```

### Povider code

@ai: expand this part

When we discuss how to create events, we should have some naming convention.

When use publish event, we also have some eslint restriction
such, we cannot publish two event in sequence, we cannot
publish one event in more than one place. This rules are
essntial to implment event driven state management. Just
a nice naming of event, does not make it event driven, following
these rules, really make it event-driven.

```ts
export class BooksPageComponent implements OnInit {
  readonly books = booksViews.books.signal();
  readonly loading = booksViews.loading.signal();
  readonly error = booksViews.error.signal();
  readonly selectedBook = booksviews.selectedBook.signal();

  ngOnInit() {
    fromBooksPage.entered.publish();
  }

  selectBook(id: string) {
    fromBooksPage.bookSelected.publish({ id });
  }
}
```

### registering state

1. one time setup

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    // this is one time setup
    provideEvst({
      runtimeChecks: {
        strictStateSerializability: true,
        strictActionSerializability: true,
        strictActionWithinNgZone: false,
        strictActionTypeUniqueness: true,
      },
      devtools: { name: "NgRx Book Store App" },
    }),
  ],
};
```

2. provide state and task one by one

```ts
// or register state and taskCollection separately
provider: [state.provide(), taskCollection.provide()];
```

3. provide state and tasks with bundle

```ts
// root.bundle.ts
export const rootBundle = bundle(authState, authTasks, coreState, coreTasks);

// appconfig.ts
provider: [rootBundler.provide()];
```
