/* !
 * assert-types
 * Copyright(c) 2017 Duncan Gillis <d@duncangillis.com>
 * MIT Licensed
 */
var Lib = (process.env.NODE_ENV === 'production') ? null : require('./types-lib');

var TypeNamesArray = [
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

var Identity = function(x) { return x; };

function initJsAssertTypes(forceProduction) {
    var AssertTypes = function(typeName, value) {
        if (process.env.NODE_ENV !== 'production' && !forceProduction) {
            var err = Lib.getErrorForTypesFunction.apply(null, arguments);
            if (err && Lib.ConfigSettings.debugOnError) {debugger;}
            if (err) { throw err; }
        }
        return value;
    };

    AssertTypes._configure = function(name, value) {
        if (process.env.NODE_ENV !== 'production' && !forceProduction) {
            Lib.ConfigSettings[name] = value;
        }
    };

    for (var i = 0, len = TypeNamesArray.length; i < len; i++) {
        var name = TypeNamesArray[i];
        AssertTypes[name] = (process.env.NODE_ENV === 'production' || forceProduction) ?
                Identity : Lib.makeTypeFuncForTestFunc(name);
    }

    return AssertTypes;
}


var AssertTypes = initJsAssertTypes();

var ProductionAssertTypes = (process.env.NODE_ENV === 'production') ?
        AssertTypes : initJsAssertTypes(true);


export {ProductionAssertTypes as Production};
export default AssertTypes;
