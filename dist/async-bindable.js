'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /**
                                                                                                                                                                                                                                                                   * Created by istrauss on 8/30/2017.
                                                                                                                                                                                                                                                                   */

exports.asyncBindable = asyncBindable;

var _lodash = require('lodash.get');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaultOptions = {
    pendWith: undefined,
    resolveWith: function resolveWith(v) {
        return v;
    },
    rejectWith: function rejectWith(e) {
        return e;
    }
};

/**
 * This decorator can be used alone or along with @computedFrom. If are using this decorator along with @computedFrom, it must be declared ABOVE the computedFrom.
 * @param {{}} options
 * @param {*} [options.pendWith=undefined] - primitive.
 * @param {*} [options.resolveWith=undefined] - primitive or function.
 * @param {*} [options.rejectWith=undefined] - primitive or function.
 * @returns {Function}
 */
function asyncBindable(options) {
    var _options = _extends({}, defaultOptions, options);

    return function (target, name, descriptor) {
        if (!Promise || typeof Promise.prototype.then !== 'function') {
            return;
        }

        if (!descriptor.get) {
            throw new Error('asyncBindable decorator must be used on a virtual getter.');
        }

        descriptor.get.dependencies = descriptor.get.dependencies || [];

        var originalGetter = descriptor.get;

        // Async bindings are particularly sensitive to being called repeatedly (because they will likely contain network calls).
        // To mitigate this we want to memoize the getter so that it will only be really called when there is a change in the dependencies.
        var memoizedGetter = memoize(name, originalGetter);

        // We also want to ensure that the getter returns the appropriate values in the case that the result is a promise.
        descriptor.get = function () {
            var _this = this;

            var value = memoizedGetter.call(this);

            if (value instanceof Promise) {
                if (value.isPending()) {
                    value.then(function (v) {
                        //Change the value so any bindings are recalculated
                        _this[incrementProp(name)] = _this[incrementProp(name)] + 1 || 1;
                    }).catch(function (e) {
                        //Change the value so any bindings are recalculated
                        _this[incrementProp(name)] = _this[incrementProp(name)] + 1 || 1;
                    });

                    return _options.pendWith;
                }

                if (value.isFulfilled()) {
                    return typeof _options.resolveWith === 'function' ? _options.resolveWith(value.value()) : _options.resolveWith;
                }

                if (value.isRejected()) {
                    return typeof _options.rejectWith === 'function' ? _options.rejectWith(value.error()) : _options.rejectWith;
                }
            }

            return value;
        };

        descriptor.get.dependencies = originalGetter.dependencies.concat([incrementProp(name)]);
    };
}

function incrementProp(name) {
    return '_asb_' + name;
}

function memoize(name, getter) {
    var deps = getter.dependencies.slice();

    return function () {
        var _this2 = this;

        this._memoizedGettersData = this._memoizedGettersData || {};
        this._memoizedGettersData[name] = this._memoizedGettersData[name] || {
            depsValueMap: {}
        };

        var getterData = this._memoizedGettersData[name];

        var depsArrTheSame = deps.reduce(function (result, dep) {
            return result && (0, _lodash2.default)(_this2, dep) === getterData.depsValueMap[dep];
        }, true);

        if (!getterData.hasOwnProperty('prevGetterValue') || !depsArrTheSame) {
            deps.forEach(function (dep) {
                getterData.depsValueMap[dep] = (0, _lodash2.default)(_this2, dep);
            });

            getterData.prevGetterValue = getter.call(this);
        }

        return getterData.prevGetterValue;
    };
}