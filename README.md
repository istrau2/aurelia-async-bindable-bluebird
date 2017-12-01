# aurelia-async-bindable

## How It Works (This Is IMPORTANT)
READMEs don't ususally begin with this kind of information. However, with `asyncBindable`, understanding how it works is really important.
If you use it incorrectly, you may have interesting things happen to you!

`asyncBindable` is a powerful decorator that can be used to bind asynchronous getters to your aurelia views.
It should be used along with a getter on your view model that returns a promise.

Internally, the decorator does two things:
1. It transforms your getter:
    a. It memoizes the return value (based on the dependencies - more on this later)
    b. Wraps your getter in a function that returns appropriate values depending on the state of the promise returned by your getter.
2. It sets up an additional property on your view model and tells `@computedFrom` to watch that property.

When your promise resolves, `asyncBindable` changes the property that `@computedFrom` is watching and retriggers any dependant bindings.

### Why memoize?
Async bindings are particularly sensitive to being called multiple times. This is because they often contain network calls which we only want executed once.
If `asyncBindable` is used along with `computedFrom`, the `computedFrom` dependencies are taken into account in the memoization.

### Implications
There are some important implications you should take away:
1. `asyncBindable` by default will only make a call to the getter that you declared **once**. It does not magically know when to call your getter again.
   You need to tell it when to reevaluate the getter (see [this section](https://github.com/israu2/aurelia-async-bindable/README.md#manually-refreshing-dependent-bindings)). 
2. Because `asyncBindable` is using `computedFrom` internally, it is only natural that you can use them together (see [this section](https://github.com/israu2/aurelia-async-bindable/README.md#using-along-with-the-computedFrom-decorator))
   However, when using them together, **order is important**, the `asyncBindable` decorator must be declared first.
3. Don't worry about dirty checking. Generally, when you bind to a regular getter, aurelia will have to resort to dirty checking to update the binding (because it has no way of knowing which properties to observe for the update).
   However, because `asyncBindable` is using `computedFrom` internally, that automatically means that Aurelia will NOT use dirty checking to update any dependent bindings.
   
## Using The Decorator

### Simple Use
The simplest use case is if you want to bind the results of a network call:
```js
@asyncBindable()
get listItems() {
    return remoteEndpoint.call()
        .then(response => response.list);
}
```

Then, simply use in your view like so:
```html
<ul>
    <li repeat.for="item of listItems">${item.label}</li>
</ul>
```

### Options
There are three options:
```
@asyncBindable({
    pendWith: 'Loading...', // pendWith takes a primitive value. As long as the promise is pending, this primitive will be provided to Aurelia.
    resolveWith: resolvedValue => resolvedValue.slice(0, 10), // resolveWith can be a function like this example or a primitive.
    rejectWith: rejectionErr => rejectionErr.message // rejectWith can be a function like this example or a primitive.
})
```

### Using along with the computedFrom decorator
A very common use case is to need to use this decorator along with `@computedFrom`.
For example, suppose you are showing a list of tasks for a specific story. A user can change the story that is selected, and the list of tasks needs to auto update:

View Model:
```js
@asyncBindable()
get stories() {
    return storiesEndpoint.get();
}

@asyncBindable()
@computedFrom('storyId')
get tasks() {
    return tasksEndpoint.get(this.storyId);
}
```


View:
```html
<select value.bind="storyId">
    <option repeat.for="story of stories" value.bind="story.id">${story.title}</option>
</select>

<table>
    <tr repeat.for="task of tasks">
        <td>${task.title}</td>
    </tr>
</table>
```

**PLEASE NOTE: When using `asyncBindable` in conjunction with `computedFrom`, the `asyncBindable` declaration must come first.**

### Manually Refreshing Dependent Bindings
Suppose you want to manually retrigger bindings dependent on a `asyncBindable` decorated getter.
For instance, in the example above, suppose you want to refresh the tasks without the `storyId` changing.

A solution to this is to just add a dependency that you manually control like so:
```js
@asyncBindable()
@computedFrom('storyId', 'tasksRefreshes')
get tasks() {
    return tasksEndpoint.get(this.storyId);
}

tasksRefreshes = 1;
```

Now, if you want to refresh the tasks:
```js
someMethodThatNeedsToRefreshTasks() {
    // Do stuff.
    this.tasksRefreshes++;
}
```

## Transpiling

To transpile to dist:

```shell
npm start -- transpile
```

