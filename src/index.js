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

var Types = function(typeName, value) {
    if (process.env.NODE_ENV !== 'production') {
        var err = Lib.getErrorForTypesFunction.apply(null, arguments);
        if (err) { throw err; }
    }
    return value;
};

for (var i = 0, len = TypeNamesArray.length; i < len; i++) {
    var name = TypeNamesArray[i];
    Types[name] = (process.env.NODE_ENV === 'production') ?
            Identity : Lib.makeTypeFuncForTestFunc(name);
}

module.exports = Types;
