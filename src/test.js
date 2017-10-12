module.exports = function(Types) {
    var _ = require('lodash'),
        Lib = require('./types-lib');

    var types = Types;

    var testErr = function(func) {
        var err = null,
            args = _.slice(arguments, 1);

        try {
            func.apply(null, args);
        } catch (e) {
            if (e.message && e.message.indexOf(Lib.EXC_PREFIX) == 0) {
                err = e;
            }
        }

        if (!err) {
            throw new Error('Test failed to throw expected error');
        } else {
            console.log('Threw error as expected:', err.message);
        }
    };

    var test = function(func) {
        var retval = func.apply(null, _.slice(arguments, 1));
        if (typeof retval == 'undefined') {
            throw new Error("Test returned undefined");
        }
    };

    test(types.num, 1);
    testErr(types.num, 'Not a number');
    test(types.num, Infinity);

    test(types.num, 5.5, {gt: 5, lt: 6});
    testErr(types.num, 10, {ne: 'not a number'});
    test(types.num, 25, {ne: null}); // the null means disregard the option.
    test(types.nonNegInt, 10);
    testErr(types.nonNegInt, 10.4);
    testErr(types.real, Infinity, {gt: 1000});
    test(types.num, Infinity, {gt: 0});
    test(types.int, 10, {lt: Infinity});


    test(types.str, 'abc');
    testErr(types.nonEmptyStr, '');
    test(types.arrOf, [1,2,3,'a',function(){}], 'posInt|str|func');
    testErr(types.arrOf, [1, 2, {}], 'num');

    test(types.shape, {
        a: true,
        b: 1.5,
        x: 12,
        y: [1,2,3],
        z: 'blah blah',
        fn: function() {}
    }, {
        a: 'bool',
        b: 'real',
        x: 'any',
        y: 'arrLike',
        z: 'nonEmptyStr',
        fn: 'int|func'
    });

    // Rejects since "x" is not in the value.
    testErr(types.shape, {
        a: true,
        b: 1.5,
        // x: 12,
        y: [1,2,3],
        z: 'blah blah',
        fn: function() {}
    }, {
        a: 'bool',
        b: 'real',
        x: 'any',
        y: 'arrLike',
        z: 'nonEmptyStr',
        fn: 'int|func'
    });

    // Verify the distinction between arr and arrLike
    var arrLike = (function() { return arguments; })(1,2,3),
        arr = [1,2,3];

    testErr(types.arr, arrLike);
    test(types.arrLike, arrLike);
    test(types.arrLike, arr);
    test(types.arrLike, {length: 1});
    testErr(types.arrLike, {length: -1});

    test(types.oneOfType, function() {}, ['func', 'int']);

    // oneOfType with partial args for a member.
    test(types.oneOfType, 'abc', [['str', {minLength: 2}]]);
    testErr(types.oneOfType, 'a', [['str', {minLength: 2}]]);

    // oneOfType with the types specified in a string.
    test(types.oneOfType, [1,2,3], 'int|func|nonEmptyArr');

    // Test partial args passed to oneOfType as the 4th arg.
    // In this case, an error should be thrown since they
    // should trigger an error.
    testErr(types.oneOfType, [], ['arr'], [{minLength: -1}]);

    test(types.shape, {
             a: true,
             b: 1.5,
             x: 12,
             y: [1,2,3],
             z: 'blah blah',
        fn: function() {}
    }, {
        a: 'bool',
        b: 'real',
        x: 'any',
        y: 'arrLike',
        z: 'nonEmptyStr',
        fn: 'int|func'
    });

    test(types.shapeIn, {a: 1}, {a: 'int', b: 'arr'});
    test(types.shapeIn, {a: 1, b: 2}, {a: 'any', b: 'any'});
    testErr(types.shapeIn, {a: 1, b:2}, {a: 'int'});
    test(types.shapeExact, {a: 1, b: 'x'}, {a: 'int', b: 'str'});
    testErr(types.shapeExact, {a: 1}, {a: 'int', b: 'str'});
    testErr(types.shapeExact, {a: 1, b: 'x'}, {a: 'int'});

    test(types.shapeLike, {a: 1}, {b: 'arr'});
    testErr(types.shapeLike, {a: 1, x: 2}, {x: 'str'});

    test(types, 'num', 1);

    test(types.date, new Date(2000, 1, 1));
    testErr(types.date, new Date(NaN)); // Invalid dates rejected.

    test(types.plainObject, {a: 1, b: 2});
    test(types.object, new function() {});
    testErr(types.plainObject, new function() {});

    test(types.inKeys, 'a', {a: 1, b: 2, c: 3});
    test(types.inOwnKeys, 'a', {a: 1, b: 2, c: 3});
    test(types.inKeys, 'push', []);
    testErr(types.inOwnKeys, 'push', []);

    test(types.regex, /im-a-regex/);
    test(types.regex, new RegExp());
    testErr(types.regex, 'im a string');

    test(types.str, 'abc', {minLength: 1});
    testErr(types.str, 'abc', {minLength: 10});
    test(types.str, 'abc', {minLength: 3});
    testErr(types.str, 'abc', {minLength: 4});

    test(types.str, 'abc', {maxLength: 10});
    testErr(types.str, 'abc', {maxLength: -1});
    test(types.str, 'abc', {maxLength: 3});
    testErr(types.str, 'abc', {maxLength: 2});

    testErr(types.str, 'abc', {minLength: -1});
    testErr(types.arr, [], {minLength: -0.5});

    var derivedType = types.makeDerivedType('strWithAtLeast3Chars',
                                              'str',
                                              {minLength: 3});

    test(derivedType, 'abc');
    testErr(derivedType, 'ab');
    testErr(derivedType, 888);


    // Test arrOf() being invoked with a type object rather than the name
    // of one.
    test(types.arrOf, ['xxxx', 'yyyy', 'zzzz'], derivedType);

    test(types.makeDerivedType, 'NoPartialArgs', 'int');

    testErr(types.makeDerivedType, 'MyType', 'BaseTypeThatDoesntExist', 1, 2, 3);

    test(types.shape, {
        a: 1,
        b: {x: [1,2,3], y: 'abc'}
    }, {
        a: 'int',
        b: {x: 'nonEmptyArr', y: 'str'}
    });

    testErr(types.shape, {
        a: 1,
        b: {x: function(){}, y: 'abc'}
    }, {
        a: 'int',
        b: {x: 'func', y: 'int'}
    });

    // Test passing arguments to a shape type (by using an
    // array) - require "s" be a string with minimum length
    // of 3.
    testErr(types.shape, {s: 'a'}, {s: ['str', {minLength: 3}]});

    // Should fail since the inner array is empty.
    testErr(types.shape, {s: 'a'}, {s: []});

    // Should fail since the inner array's first element is not
    // a valid type name.
    testErr(types.shape, {s: 'a'}, {s: ['NotAValidTypeName!!!!']});

    // test arrOf with partial args
    test(types.arrOf, ['a', 'b', 'c'], ['str', {maxLength: 1}]);

    testErr(types.arrOf, ['a', 'b', 'ccc'], ['str', {maxLength: 1}]);


    // Test shape using type names refs
    test(types.shape, {points: [{x: 1, y: 2}, {x: 2, y: 3}]}, {
        points: ['arrOf', ['shape', {x: 'int', y: 'int'}]]
    });

    // Test the nested type name ref (['int', {lt: 2}])
    testErr(types.shape, {points: [{x: 1, y: 2}, {x: 2, y: 3}]}, {
        points: ['arrOf', ['shape',
                           {x: ['int', {lt: 2}],
                            y: 'int'}]]
    });
};
