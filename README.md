# micro-benchmark

[![Build Status](https://travis-ci.org/f-xyz/micro-benchmark.svg?branch=master)](https://travis-ci.org/f-xyz/micro-benchmark)

ES5 compatible, dependency-free benchmark suite.
Runs in node.js and in a browser (IE 9+).

## Installation

```
npm install micro-benchmark
```

## Example

```javascript
// node.js
var microBenchmark = require('micro-benchmark');

// node.js & browser
var N = 1e4;
var result = microBenchmark.suite({
    duration: 100, // optional
    maxOperations: 1000, // optional
    specs: [{
        name: 'sin(i)',
        fn: function () {
            for (var i = 0; i < N; ++i) Math.sin(i);
        }
    }, {
        name: 'sqrt(i)',
        fn: function () {
            for (var i = 0; i < N; ++i) Math.sqrt(i);
        }
    }, {
        name: 'pow(i, 2)',
        fn: function () {
            for (var i = 0; i < N; ++i) Math.pow(i, 2);
        }
    }]
});

var report = microBenchmark.report(result, { chartWidth: 10 /* 30 is default */ });
console.log(report);

// outputs
// Name         Operations per second    Average time, ms
// sqrt(i)      9.9 x 10^4               0.01                ==========>
// pow(i, 2)    9.6 x 10^4               0.01                =========>
// sin(i)       3.3 x 10^3               0.30                =>
```

### function profile(fn, config)

* **fn** - function to profile
* **config** - {{ maxOperations: number, duration: number }}, optional
    * **maxOperations** - optional function execution number limit, default value is 1000
    * **duration** - optional time limit, default is 100 ms
    
### function profileAsync(fn, config, cb)

* **fn** - function to profile, should call it's first argument: next()
* **config** - {{ maxOperations: number, duration: number }}, optional
    * **maxOperations** - optional function execution number limit, default value is 1000
    * **duration** - optional time limit, default is 100 ms
* **cb** - callback function


### function suite(config)

* **config** - {{ specs: [], maxOperations: number, duration: number }}, optional
	* **specs**: array of objects {{ name: string, fn: function }}
    * **maxOperations** - optional function execution number limit, default value is 1000
    * **duration** - optional time limit, default is 100 ms

### function suiteAsync(config, cb)

* **config** - {{ specs: [], maxOperations: number, duration: number }}, optional
	* **specs**: array of objects {{ name: string, fn: function }}
    * **maxOperations** - optional function execution number limit, default value is 1000
    * **duration** - optional time limit, default is 100 ms
* **cb** -- callback function

### function report(suiteResult, config)

* **suiteResult** - result of suite(...)
* **config** - {{ chartWidth: number }}, optional
  
## Testing
```
npm test
```
