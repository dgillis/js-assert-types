# assert-types

A way to perform type assertions with detailed error messages in development but do nothing in production.

## Install

With [npm](http://npmjs.org) do:

```sh
npm install assert-types
```

## Examples

```js
var t = require('assert-types');

// Basic types.
t.num(123);  // Returns 123.
t.num("abc");  // Error - expected a number, got: abc
t.int(1.5);  // Error - expected an integer, got: 1.5
t.num(123, {ge: 1000});  // Error - expected a number >= 1000, got: 123
t.str("abc");  // Returns "abc"
t.bool(false);  // Returns false
t.arr([1, 2, 3]);  // Returns [1, 2, 3]

// Shape type - requires a second argument giving an object type specification:
t.shape({x: 1, y: false}, {x: 'num', y: 'str'})
// Error - shape did not validate at "y" - expected a string, got: false

// ArrOf - requires a second argument giving a type specification for array members:
t.arrOf([1,2,3], 'int');  // Returns [1, 2, 3]
t.arrOf([1, null, 3], 'int');  // Error
```

## API

### `AssertTypes.<typeName>(value, ...typeOptions)`

In non-production environment, check if value matches typeName subject to any typeOptions
and, if so, return value. Otherwise, throw an Error describing what went wrong.

In production environments, immediately return value without any type checking.

The full list of available types can be viewed [here](https://github.com/dgillis/js-assert-types/src/type-tests.js).
