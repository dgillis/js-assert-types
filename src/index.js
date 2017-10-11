/** @const */
const PROD = (process.env.NODE_ENV === 'production');


/** @const */
var idFunc = function(x) { return x; };


var Lib = PROD ? {} : (function() {
    var _ = require('lodash');

    var arrLikeHelper = function(arrTypeName, args, options) {
        var fail, allArgs;

        if (options == null) {
            options = {arrayLike: true};
        } else {
            fail = TypeTests.object(options);

            if (fail) {
                return fail;
            }

            if (_.has(options, 'arrayLike')) {
                return ["arrayLike type-functions cannot specify the",
                        "'arrayLike' option"];
            }

            options = _.extend({}, options, {arrayLike: true});
        }

        allArgs = _.toArray(args).concat([options]);
        return TypeTests[arrTypeName].apply(null, allArgs);
    };


    var TypeNamesArray = _.keys(TypeTests);



    var EXC_PREFIX = '[types.js]';


    /**
     * Create a new Error object with a formatted and log a description of the
     * error to the console.
     */
    var makeErr = function(funcName, funcArgs, msg) {
        var MAX_CHARS_PER_LINE = 120;

        var prefix = [EXC_PREFIX, '-', funcName + '()'],
            msgArgs = [],
            infoArgs, logArgs, errMsg, errArgs, err, i,
            len;

        funcArgs = _.toArray(funcArgs || []);
        infoArgs = ['-', {func: funcName, args: funcArgs}];

        // Ensure msg is an array (placing it inside on if need be).
        if (msg) {
            if (Utils.isArrayLike(msg) && !_.isString(msg)) {
                if (msg.length > 0) {
                    msgArgs.push('-');
                    msgArgs.push.apply(msgArgs, msg);
                }
            } else {
                msgArgs.push('-');
                msgArgs.push(msg);
            }
        }

        logArgs = prefix.concat(infoArgs).concat(msgArgs);
        log.apply(null, logArgs);

        errArgs = prefix.concat(msgArgs);

        // Ensure all the errArgs components are strings so nulls don't
        // disappear when we join it all together.
        for (i = 0; i < errArgs.length; i++) {
            errArgs[i] = String(errArgs[i]);
        }

        errMsg = errArgs.join(' ');

        return splitTextOverLines(errMsg, MAX_CHARS_PER_LINE);
    };


    var splitTextOverLines = function(text, maxLineLen) {
        var words = text.split(/\s+/g),
            numWords = words.length,
            lines = [],
            wIdx, currWord, currLineWords, currLineLen, retval;

        currLineWords = [];
        currLineLen = 0;
        for (wIdx = 0; wIdx < numWords; wIdx++) {
            currWord = words[wIdx];

            if (!currWord) {
                continue;
            }

            if (currLineLen === 0) {
                currLineWords.push(currWord);
                currLineLen = currWord.length;
            } else if (currLineLen + currWord.length + 1 < maxLineLen) {
                currLineWords.push(currWord);
                currLineLen = currLineLen + 1 + currWord.length;
            } else {
                lines.push(currLineWords.join(' '));
                currLineWords = [currWord];
                currLineLen = currWord.length;
            }
        }

        // Add any words from the final line.
        if (currLineWords.length > 0) {
            lines.push(currLineWords.join(' '));
        }

        retval = lines.join('\n\r');

        return retval;
    };


    var log = function() {
        var parts = _.toArray(arguments);

        // In IE8 (and 9?), console.log is NOT a function (even though it
        // it can be called). The object will throw an error if an non-
        // existent property -- such as "apply" -- is accessed. This
        // try-catch block is used to check if the console is one of
        // these IE8-style consoles where we can't use apply, we use a
        // work around.
        try {
            if (console.log.apply == null) { return; }
        } catch(err) {
            switch (parts.length) {
                case 0:
                    return console.log();
                case 1:
                    return console.log(parts[0]);
                case 2:
                    return console.log(parts[0], parts[1]);
                case 3:
                    return console.log(parts[0], parts[1], parts[2]);
                case 4:
                    return console.log(parts[0], parts[1], parts[2],
                                       parts[3]);
                case 5:
                    return console.log(parts[0], parts[1], parts[2],
                                       parts[3], parts[4]);
                case 6:
                    return console.log(parts[0], parts[1], parts[2],
                                       parts[3], parts[4], parts[5]);
                case 7:
                    return console.log(parts[0], parts[1], parts[2],
                                       parts[3], parts[4], parts[5],
                                       parts[6]);
                case 8:
                    return console.log(parts[0], parts[1], parts[2],
                                       parts[3], parts[4], parts[5],
                                       parts[6], parts[7]);
                default:
                    return console.log(parts[0], parts[1], parts[2],
                                       parts[3], parts[4], parts[5],
                                       parts[6], parts[7],
                                       '<' + (parts.length - 8) + ' truncated>');
            }
        }

        return console.log.apply(console, parts);
    };


    var Utils = {
        pathStr: function(path) {
            var parts = [];
            for (var i = 0, len = path.length; i < len; i++) {
                parts.push('"' + path[i] + '"');
            }
            return parts.join('.');
        },

        checkShape: function(value, shapeObject, options, path) {
            var defaultOptions, fail, typeName, typeNamesArr,
                key, val, found, args, len, i, hasVal, pathStr, ref;

            var inVals, inShape;

            path || (path = []);

            if (!_.isObject(value)) {
                return ['expected an object, got:', value];
            }

            if (!_.isObject(shapeObject)) {
                return ['expected shapeObject to be an object, got:',
                        shapeObject];
            }

            defaultOptions = {
                // If subset is true, keys specified in the shapeObject that
                // are not present in value will be accepted. Otherwise, they
                // will trigger an error.
                subset: false,
                // If extra is true, keys specified in the value that are
                // missing from the shape object will be accepted. Otherwise,
                // they will trigger an error.
                extra: true,
                // If false, inherited properties in value will be ignored.
                includeInherited: false,
                // An optional hash of additional arguments to pass to the type
                // checker for the property with the given name.
                keyTypeArgs: {}
            };

            options = _.defaults({}, options || {}, defaultOptions);

            // Check that no unrecognized (i.e., not specified in the defaults)
            // options were included.
            if (_.find(options, function(val, key) {
                if (!_.has(defaultOptions, key)) {
                    fail = ["Invalid shapeObject option: '" + key + "'"];
                    return true;
                }
            })) {
                return fail;
            }


            for (key in shapeObject) {
                if (!_.has(shapeObject, key)) {
                    // ignore inherited shape object properties.
                    continue;
                }

                typeName = shapeObject[key];

                hasVal = options.includeInherited ?
                         (key in value) : _.has(value, key);

                if (!hasVal) {
                    // Unless the subset option was specified, trigger an error
                    // since the key was not present in the values.
                    if (options.subset) {
                        continue;
                    }

                    return ['ShapeObject missing required value at',
                            Utils.pathStr(path.concat([key]))];
                }

                val = value[key];

                ref = Utils.typeNameRefHelper(typeName,
                                              options.keyTypeArgs[key] || []);
                if (ref.fail) {
                    // The typeName was invalid.
                    fail = ['ShapeObject has invalid typeName at',
                            Utils.pathStr(path.concat([key])), '-'];
                    fail.push.apply(fail, ref.fail);
                    return fail;
                }

                fail = Utils.checkTypeNameRef(val, ref);
                if (fail) {
                    fail = ['ShapeObject did not validate at',
                            Utils.pathStr(path.concat([key])), '-'].concat(fail);
                    return fail;
                }
            }

            // If we're disallowing keys in value that were not specified in
            // the shape object, check for the existence of any such keys.
            if (!options.extra) {
                for (key in value) {
                    if ((options.includeInherited || _.has(value, key)) &&
                    !_.has(shapeObject, key)) {
                        return ['ShapeObject received unexpected key:',
                                Utils.pathStr(path.concat([key]))];
                    }
                }
            }

            return null;
        },

        /**
         * Helper for the common functionality shared by `arrOf` and
         * `objectOf`. The `collectionDesc` should be the name of the
         * expected collection type used in fail messages, while
         * collectionType should be the name of the TypeTests function to
         * test against the collection.
         */
        checkCollectionOf: function(collectionDesc, collectionType,
                                    collection, typeName, options) {
            var fail = TypeTests[collectionType](collection, options),
                ref, refFailAtIndex, idx, idxDesc;

            // validate the collection.
            if (fail) {
                fail = ['invalid ' + collectionDesc + ' value:',
                        collection, '('].concat(fail);
                fail.push(')');
                return fail;
            }

            ref = Utils.typeNameRefHelper(typeName);

            // validate the typeName reference.
            if (ref.fail) {
                fail = ['received invalid type name('];
                fail.push.apply(fail, ref.fail);
                fail.push(')');
                return fail;
            }

            // Ensure that each element of value validates against the
            // typeFuncs.
            _.find(collection, function(value, index) {
                var refFail = Utils.checkTypeNameRef(value, ref);
                if (refFail) {
                    refFailAtIndex = {
                        refFail: refFail,
                        index: index,
                        value: value
                    };
                    return true;
                }
            });

            if (refFailAtIndex) {
                idx = refFailAtIndex.index;
                idxDesc = _.isNumber(idx) ?
                          ('index #' + idx) : ('key "' + idx + '"');
                fail = [collectionDesc, 'value at ' + idxDesc,
                        'is invalid ('];
                fail.push.apply(fail, refFailAtIndex.refFail);
                fail.push(')');
                return fail;
            }

            return null;
        },

        /**
         * Helper for type functions that receive another type as an argument
         * (e.g., oneOfType, arrayOf, etc.)
         *
         * Returns an object of the form
         *   {
         *     fail: <a fail message if the arguments were invalid, else null>,
         *     typeNames: <array of the type names derived from typeName>,
         *     typeFuncs: <array of the fail functions>,
         *     typeArgs: <array of additional arguments to pass to each func>
         *   }
         *
         * the typeFuncs should be used rather than performing a lookup using
         * the typeNames since its possible the function was added as a derived
         * type and so cannot be looked up. If fail is non-null, every other
         * property will be null.
         */
        typeNameRefHelper: function(typeName, typeNameArgs) {
            var typeNamesArr, i, len, currName, funcs, names, arr;

            typeNameArgs = _.toArray(typeNameArgs || []);

            if (_.isPlainObject(typeName)) {
                typeName = ['shape', typeName];
            }

            if (_.isString(typeName)) {
                if (typeName in TypeTests) {
                    // Simplest case, type name is a reference to an existing
                    // type.
                    return {fail: null,
                            typeNames: [typeName],
                            typeFuncs: [TypeTests[typeName]],
                            typeArgs: typeNameArgs};
                }

                // Check if of the form "t1|t2|...|tN" where ti in TypeTests
                if (typeName.indexOf('|') > -1) {
                    funcs = [];
                    names = [];
                    typeNamesArr = typeName.split('|');

                    for (i = 0, len = typeNamesArr.length; i < len; i++) {
                        currName = typeNamesArr[i];

                        if (currName in TypeTests) {
                            names.push(currName);
                            funcs.push(TypeTests[currName]);
                        } else {
                            return {
                                fail: [
                                    "invalid type '" + typeNamesArr[i] + "'",
                                    "referenced in '" + typeName + "'"]
                            };
                        }
                    }

                    // All validated.
                    return {fail: null,
                            typeNames: names,
                            typeFuncs: funcs,
                            typeArgs: typeNameArgs};
                }

                return {fail: ["invalid typeName '" + typeName + "'"]};
            }

            if (_.isFunction(typeName)) {
                // This should be a types.js function.
                if (_.has(typeName, '_typesFailFunc')) {
                    // and it is!
                    return {
                        fail: null,
                        typeNames: [typeName._typesTypeName],
                        typeFuncs: [typeName._typesFailFunc],
                        typeArgs: typeName._typesFailFuncPartialArgs.concat(typeNameArgs)
                    };
                }
                // NOT a types.js function.
                return {fail: ['received a function where either a type name',
                               'or a types object was expected:', typeName]};
            }

            if (_.isArray(typeName)) {
                // This should be of the form [typeName, typeArgs]
                typeNameArgs = _.slice(typeName, 1).concat(typeNameArgs);
                typeName = typeName[0];
                return Utils.typeNameRefHelper(typeName, typeNameArgs);
            }

            return {fail: ["expected a type name, got:", typeName]};
        },

        /**
         * Apply all of the fail funcs from the refs object (as returned by
         * typeNameRefHelper) against the value. The result will be an array
         * of objects of the form {index: IDX, fail: FAIL} for each type func
         * that failed or null if none failed.
         */
        checkTypeNameRef: function(value, refsObject) {
            var names = refsObject.typeNames,
                funcs = refsObject.typeFuncs,
                args = [value].concat(refsObject.typeArgs),
                numFuncs = funcs.length,
                fail, lastFail, idx;

            // There should always be at least one function by definition
            // of typeNameRefHelper.
            if (numFuncs < 1) { throw new Error('assert failed'); }

            for (idx = 0; idx < numFuncs; idx++) {
                fail = funcs[idx].apply(null, args);
                if (fail) {
                    lastFail = fail;
                } else {
                    // one non-fail means the value is valid.
                    return null;
                }
            }

            if (numFuncs == 1) {
                // if there was only one func, use its fail message.
                return lastFail;
            }

            return ['value did match against any of',
                    numFuncs, 'types ("' + names.join('|') + '"):',
                    value];
        },

        combineOptions: function() {

        },

        inKeys: function(value, object) {
            return value in object;
        },

        inOwnKeys: function(value, object) {
            return _.has(object, value);
        },

        inArray: function(value, arrayLike) {
            return _.contains(arrayLike, value);
        },

        /**
         * Return the index of the first value in values that is not present in
         * the array or -1 if every value is in the array.
         */
        missingValueIndex: function(values, arrayLike) {
            for (var i = 0, len = values.length; i < len; i++) {
                if (!Utils.inArray(values[i], arrayLike)) { return i; }
            }
            return -1;
        },
        /**
         * Find the index of the first value that is not present in the object's
         * keys.
         */
        missingKeyIndex: function(values, object) {
            for (var i = 0, len = values.length; i < len; i++) {
                if (!(values[i] in object)) { return i; }
            }
            return -1;
        },
        /**
         * Find the index of the first value not present in the object's own keys.
         */
        missingOwnKeyIndex: function(values, object) {
            for (var i = 0, len = values.length; i < len; i++) {
                if (!Utils.inOwnKeys(values[i], object)) { return i; }
            }
            return -1;
        },

        isNum: function(value) {
            return _.isNumber(value) && !_.isNaN(value);
        },

        isReal: function(value) {
            return Utils.isNum(value) && _.isFinite(value);
        },

        isInt: function(value) {
            return Utils.isReal(value) && value % 1 === 0;
        },

        isValidDate: function(value) {
            return _.isDate(value) && !_.isNaN(value.getTime());
        },

        isArrayLike: function(value) {
            var MAX_SAFE_INTEGER = 9007199254740991;
            var len;
            if (value == null) { return false; }
            len = value.length;
            return (typeof len == 'number' &&
                    len > -1 &&
                    len % 1 == 0 &&
                    len <= MAX_SAFE_INTEGER);
        },

        identity: function(value) { return value; },

        getProperty: function(object, name) { return object[name]; }
    };



    var TypeTests = {
        // Note that this (and all the following number functions) exclude
        // NaN. To include it, use the "nan" or "anyNumber" functions.
        num: function(value, options) {
            var fail, len;

            if (!Utils.isNum(value)) {
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

                    if (!(Utils.isInt(value) && value >= 0 && value < len)) {
                        return ['expected a valid index for an array of',
                                len, 'elements, got:', value];
                    }
                }

                if (options.indexForLength != null) {
                    len = options.indexForLength;

                    if (!(Utils.isInt(value) && value >= 0 && value < len)) {
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
        real: function(value, options) {
            var fail = TypeTests.num(value, options);
            if (fail) { return fail; }
            if (!Utils.isReal(value)) {
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
        int: function(value, options) {
            var fail = TypeTests.num(value, options);
            if (fail) { return fail; }
            if (!Utils.isInt(value)) {
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
            if (!(len && Utils.isInt(len) && len > 0)) {
                return ['expected length > 0, got length = ' + len +
                       ' from value =', value];
            }
        },
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
                if (!Utils.isArrayLike(value)) {
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
            return Utils.checkCollectionOf('array', 'arr',
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
            return Utils.checkCollectionOf('object', 'object',
                                           value, typeName, options);
        },
        plainObject: function(value) {
            if (!_.isPlainObject(value)) {
                return ['expected a plain object, got:', value];
            }
        },
        plainObjectOf: function(value, typeName, options) {
            return Utils.checkCollectionOf('plainObject', 'plainObject',
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
            if (!Utils.isValidDate(value)) {
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
            if (!Utils.inOwnKeys(key, object)) {
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

            if (!Utils.inArray(value, arrayOfValues)) {
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
        //oneOfType: function(value, typeNamesArr) {
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

                r = Utils.typeNameRefHelper(name, args);

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
                if (Utils.checkTypeNameRef(value, refs[i]) == null) {
                    // matched against type at index i.
                    return null;
                }
                currRef = refs[i];
            }

            // None matched.
            return ['the given value (=', value, ') did not match any of',
                    'the given types:', typeNamesArr];
        },
        // Ensure that values is an array-like object and all of its members
        // are contained in allowedValues.
        subsetOf: function(values, allowedValues) {
            if (!Utils.isArrayLike(values)) {
                return ['expected an array of values, got:', values];
            }

            if (!Utils.isArrayLike(allowedValues)) {
                return ['expected an array of allowed values, got:',
                        allowedValues];
            }

            var idx = Utils.missingValueIndex(values, allowedValues);

            if (idx > -1) {
                return ['value at index #' + idx, ' (=', values[idx],
                        ') was not among the allowed values:',
                        allowedValues];
            }
        },
        // Similar to subsetOf but tests against a hash of object keys rather
        // than array values
        subsetOfKeys: function(values, object) {
            if (!Utils.isArrayLike(values)) {
                return ['expected an array of values, got:', values];
            }

            if (!_.isObject(object)) {
                return ['expected an object of allowed keys, got:',
                        object];
            }

            var idx = Utils.missingKeyIndex(values, object);

            if (idx > -1) {
                return ['value at index #' + idx, ' (=', values[idx],
                        ") was not found in the object's keys:", object];
            }
        },
        subsetOfOwnKeys:function(values, object) {
            if (!Utils.isArrayLike(values)) {
                return ['expected an array of values, got:', values];
            }

            if (!_.isObject(object)) {
                return ['expected an object of allowed keys, got:',
                        object];
            }

            var idx = Utils.missingOwnKeyIndex(values, object);

            if (idx > -1) {
                return ['value at index #' + idx, ' (=', values[idx],
                        ") was not found in the object's (non-inherited)",
                        "keys:", object];
            }
        },
        // A "shapeObject" is a hash describing an object. Each (key, value)
        // pair in the shape object describes the allowed values in the the
        // target object at key. The value should be either a type name,
        // multiple type names separated by "|" (indicating any of the types
        // are acceptable), or a "*" (indicating any value, so long as the key
        // exists in the target object).
        shape: function(value, shapeObject) {
            return Utils.checkShape(value, shapeObject, {});
        },
        // Similar to shape but requires that every key in values have a type
        // specified in the shape object.
        shapeExact: function(value, shapeObject) {
            return Utils.checkShape(value, shapeObject, {extra: false});
        },
        // Similar to shapeExact but keys from the shapeObject not present in
        // are allowed.
        shapeIn: function(value, shapeObject) {
            return Utils.checkShape(value, shapeObject,
                                    {subset: true, extra: false});
        },
        // Only check keys that are present in both the value and the
        // shapeObject. All others will be ignored.
        shapeLike: function(value, shapeObject) {
            return Utils.checkShape(value, shapeObject,
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
        // Trivial type, accepts every value.
        any: function(value) {
            return null;
        },
        nan: function(value) {
            if (!_.isNaN(value)) {
                return ['expected NaN, got:', value];
            }
        },
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

            if (!Utils.isInt(len) && len > -1) {
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
            var ref = Utils.typeNameRefHelper(value, args || []);
        }
    };


    var TypesFunc = function(typeName, value) {
        var typeArgs = _.slice(arguments, 2),
            ref, fail;

        if (_.isArray(typeName)) {
            typeArgs = typeArgs.concat(_.slice(typeName, 1));
            typeName = typeName[0];
        }

        ref = Utils.typeNameRefHelper(typeName, typeArgs);
        fail = Utils.checkTypeNameRef(value, ref);

        if (fail) {
            throw new Error(makeErr('type', _.toArray(arguments), fail));
        }

        return value;
    };


    var makeTypeFunc = function(typeName, failFunc, partialArgs) {
        var prefix, typeSuffix, func;

        func = function TypesFunc(value) {
            var testArgs = [value],
                fail;

            if (partialArgs) {
                testArgs.push.apply(testArgs, partialArgs);
            }

            if (arguments.length > 1) {
                testArgs.push.apply(testArgs, _.slice(arguments, 1));
            }

            fail = failFunc.apply(null, testArgs);

            if (fail) {
                throw new Error(makeErr(typeName, arguments, fail));
            }

            return value;
        };

        func._typesTypeName = typeName;
        func._typesFailFunc = failFunc;
        func._typesFailFuncPartialArgs = partialArgs;

        return func;
    };


    var makeDerivedType = function(typeName, baseTypeName) {
        var partialArgs, failFunc, makeObj, func;
        baseTypeName = Types._typeName(baseTypeName); // validate type.
        failFunc = TypeTests[baseTypeName];
        partialArgs = _.slice(arguments, 2);
        return makeTypeFunc(typeName, failFunc, partialArgs);
    };


    return {
        EXC_PREFIX: EXC_PREFIX,
        Types: TypesFunc,
        TypeTests: TypeTests,
        makeTypeFunc: makeTypeFunc,
        makeDerivedType: makeDerivedType
    };
}).call();


var TYPE_NAMES = [
    'num', 'real', 'posReal', 'negReal', 'nonNegReal', 'nonPosReal', 'int',
    'posInt', 'negInt', 'nonNegInt', 'nonPosInt', 'nonEmpty', 'str',
    'nonEmptyStr', 'arr', 'arrOf', 'nonEmptyArr', 'nonEmptyArrOf', 'arrLike',
    'arrLikeOf', 'nonEmptyArrLike', 'nonEmptyArrLikeOf', 'inArrayIndexes',
    'bool', 'object', 'objectOf', 'plainObject', 'plainObjectOf', 'domNode',
    'regex', 'date', 'func', 'inKeys', 'inOwnKeys', 'oneOf', 'oneOfType',
    'subsetOf', 'subsetOfKeys', 'subsetOfOwnKeys', 'shape', 'shapeExact',
    'shapeIn', 'shapeLike', 'instanceOf', 'any', 'nan', 'anyNumber', 'pattern',
    'nul', 'nullish', 'sized', '_typeName', '_typeNameRef'
];


var Types = PROD ?
            function(typeName, value) { return value; } : Lib.Types;


/**
 * Set each of the type functions.
 */
for (var i = 0, len = TYPE_NAMES.length; i < len; i++) {
    Types[TYPE_NAMES[i]] = PROD ? idFunc : Lib.makeTypeFunc(
        TYPE_NAMES[i],
        Lib.TypeTests[TYPE_NAMES[i]]
    );
}


/**
 * makeDerivedType(newTypeName, baseTypeName, *partialArgs)
 *
 * Create a type that will validate itself by calling another type with
 * the given partial arguments. E.g.,
 *
 * strWithAtLeast3Chars = makeDerivedType('StrWithAtLeast3Chars',
 *                                        'str',
 *                                        {minLength: 3});
 */
Types.makeDerivedType = PROD ?
                        function() { return idFunc; } : Lib.makeDerivedType;


module.exports = Types;


false && (function() {
    var _ = require('lodash');


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
}).call();
