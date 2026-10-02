# NgRx-Eventify

table of content

1. why `'ngrx-entifiy`
2. ..

embed full source code url

## Why `ngrx-eventify`

I want to talk to about the intention of the this library

1. Fundermentially, NgRx has an event driven achitecture inside. It separate tranditonal
   object.method with action and handler. However, lots of adopter do not understand
   the power of this separation, continue to to use command driven mindset, and lots
   of ngrx project fail eventually because of this.

NgRx team clearly understand this,

> Actions are one of the main building blocks in NgRx. Actions express unique
> events that happen throughout your application. From user interaction with the
> page, external interaction through network requests, and direct interaction with
> device APIs, these and more events are described with actions.

However, they never stress this enough, that Treating Action as events is key of
the success of the NgRx project. NgRx does not force user to use event-driven style
to use NgRx. And most developer tend to model the action using command, and they
get it wrong at the first step.

This `ngrx-eventify` make event-first as the core value.

2. NgRx is techincal sound framework, it has loose API to to put things together, people call
   it boilterplate. Such as you need to create actions, reducer, selector, effects, register
   reducer, and effect as provider, ect. Although this has been greatly improved with
   function like createActionGroup, createFeature, but they feels like still not cohesive
   , and I feelt like it is ducktape.

   `ngrx-eventify` want to present them together in a more unified way, using fluet API. and
   hide some of the concept like store, selector, dispath.

## Coding model and workflow

The coding model revolve 4 object, `Event`, `State`, `View` and `Task`
The following show the relationship and their method.

![](../../images/ngrx-evntify-coding-model.png)

### Provider Code

#### Modeling event

Event describe what happened to the publisher, publisher publish an event without who
is subscribe to the event, and how it is being handle.

It use the syntax

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

#### define state

state holdes a stongly typed javascript json object.

It has three responsibility

1. expose view from consumer to read
2. subscribe events, which create a new state from the current state and event data

```ts
const xxxState = state(stateName, initialState);
.withViews(xxx)
```

#### define task collection

Task collection subscribe events with task funtion
We use similar syntax with state `on(xx, fn)`

```ts
const taskCollection = tasks((on) => ({
  doThis: on(fromXXx.event1, fn1),
  doThat: on(fromXXx.event1, fn1),
}));
```

### consuming state

```ts
export class BooksPageComponent implements OnInit {
  readonly books = booksState.views.books.signal();
  readonly loading = booksState.views.loading.signal();
  readonly error = booksState.views.error.signal();
  readonly selectedBook = booksState.views.selectedBook.signal();

  ngOnInit() {
    fromBooksPage.entered.publish();
  }

  selectBook(id: string) {
    fromBooksPage.bookSelected.publish({ id });
  }
}
```

### registering state

```ts
// bundle state with tasks and register together
taskCllection.provide();

provider: [state.provide()];

// or register state and taskCollection separately
provider: [state.provide(), taskCollection.provide()];
```

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    // required
    provideStoreEventify({
      runtimeChecks: {
        strictStateSerializability: true,
        strictActionSerializability: true,
        strictActionWithinNgZone: false,
        strictActionTypeUniqueness: true,
      },
      devtools: { name: "NgRx Book Store App" },
    }),

    // provide state
    authState.provide(),
    coreState.provide(),
  ],
};
```

## use eslint to enforce event-driven programming

PLAYER FED NAD DJO MUR TOT
Wawrinka 3 3 6 9 21
Del Potro 7 6 4 3 20
Berdych 6 4 3 6 19
Thiem 5 6 5 2 18
Tsonga 6 4 6 2 18
Ljubičić 3 2 2 3 10
Nishikori 3 2 2 2 9
