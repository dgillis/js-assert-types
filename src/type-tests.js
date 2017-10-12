/* !
 * assert-types
 * Copyright(c) 2017 Duncan Gillis <d@duncangillis.com>
 * MIT Licensed
 */
var _ = require('lodash'),
    Lib = require('./types-lib');


var TypeTests = {
    /**
     * Tests whether value is a number (excluding NaN). To also allow for NaN,
     * use the "anyNumber" type test instead.
     */
    num: function(value, options) {
        var fail, len;

        if (!Lib.isNum(value)) {
            return ['expected a Number, got:', value];
        }

        if (options) {
            fail = TypeTests.shapeIn(options, {
                ge: 'num|nul',
                gt: 'num|nul',
                le: 'num|nul',
                lt: 'num|nul',
                eq: 'num|nul',
                ne: 'num|nul',
                indexOf: 'arrLike',
                indexForLength: 'nonNegInt'
            });
            if (fail) { return fail; }

            if (options.indexOf != null) {
                len = options.indexOf.length;

                if (!(Lib.isInt(value) && value >= 0 && value < len)) {
                    return ['expected a valid index for an array of',
                            len, 'elements, got:', value];
                }
            }

            if (options.indexForLength != null) {
                len = options.indexForLength;

                if (!(Lib.isInt(value) && value >= 0 && value < len)) {
                    return ['expected a valid index for an array of',
                            len, 'elements, got:', value];
                }
            }

            if (options.ge != null && !(value >= options.ge)) {
                return ['expected a Number >=' ,options.ge, 'got:',
                        value];
            }

            if (options.gt != null && !(value > options.gt)) {
                return ['expected a Number >' ,options.gt, 'got:',
                        value];
            }

            if (options.le != null && !(value <= options.le)) {
                return ['expected a Number <=' ,options.le, 'got:',
                        value];
            }

            if (options.lt != null && !(value < options.lt)) {
                return ['expected a Number <' ,options.lt, 'got:',
                        value];
            }

            if (options.ne != null && !(value < options.ne)) {
                return ['expected a Number !=' ,options.ne, 'got:',
                        value];
            }

            if (options.eq != null && !(value == options.eq)) {
                return ['expected a Number ==' ,options.eq, 'got:',
                        value];
            }
        }
    },
    /**
     * Tests whether value is a finite number.
     */
    real: function(value, options) {
        var fail = TypeTests.num(value, options);
        if (fail) { return fail; }
        if (!Lib.isReal(value)) {
            return ['expected a real number, got:', value];
        }
    },
    posReal: function(value, options) {
        var fail = TypeTests.real(value, options);
        if (fail) { return fail; }
        if (!(value > 0)) {
            return ['expected a positive real number, got:', value];
        }
    },
    negReal: function(value, options) {
        var fail = TypeTests.real(value, options);
        if (fail) { return fail; }
        if (!(value < 0)) {
            return ['expected a negative real number, got:', value];
        }
    },
    nonNegReal: function(value, options) {
        var fail = TypeTests.real(value, options);
        if (fail) { return fail; }
        if (value < 0) {
            return ['expected a non-negative real number, got:', value];
        }
    },
    nonPosReal: function(value, options) {
        var fail = TypeTests.real(value, options);
        if (fail) { return fail; }
        if (value > 0) {
            return ['expected a non-positive real number, got:', value];
        }
    },
    /**
     * Tests whether value is an integer.
     */
    int: function(value, options) {
        var fail = TypeTests.num(value, options);
        if (fail) { return fail; }
        if (!Lib.isInt(value)) {
            return ['expected an integer, got:', value];
        }
    },
    posInt: function(value, options) {
        var fail = TypeTests.int(value, options);
        if (fail) { return fail; }
        if (!(value > 0)) {
            return ['expected a positive integer, got:', value];
        }
    },
    negInt: function(value, options) {
        var fail = TypeTests.int(value, options);
        if (fail) { return fail; }
        if (!(value < 0)) {
            return ['expected a negative integer, got:', value];
        }
    },
    nonNegInt: function(value, options) {
        var fail = TypeTests.int(value, options);
        if (fail) { return fail; }
        if (value < 0) {
            return ['expected a non-negative integer, got:', value];
        }
    },
    nonPosInt: function(value, options) {
        var fail = TypeTests.int(value, options);
        if (fail) { return fail; }
        if (value > 0) {
            return ['expected a non-positive integer, got:', value];
        }
    },
    nonEmpty: function(value) {
        var len = (value == null) ? value : value.length;
        if (!(len && Lib.isInt(len) && len > 0)) {
            return ['expected length > 0, got length = ' + len +
                   ' from value =', value];
        }
    },
    /**
     * Tests whether value is a string.
     */
    str: function(value, options) {
        var fail;
        if (!_.isString(value)) {
            return ['expected a string, got:', value];
        }
        fail = TypeTests.sized(value, options);
        if (fail) { return fail; }
    },
    nonEmptyStr: function(value, options) {
        return TypeTests.str(value, options) || TypeTests.nonEmpty(value);
    },
    /**
     * All of the array functions accept an optional options object as
     * their last parameter. If this object has "arrayLike" set to true,
     * array-like objects will be accepted as well as arrays.
     */
    arr: function(value, options) {
        var hasOptions = options != null,
            fail, arrayLikeOkay, sizedOptions;

        if (options == null) {
            options = {};
        } else {
            fail = TypeTests.object(options);
            if (fail) { return fail; }
        }

        arrayLikeOkay = !!options.arrayLike;

        if (arrayLikeOkay) {
            if (!Lib.isArrayLike(value)) {
                return ['expected an Array-like object, got:', value];
            }
        } else if (!_.isArray(value)) {
            return ['expected an array, got:', value];
        }

        if (hasOptions) {
            sizedOptions = _.omit(options, 'arrayLike');
            fail = TypeTests.sized(value, sizedOptions);
            if (fail) {
                return fail;
            }
        }
    },
    /**
     * arrOf(value, typeNameRef, [arrayOptions])
     *
     * See the description in _typeNameRef for the valid forms
     * typeNameRef can take on.
     */
    arrOf: function(value, typeName, options) {
        return Lib.checkCollectionOf('array', 'arr',
                                       value, typeName, options);
    },
    nonEmptyArr: function(value, options) {
        return TypeTests.arr(value, options) || TypeTests.nonEmpty(value);
    },
    nonEmptyArrOf: function(value, typeName, options) {
        return (TypeTests.arrOf(value, typeName, options) ||
                TypeTests.nonEmpty(value));
    },
    arrLike: function(value, options) {
        return arrLikeHelper('arr', [value], options);
    },
    arrLikeOf: function(value, typeName, options) {
        return arrLikeHelper('arrOf', [value, typeName], options);
    },
    nonEmptyArrLike: function(value, options) {
        return arrLikeHelper('nonEmptyArr', [value], options);
    },
    nonEmptyArrLikeOf: function(value, typeName, options) {
        return arrLikeHelper('nonEmptyArrOf', [value, typeName], options);
    },
    inArrayIndexes: function(index, arrayLike) {
        var fail = TypeTests.arrLike(arrayLike) || TypeTests.nonNegInt(index);

        if (fail) {
            return fail;
        }

        if (!(0 <= index && index < arrayLike.length)) {
            return ['expected an index for an array of',
                    arrayLike.length, 'elements, got:', index];
        }
    },
    bool: function(value) {
        if (!_.isBoolean(value)) {
            return ['expected a Boolean, got:', value];
        }
    },
    object: function(value) {
        if (!_.isObject(value)) {
            return ['expected an Object, got:', value];
        }
    },
    objectOf: function(value, typeName, options) {
        return Lib.checkCollectionOf('object', 'object',
                                       value, typeName, options);
    },
    plainObject: function(value) {
        if (!_.isPlainObject(value)) {
            return ['expected a plain object, got:', value];
        }
    },
    plainObjectOf: function(value, typeName, options) {
        return Lib.checkCollectionOf('plainObject', 'plainObject',
                                       value, typeName, options);
    },
    domNode: function(value) {
        if (!_.isElement(value)) {
            return ['expected a DOM Node, got:', value];
        }
    },
    regex: function(value) {
        if (!_.isRegExp(value)) {
            return ['expected a RegExp, got:', value];
        }
    },
    date: function(value) {
        if (!Lib.isValidDate(value)) {
            return ['expected a (valid) Date, got:', value];
        }
    },
    func: function(value) {
        if (!_.isFunction(value)) {
            return ['expected a Function, got:', value];
        }
    },
    inKeys: function(key, object) {
        var fail = TypeTests.object(object) || TypeTests.str(key);
        if (fail) { return fail; }
        if (!(key in object)) {
            return ['expected a key from', object, 'got:', key];
        }
    },
    inOwnKeys: function(key, object) {
        var fail = TypeTests.object(object) || TypeTests.str(key);
        if (fail) { return fail; }
        if (!Lib.inOwnKeys(key, object)) {
            return ['expected a (non-inherited) key from', object,
                    'got:', key];
        }
    },
    /**
     * Check that value is one of the elements of the array of allowed
     * values.
     */
    oneOf: function(value, arrayOfValues) {
        if (_.isString(arrayOfValues)) {
            arrayOfValues = arrayOfValues.split('|');
        } else if (!_.isArray(arrayOfValues)) {
            return ['expected an array, got:', arrayOfValues];
        }

        if (!Lib.inArray(value, arrayOfValues)) {
            var retval = ['expected one of'];
            retval.push('[');
            retval.push.apply(retval, arrayOfValues);
            retval.push(']');
            return retval;
        }
    },
    /**
     * Check that value matches one of the type names in the array of type
     * names. The elements of the array may also be arrays in which case
     * the first element should be the typeName and the remaining arguments
     * to pass long to the type function. In this case, these extra
     * arguments will be added BEFORE the typeNameArgs, which will be
     * passed to all type names.
     */
    oneOfType: function(value, typeNamesArr, typeNameArgs) {
        var fail, refs, numRefs, currRef, currRefArgs, i;

        if (_.isString(typeNamesArr)) {
            typeNamesArr = typeNamesArr.split('|');
        } else if (!_.isArray(typeNamesArr)) {
            return ['expected an array (or string separated by "|"',
                    'characters)of type names, got:', typeNamesArr];
        }

        if (typeNamesArr.length == 0) {
            return ['oneOfType(value, array) called with no type names'];
        }

        // Gather all the references from typeNamesArr an ensure they're
        // all valid.
        refs = [];
        _.each(typeNamesArr, function(elem, idx) {
            var name, args, r;

            if (_.isArray(elem)) {
                name = elem[0];
                args = _.slice(elem, 1).concat(typeNameArgs);
            } else {
                name = elem;
                args = typeNameArgs;
            }

            r = Lib.typeNameRefHelper(name, args);

            if (r.fail) {
                fail = ['received invalid typeName at index #' + idx, '('];
                fail.push.apply(fail, r.fail);
                fail.push(')');
                return false;
            } else {
                refs.push(r);
            }
        });

        if (fail) {
            // One of the references was invalid.
            return fail;
        }

        for (i = 0, numRefs = refs.length; i < numRefs; i++) {
            if (Lib.checkTypeNameRef(value, refs[i]) == null) {
                // matched against type at index i.
                return null;
            }
            currRef = refs[i];
        }

        // None matched.
        return ['the given value (=', value, ') did not match any of',
                'the given types:', typeNamesArr];
    },
    /**
     * Test if values is an array-like object and all of its members are
     * contained in allowedValues.
     */
    subsetOf: function(values, allowedValues) {
        if (!Lib.isArrayLike(values)) {
            return ['expected an array of values, got:', values];
        }

        if (!Lib.isArrayLike(allowedValues)) {
            return ['expected an array of allowed values, got:',
                    allowedValues];
        }

        var idx = Lib.missingValueIndex(values, allowedValues);

        if (idx > -1) {
            return ['value at index #' + idx, ' (=', values[idx],
                    ') was not among the allowed values:',
                    allowedValues];
        }
    },
    /**
     * Similar to subsetOf but tests against a hash of object keys rather
     * than array values.
     */
    subsetOfKeys: function(values, object) {
        if (!Lib.isArrayLike(values)) {
            return ['expected an array of values, got:', values];
        }

        if (!_.isObject(object)) {
            return ['expected an object of allowed keys, got:',
                    object];
        }

        var idx = Lib.missingKeyIndex(values, object);

        if (idx > -1) {
            return ['value at index #' + idx, ' (=', values[idx],
                    ") was not found in the object's keys:", object];
        }
    },
    subsetOfOwnKeys: function(values, object) {
        if (!Lib.isArrayLike(values)) {
            return ['expected an array of values, got:', values];
        }

        if (!_.isObject(object)) {
            return ['expected an object of allowed keys, got:',
                    object];
        }

        var idx = Lib.missingOwnKeyIndex(values, object);

        if (idx > -1) {
            return ['value at index #' + idx, ' (=', values[idx],
                    ") was not found in the object's (non-inherited)",
                    "keys:", object];
        }
    },
    /**
     * A "shapeObject" is a hash describing an object. Each (key, value)
     * pair in the shape object describes the allowed values in the the
     * target object at key. The value should be either a type name,
     * multiple type names separated by "|" (indicating any of the types
     * are acceptable), or a "*" (indicating any value, so long as the key
     * exists in the target object).
     */
    shape: function(value, shapeObject) {
        return Lib.checkShape(value, shapeObject, {});
    },
    /**
     * Similar to shape but requires that every key in values have a type
     * specified in the shape object.
     */
    shapeExact: function(value, shapeObject) {
        return Lib.checkShape(value, shapeObject, {extra: false});
    },
    /**
     * Similar to shapeExact but keys from the shapeObject not present in
     * are allowed.
     */
    shapeIn: function(value, shapeObject) {
        return Lib.checkShape(value, shapeObject,
                                {subset: true, extra: false});
    },
    /**
     * Only check keys that are present in both the value and the
     * shapeObject. All others will be ignored.
     */
    shapeLike: function(value, shapeObject) {
        return Lib.checkShape(value, shapeObject,
                                {subset: true, extra: true});
    },
    instanceOf: function(value, func) {
        var fail = TypeTests.func(func);
        if (fail) { return fail; }
        if (value == null || !(value instanceof func)) {
            return ['expected instance of', func, 'got:', value];
        }
        return null;
    },
    /**
     * Trivial type, accepts every value. Useful for specifying required shape
     * members of arbitrary type.
     */
    any: function(value) {
        return null;
    },
    nan: function(value) {
        if (!_.isNaN(value)) {
            return ['expected NaN, got:', value];
        }
    },
    /**
     * Test whether value is any number (including NaN).
     */
    anyNumber: function(value) {
        if (!_.isNumber(value)) {
            return ['expected a Number (including NaN), got:', value];
        }
    },
    pattern: function(value, pattern, flags) {
        var fail = TypeTests.str(value),
            rgx;

        if (fail) { return fail; }

        if (_.isString(pattern)) {
            rgx = new RegExp(pattern, flags);
        } else if (_.isRegExp(pattern)) {
            rgx = pattern;
        } else {
            return ['expected pattern to be either a String or',
                    'a RegExp, got:', pattern];
        }

        if (!rgx.test(value)) {
            return ['expected string to match', rgx, 'got:', value];
        }
    },
    /**
     * Test whether the value is null (NOT undefined). To accept either null or
     * undefined, use "nullish" instead.
     */
    nul: function(value) {
        if (!(value === null)) {
            return ['expected null, got:', value];
        }
    },
    nullish: function(value) {
        if (!(value == null)) {
            return ['expected null (or undefined), got:', value];
        }
    },
    sized: function(value, options) {
        var fail = TypeTests.object((options == null) ? {} : options),
            len, minLen, maxLen, exactLen;

        if (fail) { return fail; }

        len = value.length;

        if (!Lib.isInt(len) && len > -1) {
            return ['expected length to be an integer >= 0, got:',
                    len];
        }

        options = _.defaults({}, options || {}, {minLength: null,
                                                 maxLength: null,
                                                 ofLength: null});

        fail = TypeTests.shapeIn(options, {minLength: 'nonNegInt|nul',
                                       maxLength: 'nonNegInt|nul',
                                       ofLength: 'nonNegInt|nul'});

        if (fail) { return fail; }

        exactLen = options.ofLength;
        minLen = options.minLength;
        maxLen = options.maxLength;

        if (exactLen != null && len != exactLen) {
            return ['expected length ==', exactLen, 'got', len, ':', value];
        }

        if (minLen != null && len < minLen) {
            return ['expected length >=', minLen, 'got', len, ':', value];
        }

        if (maxLen != null && len > maxLen) {
            return ['expected length <=', maxLen, 'got', len, ':', value];
        }
    },
    _typeName: function(value) {
        if (!(value in TypeTests)) {
            return ['invalid typeName:', value];
        }
    },
    /**
     * Internal. Tests whether the value is valid "typeNameRef", which is
     * one of the forms taken by the functions that accept other type
     * names. These forms are:
     *
     *   1) "typeName" (a string that is a type name).
     *   2) "t1|t2|...|tN" (multiple type names separated by "|")
     *   3) typeName object (a type name function)
     *   4) [innerRef, *args] (an array where the first element is a
     *        typeNameRef and the remaining elements are args for that
     *        ref.
     */
    _typeNameRef: function(value, args) {
        var ref = Lib.typeNameRefHelper(value, args || []);
    }
};


_.extend(module.exports, TypeTests)
