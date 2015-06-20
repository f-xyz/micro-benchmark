# micro-benchmark

[![Build Status](https://travis-ci.org/f-xyz/micro-benchmark.svg?branch=master)](https://travis-ci.org/f-xyz/micro-benchmark)
[![Coverage Status](https://coveralls.io/repos/f-xyz/micro-benchmark/badge.svg)](https://coveralls.io/r/f-xyz/micro-benchmark)

ES5 compatible, dependency-free benchmark suite.
Runs in node.js and in a browser (IE 9+).

## Installation

```
npm install micro-benchmark
```

## Examples
```javascript
// node.js
var microBenchmark = require('micro-benchmark');

// node.js & browser
var result = microBenchmark.suite({
    duration: 1000,
    maxOperations: 10000,
    specs: [{
        name: 'sin(i)',
        fn: function () {
            for (var i = 0; i < 1e4; ++i) Math.sin(i);
        }
    }, {
        name: 'sqrt(i)',
        fn: function () {
            for (var i = 0; i < 1e4; ++i) Math.sqrt(i);
        }
    }, {
        name: 'pow(i, 2)',
        fn: function () {
            for (var i = 0; i < 1e4; ++i) Math.pow(i, 2);
        }
    }]
});

var report = microBenchmark.report(result, { chartWidth: 10 });
console.log(report);

// outputs
// Name         Operations per second    Average time, ms
// sqrt(i)      9.9 x 10^4               0.01                ==========>
// pow(i, 2)    9.6 x 10^4               0.01                =========>
// sin(i)       3.3 x 10^3               0.30                =>

```

### function suite(config)

### function report(suiteResult, config)

### function profile(fn, config)

* **fn** - function to profile, required
* **config** - {{ maxOperations: number, duration: number }}, optional
    * **maxOperations** - function execution number limit, default value is 1000
    * **duration** - time limit, default is 100 ms

#### Return value

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

## function suiteAsync(config: {}, cb: (result) => {}): void

### Arguments

* **fn** - function to profile, required
* **config** - {{ maxOperations: number, duration: number }}, optional
    * **maxOperations** - default value is 1000
    * **duration** - default is 100 ms
* **cb** - 

### Return value

profileAsync() return value is undefined. Real result is passed 
into **cb** as the first argument.

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

## function profileAsync(fn, config, cb) {}

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