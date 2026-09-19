# NgRx Sugar utilities

Typed event creators and reducer state inference for NgRx 22.

## Creating events

```ts
import { emptyProps, props } from '@ngrx/store';
import { createEventGroup, createEventSource } from '@ngrx-sugar/store';

const events = createEventGroup('Books Page', {
  entered: emptyProps(),
  bookSelected: props<{ id: string }>(),
});

// { type: '[Books Page] Book Selected', id: '42' }
events.bookSelected({ id: '42' });

const api = createEventSource('Books API');
const loaded = api.createEvent('loaded', props<{ ids: string[] }>());
```

Keys remain camelCase while action labels split words and preserve acronyms. Keys must start with a lowercase ASCII letter and contain only ASCII letters and digits. Payload creator functions are also supported; their parameters require explicit types.

## Inferring reducer state

```ts
import { createReducer } from '@ngrx/store';
import type { ReducerState } from '@ngrx-sugar/store';

const reducer = createReducer({ count: 0 });
type State = ReducerState<typeof reducer>; // { count: number }
```

`ReducerState` also supports combined reducers and produces `never` for non-reducer types.

## Developing

From the project root, `npm install` installs workspace dependencies and `npm test --workspace @ngrx-sugar/store` builds the package, checks test types, and runs the utility tests. `npm pack --workspace @ngrx-sugar/store` produces an installable archive.
