var _ = require('lodash'),
    TypeTests = require('./type-tests'),
    EXC_PREFIX = '[types.js]';


var Lib = {
    getErrorForTypesFunction(typeName, value) {
        var typeArgs = _.slice(arguments, 2),
            ref, fail, error

        if (_.isArray(typeName)) {
            typeArgs = typeArgs.concat(_.slice(typeName, 1));
            typeName = typeName[0];
        }

        ref = Lib.typeNameRefHelper(typeName, typeArgs);
        fail = Lib.checkTypeNameRef(value, ref);
        error = fail &&
            (new Error(Lib.makeErr('type', _.toArray(arguments), fail)));

        return error || null;
    },
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
                        Lib.pathStr(path.concat([key]))];
            }

            val = value[key];

            ref = Lib.typeNameRefHelper(typeName,
                                          options.keyTypeArgs[key] || []);
            if (ref.fail) {
                // The typeName was invalid.
                fail = ['ShapeObject has invalid typeName at',
                        Lib.pathStr(path.concat([key])), '-'];
                fail.push.apply(fail, ref.fail);
                return fail;
            }

            fail = Lib.checkTypeNameRef(val, ref);
            if (fail) {
                fail = ['ShapeObject did not validate at',
                        Lib.pathStr(path.concat([key])), '-'].concat(fail);
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
                            Lib.pathStr(path.concat([key]))];
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

        ref = Lib.typeNameRefHelper(typeName);

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
            var refFail = Lib.checkTypeNameRef(value, ref);
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
            return Lib.typeNameRefHelper(typeName, typeNameArgs);
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
            if (!Lib.inArray(values[i], arrayLike)) { return i; }
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
            if (!Lib.inOwnKeys(values[i], object)) { return i; }
        }
        return -1;
    },

    isNum: function(value) {
        return _.isNumber(value) && !_.isNaN(value);
    },

    isReal: function(value) {
        return Lib.isNum(value) && _.isFinite(value);
    },

    isInt: function(value) {
        return Lib.isReal(value) && value % 1 === 0;
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

    getProperty: function(object, name) { return object[name]; },

    /**
     * Create a new Error object with a formatted and log a description of the
     * error to the console.
     */
    makeErr: function(funcName, funcArgs, msg) {
        var MAX_CHARS_PER_LINE = 120;

        var prefix = [EXC_PREFIX, '-', funcName + '()'],
            msgArgs = [],
            infoArgs, logArgs, errMsg, errArgs, err, i,
            len;

        funcArgs = _.toArray(funcArgs || []);
        infoArgs = ['-', {func: funcName, args: funcArgs}];

        // Ensure msg is an array (placing it inside on if need be).
        if (msg) {
            if (Lib.isArrayLike(msg) && !_.isString(msg)) {
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
        Lib.log.apply(null, logArgs);

        errArgs = prefix.concat(msgArgs);

        // Ensure all the errArgs components are strings so nulls don't
        // disappear when we join it all together.
        for (i = 0; i < errArgs.length; i++) {
            errArgs[i] = String(errArgs[i]);
        }

        errMsg = errArgs.join(' ');

        return Lib.splitTextOverLines(errMsg, MAX_CHARS_PER_LINE);
    },

    splitTextOverLines: function(text, maxLineLen) {
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
    },

    log: function() {
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
    },
    makeDerivedType: function(typeName, baseTypeName) {
        var partialArgs, failFunc, makeObj, func;
        baseTypeName = Lib.TypesFunction._typeName(baseTypeName); // validate type.
        failFunc = TypeTests[baseTypeName];
        partialArgs = _.slice(arguments, 2);
        return Lib.makeTypeFunc(typeName, failFunc, partialArgs);
    },

    makeTypeFunc: function(typeName, failFunc, partialArgs) {
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
                throw new Error(Lib.makeErr(typeName, arguments, fail));
            }

            return value;
        };

        func._typesTypeName = typeName;
        func._typesFailFunc = failFunc;
        func._typesFailFuncPartialArgs = partialArgs;

        return func;
    },

    makeTypeFuncForTestFunc(typeName) {
        var testFunc = TypeTests[typeName];
        return Lib.makeTypeFunc(typeName, testFunc);
    }
};


_.extend(module.exports, Lib);
