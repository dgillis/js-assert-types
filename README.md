# assert-types

A way to perform type assertions with detailed error messages in development but do nothing in production.

## Install

With [npm](http://npmjs.org) do:

```sh
npm install @dgillis/assert-types
```

## Examples

```js
var t = require('@dgillis/assert-types');

// Basic types.
t.num(123);  // Returns 123.
t.num("abc");  // Error - expected a number, got: abc
t.int(1.5);  // Error - expected an integer, got: 1.5
t.num(123, {ge: 1000});  // Error - expected a number >= 1000, got: 123
t.str("abc");  // Returns "abc"
t.bool(false);  // Returns false
t.arr([1, 2, 3]);  // Returns [1, 2, 3]

// Shape type - requires a second argument giving an object type
// specification:
t.shape({x: 1, y: false}, {x: 'num', y: 'str'})
// Error - shape did not validate at "y" - expected a string, got: false

// ArrOf - requires a second argument giving a type specification for
// array members:
t.arrOf([1,2,3], 'int');  // Returns [1, 2, 3]
t.arrOf([1, null, 3], 'int');  // Error
t.arrOf([1, null, 3], 'int|nul');  // Returns [1, null, 3]
```

## API

### `AssertTypes.<typeName>(value, ...typeOptions)`

In non-production environment, check if value matches typeName subject to any typeOptions
and, if so, return value. Otherwise, throw an Error describing what went wrong.

In production environments, immediately return value without any type checking.

The full list of available types can be viewed [here](https://github.com/dgillis/js-assert-types/blob/master/src/type-tests.js).

### Type Specification

Some of the container types (`arrOf`, `plainObjectOf`, `shape`, etc.) require additional arguments
specifying nested value types. 

#### `AssertTypes.arrOf(value, type)`

The `arrOf` type is used to ensure that value is an array consisting of elements of a certain type. The `type`
parameter should be one of:

* A type name (`"str"`, `"bool"`, `"num"`, etc.)
* Multiple type names separated by `"|"` (`"str|nul"`, `"num|str|arr"`, etc.)
* An array whose first element is a type name and whose remaining elements are arguments for that type
(`["int", {ge: 0}]`, `["arr", {ofLength: 5}]`, etc.)

#### `AssertTypes.plainObjectOf(value, type)`

The `plainObjectOf` type is used to ensure the value is a plainObject whose values all match type. The `type`
parameter is similar to that in `AssertTypes.arrOf()`.

#### `AssertTypes.shape(value, typeShape)`

The `shape` type is used to ensure that value is a plain object consisting of multiple fields of specific
types. The `typeShape` parameter should be an object of the form `{key: type, ...}` where type is similar to
that used by `AssertTypes.arrOf()`. Each `key: type` entry ensures that the key is present in value and that
`value[key]` matches `type`.

## Node

This package is optimized around the type checking being disabled in production use. As such, when
`process.env.NODE_ENV === 'production'`, the library consists of nothing but multiple references to the
identity function and should compress down to less than a kilobite within a suitable build environment.
