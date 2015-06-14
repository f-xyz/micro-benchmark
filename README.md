# micro-profiler v1.0.3

[![Build Status](https://travis-ci.org/f-xyz/micro-profiler.svg?branch=master)](https://travis-ci.org/f-xyz/micro-profiler)

##

ES5 compatible, dependency-free benchmark suite.
Runs in node.js and in a browser (IE 9+).

## Installation

```
npm install micro-profiler
```

## Synchronous: function profile(fn, config) {}

### Arguments

* **fn** - function to profile, required
* **config** - {{ maxOperations: number, duration: number }}, optional
    * **maxOperations** - default value is 1000
    * **duration** - default is 100 ms
* **cb**

### Return value

{{
    ops: number,
    time: number,
    lastResult: any
}}

* **ops** - operations per second
* **time** - the function's average execution time
* **lastResult** - the last result of the function

### Example

```javascript
function someHeavyFunction() {
    var s = 0;
    for (var i = 0; i < 1e6; ++i) {
        s += Math.cos(i);
    }
    return s;
}

var result = profile(someHeavyFunction);

result.should.eql({
    ops: 26.548672566371682,
    time: 37.666666666666664,
    lastResult: -0.2887054679684282
});

```

## Asynchronous: function profileAsync(fn, config, cb) {}

### Arguments

* **fn** - function to profile, required
* **config** - {{ maxOperations: number, duration: number }}, optional
    * **maxOperations** - default value is 1000
    * **duration** - default is 100 ms
* **cb** - 

### Return value

profileAsync() return value is undefined. Real result is passed 
into **cb** as first argument.

### Example

```javascript
function someHeavyAsyncFunction(cb) {
    var s = 0;
    for (var i = 0; i < 1e6; ++i) {
        s += Math.cos(i);
    }
    cb(s);
}

profileAsync(someHeavyAsyncFunction, null, function (result) {
    result.should.eql({
        ops: 29.12621359223301,
        time: 34.333333333333336,
        lastResult: -0.2887054679684282 
    });
});
```

## Testing

```
npm test
```