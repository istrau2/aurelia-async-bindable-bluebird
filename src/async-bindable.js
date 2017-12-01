/**
 * Created by istrauss on 8/30/2017.
 */

import _get from 'lodash.get';

const defaultOptions = {
    pendWith: undefined,
    resolveWith: v => v,
    rejectWith: e => e
};

/**
 * This decorator can be used alone or along with @computedFrom. If are using this decorator along with @computedFrom, it must be declared ABOVE the computedFrom.
 * @param {{}} options
 * @param {*} [options.pendWith=undefined] - primitive.
 * @param {*} [options.resolveWith=undefined] - primitive or function.
 * @param {*} [options.rejectWith=undefined] - primitive or function.
 * @returns {Function}
 */
export function asyncBindable(options) {
    const _options = {
        ...defaultOptions,
        ...options
    };

    return function(target, name, descriptor) {
        if (!Promise || typeof Promise.prototype.then !== 'function') {
            return;
        }

        if (!descriptor.get) {
            throw new Error('asyncBindable decorator must be used on a virtual getter.');
        }

        descriptor.get.dependencies = descriptor.get.dependencies || [];

        const originalGetter = descriptor.get;

        // Async bindings are particularly sensitive to being called repeatedly (because they will likely contain network calls).
        // To mitigate this we want to memoize the getter so that it will only be really called when there is a change in the dependencies.
        const memoizedGetter = memoize(name, originalGetter);

        // We also want to ensure that the getter returns the appropriate values in the case that the result is a promise.
        descriptor.get = function() {
            const value = memoizedGetter.call(this);

            if (value instanceof Promise) {
                if (value.isPending()) {
                    value
                        .then(v => {
                            //Change the value so any bindings are recalculated
                            this[incrementProp(name)] = this[incrementProp(name)] + 1 || 1;
                        })
                        .catch(e => {
                            //Change the value so any bindings are recalculated
                            this[incrementProp(name)] = this[incrementProp(name)] + 1 || 1;
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
    const deps = getter.dependencies.slice();

    return function() {
        this._memoizedGettersData = this._memoizedGettersData || {};
        this._memoizedGettersData[name] = this._memoizedGettersData[name] || {
            depsValueMap: {}
        };

        const getterData = this._memoizedGettersData[name];

        const depsArrTheSame = deps.reduce((result, dep) => {
            return result && _get(this, dep) === getterData.depsValueMap[dep];
        }, true);

        if (!getterData.hasOwnProperty('prevGetterValue') || !depsArrTheSame) {
            deps.forEach(dep => {
                getterData.depsValueMap[dep] = _get(this, dep);
            });

            getterData.prevGetterValue = getter.call(this);
        }

        return getterData.prevGetterValue;
    };
}
