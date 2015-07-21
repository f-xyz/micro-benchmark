(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.microBenchmark = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var profile = require('./src/profile');
var suite = require('./src/suite');
var report = require('./src/report');
var util = require('./src/utils');

module.exports = {
    profile: profile,
    profileAsync: profileAsync,
    suite: suite,
    suiteAsync: suiteAsync,
    report: report,
    util: util
};

},{"./src/profile":16,"./src/report":17,"./src/suite":18,"./src/utils":19}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
(function (process){
'use strict';
var escapeStringRegexp = require('escape-string-regexp');
var ansiStyles = require('ansi-styles');
var stripAnsi = require('strip-ansi');
var hasAnsi = require('has-ansi');
var supportsColor = require('supports-color');
var defineProps = Object.defineProperties;
var isSimpleWindowsTerm = process.platform === 'win32' && !/^xterm/i.test(process.env.TERM);

function Chalk(options) {
	// detect mode if not set manually
	this.enabled = !options || options.enabled === undefined ? supportsColor : options.enabled;
}

// use bright blue on Windows as the normal blue color is illegible
if (isSimpleWindowsTerm) {
	ansiStyles.blue.open = '\u001b[94m';
}

var styles = (function () {
	var ret = {};

	Object.keys(ansiStyles).forEach(function (key) {
		ansiStyles[key].closeRe = new RegExp(escapeStringRegexp(ansiStyles[key].close), 'g');

		ret[key] = {
			get: function () {
				return build.call(this, this._styles.concat(key));
			}
		};
	});

	return ret;
})();

var proto = defineProps(function chalk() {}, styles);

function build(_styles) {
	var builder = function builder() {
		return applyStyle.apply(builder, arguments);
	};

	builder._styles = _styles;
	builder.enabled = this.enabled;
	// __proto__ is used because we must return a function, but there is
	// no way to create a function with a different prototype.
	/*eslint no-proto: 0 */
	builder.__proto__ = proto;

	return builder;
}

function applyStyle() {
	// support varags, but simply cast to string in case there's only one arg
	var args = arguments;
	var argsLen = args.length;
	var str = argsLen !== 0 && String(arguments[0]);

	if (argsLen > 1) {
		// don't slice `arguments`, it prevents v8 optimizations
		for (var a = 1; a < argsLen; a++) {
			str += ' ' + args[a];
		}
	}

	if (!this.enabled || !str) {
		return str;
	}

	var nestedStyles = this._styles;
	var i = nestedStyles.length;

	// Turns out that on Windows dimmed gray text becomes invisible in cmd.exe,
	// see https://github.com/chalk/chalk/issues/58
	// If we're on Windows and we're dealing with a gray color, temporarily make 'dim' a noop.
	var originalDim = ansiStyles.dim.open;
	if (isSimpleWindowsTerm && (nestedStyles.indexOf('gray') !== -1 || nestedStyles.indexOf('grey') !== -1)) {
		ansiStyles.dim.open = '';
	}

	while (i--) {
		var code = ansiStyles[nestedStyles[i]];

		// Replace any instances already present with a re-opening code
		// otherwise only the part of the string until said closing code
		// will be colored, and the rest will simply be 'plain'.
		str = code.open + str.replace(code.closeRe, code.open) + code.close;
	}

	// Reset the original 'dim' if we changed it to work around the Windows dimmed gray issue.
	ansiStyles.dim.open = originalDim;

	return str;
}

function init() {
	var ret = {};

	Object.keys(styles).forEach(function (name) {
		ret[name] = {
			get: function () {
				return build.call(this, [name]);
			}
		};
	});

	return ret;
}

defineProps(Chalk.prototype, init());

module.exports = new Chalk();
module.exports.styles = ansiStyles;
module.exports.hasColor = hasAnsi;
module.exports.stripColor = stripAnsi;
module.exports.supportsColor = supportsColor;

}).call(this,require('_process'))

},{"_process":2,"ansi-styles":4,"escape-string-regexp":5,"has-ansi":6,"strip-ansi":8,"supports-color":10}],4:[function(require,module,exports){
'use strict';

function assembleStyles () {
	var styles = {
		modifiers: {
			reset: [0, 0],
			bold: [1, 22], // 21 isn't widely supported and 22 does the same thing
			dim: [2, 22],
			italic: [3, 23],
			underline: [4, 24],
			inverse: [7, 27],
			hidden: [8, 28],
			strikethrough: [9, 29]
		},
		colors: {
			black: [30, 39],
			red: [31, 39],
			green: [32, 39],
			yellow: [33, 39],
			blue: [34, 39],
			magenta: [35, 39],
			cyan: [36, 39],
			white: [37, 39],
			gray: [90, 39]
		},
		bgColors: {
			bgBlack: [40, 49],
			bgRed: [41, 49],
			bgGreen: [42, 49],
			bgYellow: [43, 49],
			bgBlue: [44, 49],
			bgMagenta: [45, 49],
			bgCyan: [46, 49],
			bgWhite: [47, 49]
		}
	};

	// fix humans
	styles.colors.grey = styles.colors.gray;

	Object.keys(styles).forEach(function (groupName) {
		var group = styles[groupName];

		Object.keys(group).forEach(function (styleName) {
			var style = group[styleName];

			styles[styleName] = group[styleName] = {
				open: '\u001b[' + style[0] + 'm',
				close: '\u001b[' + style[1] + 'm'
			};
		});

		Object.defineProperty(styles, groupName, {
			value: group,
			enumerable: false
		});
	});

	return styles;
}

Object.defineProperty(module, 'exports', {
	enumerable: true,
	get: assembleStyles
});

},{}],5:[function(require,module,exports){
'use strict';

var matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;

module.exports = function (str) {
	if (typeof str !== 'string') {
		throw new TypeError('Expected a string');
	}

	return str.replace(matchOperatorsRe,  '\\$&');
};

},{}],6:[function(require,module,exports){
'use strict';
var ansiRegex = require('ansi-regex');
var re = new RegExp(ansiRegex().source); // remove the `g` flag
module.exports = re.test.bind(re);

},{"ansi-regex":7}],7:[function(require,module,exports){
'use strict';
module.exports = function () {
	return /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
};

},{}],8:[function(require,module,exports){
'use strict';
var ansiRegex = require('ansi-regex')();

module.exports = function (str) {
	return typeof str === 'string' ? str.replace(ansiRegex, '') : str;
};

},{"ansi-regex":9}],9:[function(require,module,exports){
arguments[4][7][0].apply(exports,arguments)
},{"dup":7}],10:[function(require,module,exports){
(function (process){
'use strict';
var argv = process.argv;

var terminator = argv.indexOf('--');
var hasFlag = function (flag) {
	flag = '--' + flag;
	var pos = argv.indexOf(flag);
	return pos !== -1 && (terminator !== -1 ? pos < terminator : true);
};

module.exports = (function () {
	if ('FORCE_COLOR' in process.env) {
		return true;
	}

	if (hasFlag('no-color') ||
		hasFlag('no-colors') ||
		hasFlag('color=false')) {
		return false;
	}

	if (hasFlag('color') ||
		hasFlag('colors') ||
		hasFlag('color=true') ||
		hasFlag('color=always')) {
		return true;
	}

	if (process.stdout && !process.stdout.isTTY) {
		return false;
	}

	if (process.platform === 'win32') {
		return true;
	}

	if ('COLORTERM' in process.env) {
		return true;
	}

	if (process.env.TERM === 'dumb') {
		return false;
	}

	if (/^screen|^xterm|^vt100|color|ansi|cygwin|linux/i.test(process.env.TERM)) {
		return true;
	}

	return false;
})();

}).call(this,require('_process'))

},{"_process":2}],11:[function(require,module,exports){
(function () {
  'use strict';

  function setupConsoleTable() {
    if (typeof console === 'undefined') {
      throw new Error('Weird, console object is undefined');
    }
    if (typeof console.table === 'function') {
      return;
    }

    var Table = require('easy-table');

    function arrayToString(arr) {
      var t = new Table();
      arr.forEach(function (record) {
        if (typeof record === 'string' ||
          typeof record === 'number') {
          t.cell('item', record);
        } else {
          // assume plain object
          Object.keys(record).forEach(function (property) {
            t.cell(property, record[property]);
          });
        }
        t.newRow();
      });
      return t.toString();
    }

    function printTitleTable(title, arr) {
      var str = arrayToString(arr);
      var rowLength = str.indexOf('\n');
      if (rowLength > 0) {
        if (title.length > rowLength) {
          rowLength = title.length;
        }
        console.log(title);
        var sep = '-', k, line = '';
        for (k = 0; k < rowLength; k += 1) {
          line += sep;
        }
        console.log(line);
      }
      console.log(str);
    }

    function objectToArray(obj) {
      var keys = Object.keys(obj);
      return keys.map(function (key) {
        return {
          key: key,
          value: obj[key]
        };
      });
    }

    function objectToString(obj) {
      return arrayToString(objectToArray(obj));
    }

    console.table = function () {
      var args = Array.prototype.slice.call(arguments);

      if (args.length === 2 &&
        typeof args[0] === 'string' &&
        Array.isArray(args[1])) {

        return printTitleTable(args[0], args[1]);
      }
      args.forEach(function (k) {
        if (typeof k === 'string') {
          return console.log(k);
        } else if (Array.isArray(k)) {
          console.log(arrayToString(k));
        } else if (typeof k === 'object') {
          console.log(objectToString(k));
        }
      });
    };
  }

  setupConsoleTable();
}());

},{"easy-table":14}],12:[function(require,module,exports){
var padLeft = require('./table').padLeft

var Printer = exports.Printer = function (name, format) {
    return function (val, width) {
        var s = name + ' ' + format(val)
        return width == null
            ? s
            : padLeft(s, width)
    }
}


exports.sum = function (sum, val) {
    sum = sum || 0
    return sum += val
}

exports.sum.printer = Printer('\u2211', String)


exports.avg = function (sum, val, index, length) {
    sum = sum || 0
    sum += val
    return index + 1 == length
        ? sum / length
        : sum
}

exports.avg.printer = Printer('Avg:', String)
},{"./table":14}],13:[function(require,module,exports){
module.exports = sort

function sort (comparator) {
    if (typeof comparator != 'function') {
        var sortKeys = Array.isArray(comparator)
            ? comparator
            : Object.keys(this.columns)
        comparator = KeysComparator(sortKeys)
    }
    this.rows.sort(comparator)
    return this
}

function KeysComparator (keys) {
    var comparators = keys.map(function (key) {
        var sortFn = 'asc'

        var m = /(.*)\|\s*(asc|des)\s*$/.exec(key)
        if (m) {
            key = m[1]
            sortFn = m[2]
        }

        return function (a, b) {
            var ret = compare(a[key], b[key])
            return sortFn == 'asc' ? ret : -1 * ret
        }
    })

    return function (a, b) {
        for (var i = 0; i < comparators.length; i++) {
            var res = comparators[i](a, b)
            if (res != 0) return res
        }
        return 0
    }
}

function compare (a, b) {
    if (a === b) return 0
    if (a === undefined) return 1
    if (b === undefined) return -1
    if (a === null) return 1
    if (b === null) return -1
    if (a > b) return 1
    if (a < b) return -1
    return compare(String(a), String(b))
}
},{}],14:[function(require,module,exports){
module.exports = Table

Table.string = function (val) {
    if (val === undefined) return ''
    return String(val)
}

Table.Number = function (digits) {
    return function (val, width) {
        if (val === undefined) return ''
        if (typeof val != 'number')
            throw new Error(String(val) + ' is not a number')
        var s = digits == null ? String(val) : val.toFixed(digits).toString()
        return Table.padLeft(s, width)
    }
}

Table.RightPadder = function (char) {
    char = char || ' '
    return function (val, length) {
        var s = String(val)
        var l = s.length
        for (var i = 0; i < length - l; i++) {
            s += char
        }
        return s
    }
}

Table.LeftPadder = function (char) {
    char = char || ' '
    return function (val, length) {
        var ret = ''
        var s = String(val)
        for (var i = 0; i < length - s.length; i++) {
            ret += char
        }
        ret += s
        return ret
    }
}

Table.padLeft = Table.LeftPadder()

Table.printArray = function (arr, format, cb) {
    format = typeof format == 'function' ? format : Formatter(format)
    cb = cb || function (t) {
        return t.toString()
    }

    var t = new Table
    var cell = t.cell.bind(t)

    arr.forEach(function (obj) {
        format(obj, cell)
        t.newRow()
    })
    return cb(t)
}

Table.printObj = function (obj, format, cb) {
    format = typeof format == 'function' ? format : Formatter(format)
    cb = cb || function (t) {
        return t.printTransposed(' : ')
    }

    var t = new Table
    format(obj, t.cell.bind(t))
    t.newRow()
    return cb(t)
}

function Formatter (opts) {
    opts = opts || {}
    return function (obj, cell) {
        for (var key in obj) {
            if (!obj.hasOwnProperty(key)) continue
            var o = opts[key]
            cell(
                (o && o.name) || key,
                obj[key],
                o && o.printer,
                o && o.width
            )
        }
    }
}


Table.Row = Row
function Row () {
    Object.defineProperties(this, {
        __printers: {
            value: {},
            enumerable: false
        },
        __cell: {
            value: function (col, val, printer) {
                this[col] = val
                this.__printers[col] = printer
            },
            enumerable: false
        }
    })
}


Table.print = print
function print (rows, columns, shift) {
    var padSpaces = Table.RightPadder()
    var widths = {}

    function setWidth (col, width) {
        var isFixed = columns[col].width != null
        if (isFixed) {
            widths[col] = columns[col].width
        } else {
            if (widths[col] > width) return
            widths[col] = width
        }
    }

    function cellPrinter (row, col) {
        return (row.__printers && row.__printers[col]) || Table.string
    }

    function calcWidths () {
        rows.forEach(function (row) {
            for (var key in columns) {
                setWidth(key, cellPrinter(row, key).call(row, row[key]).length)
            }
        })
    }

    function printRow (cb) {
        var s = ''
        var firstColumn = true
        for (var key in columns) {
            if (!firstColumn) s += shift
            firstColumn = false
            var width = widths[key]
            s += printCell(cb(key, width), width)
        }
        s += '\n'
        return s
    }

    function printCell (s, width) {
        if (s.length <= width) return padSpaces(s, width)
        s = s.slice(0, width)
        if (width > 3) s = s.slice(0, -3).concat('...')
        return s
    }

    calcWidths()

    return rows.map(function (row) {
        return printRow(function (key, width) {
            return cellPrinter(row, key).call(row, row[key], width)
        })
    }).join('')

}


function Table () {
    this.columns = {} /* @api: public */
    this.rows = [] /* @api: public */
    this._row = new Row
}


Table.prototype.cell = function (col, val, printer, width) {
    this._row.__cell(col, val, printer)
    var c = this.columns[col] || (this.columns[col] = {})
    if (width != null) c.width = width
    return this
}

Table.prototype.newRow = Table.prototype.newLine = function () {
    this.rows.push(this._row)
    this._row = new Row
    return this
}

Table.prototype.sort = require('./sort')

Table.aggr = require('./aggregations')

Table.prototype.totals = null /* @api: public */

Table.prototype.total = function (col, fn, printer) {
    fn = fn || Table.aggr.sum
    printer = printer || fn.printer

    this.totals = this.totals || new Row

    var val
    var rows = this.rows

    this.totals.__cell(col, null, function (_, width) {
        if (width != null) return printer(val, width)
        val = rows.reduce(function (val, row, index) {
            return fn(val, row[col], index, rows.length)
        }, null)
        return printer(val)
    })
    return this
}

Table.prototype.shift = '  '

Table.prototype.print = function () {
    return print(this.rows, this.columns, this.shift)
}

Table.prototype.printTransposed = function (delimeter) {
    var t = new Table
    if (delimeter) t.shift = delimeter

    function Printer (row, key) {
        var p = row.__printers && row.__printers[key]
        if (p) return function (val) {
            return p(val)
        }
    }

    for (var key in this.columns) {
        t.cell('h', key)
        this.rows.forEach(function (row, index) {
            t.cell('f' + index, row[key], Printer(row, key))
        })
        t.newRow()
    }
    return t.print()
}

Table.prototype.toString = function () {
    var padWithDashs = Table.RightPadder('-')
    var delimeter = this.createRow(function () {
        return ['', padWithDashs]
    })
    var head = this.createRow(function (key) {
        return [key]
    })
    var rows = [head, delimeter].concat(this.rows)
    if (this.totals) {
        rows = rows.concat([delimeter, this.totals])
    }
    return print(rows, this.columns, this.shift)
}

Table.prototype.createRow = function (cb) {
    var row = new Row
    for (var key in this.columns) {
        var args = cb(key)
        row.__cell(key, args[0], args[1])
    }
    return row
}
},{"./aggregations":12,"./sort":13}],15:[function(require,module,exports){
module.exports = Table

function Table() {
  this.rows = []
  this.row = {__printers : {}}
}

/**
 * Push the current row to the table and start a new one
 *
 * @returns {Table} `this`
 */

Table.prototype.newRow = function() {
  this.rows.push(this.row)
  this.row = {__printers : {}}
  return this
}

/**
 * Write cell in the current row
 *
 * @param {String} col          - Column name
 * @param {Any} val             - Cell value
 * @param {Function} [printer]  - Printer function to format the value
 * @returns {Table} `this`
 */

Table.prototype.cell = function(col, val, printer) {
  this.row[col] = val
  this.row.__printers[col] = printer || string
  return this
}

/**
 * String to separate columns
 */

Table.prototype.separator = '  '

function string(val) {
  return val === undefined ? '' : ''+val
}

function length(str) {
  return str.replace(/\u001b\[\d+m/g, '').length
}

/**
 * Default printer
 */

Table.string = string

/**
 * Create a printer which right aligns the content by padding with `ch` on the left
 *
 * @param {String} ch
 * @returns {Function}
 */

Table.leftPadder = leftPadder

function leftPadder(ch) {
  return function(val, width) {
    var str = string(val)
    var len = length(str)
    var pad = width > len ? Array(width - len + 1).join(ch) : ''
    return pad + str
  }
}

/**
 * Printer which right aligns the content
 */

var padLeft = Table.padLeft = leftPadder(' ')

/**
 * Create a printer which pads with `ch` on the right
 *
 * @param {String} ch
 * @returns {Function}
 */

Table.rightPadder = rightPadder

function rightPadder(ch) {
  return function padRight(val, width) {
    var str = string(val)
    var len = length(str)
    var pad = width > len ? Array(width - len + 1).join(ch) : ''
    return str + pad
  }
}

var padRight = rightPadder(' ')

/**
 * Create a printer for numbers
 *
 * Will do right alignment and optionally fix the number of digits after decimal point
 *
 * @param {Number} [digits] - Number of digits for fixpoint notation
 * @returns {Function}
 */

Table.number = function(digits) {
  return function(val, width) {
    if (val == null) return ''
    if (typeof val != 'number')
      throw new Error(''+val + ' is not a number')
    var str = digits == null ? val+'' : val.toFixed(digits)
    return padLeft(str, width)
  }
}

function each(row, fn) {
  for(var key in row) {
    if (key == '__printers') continue
    fn(key, row[key])
  }
}

/**
 * Get list of columns in printing order
 *
 * @returns {string[]}
 */

Table.prototype.columns = function() {
  var cols = {}
  for(var i = 0; i < 2; i++) { // do 2 times
    this.rows.forEach(function(row) {
      var idx = 0
      each(row, function(key) {
        idx = Math.max(idx, cols[key] || 0)
        cols[key] = idx
        idx++
      })
    })
  }
  return Object.keys(cols).sort(function(a, b) {
    return cols[a] - cols[b]
  })
}

/**
 * Format just rows, i.e. print the table without headers and totals
 *
 * @returns {String} String representaion of the table
 */

Table.prototype.print = function() {
  var cols = this.columns()
  var separator = this.separator
  var widths = {}
  var out = ''

  // Calc widths
  this.rows.forEach(function(row) {
    each(row, function(key, val) {
      var str = row.__printers[key].call(row, val)
      widths[key] = Math.max(length(str), widths[key] || 0)
    })
  })

  // Now print
  this.rows.forEach(function(row) {
    var line = ''
    cols.forEach(function(key) {
      var width = widths[key]
      var str = row.hasOwnProperty(key)
        ? ''+row.__printers[key].call(row, row[key], width)
        : ''
      line += padRight(str, width) + separator
    })
    line = line.slice(0, -separator.length)
    out += line + '\n'
  })

  return out
}

/**
 * Format the table
 *
 * @returns {String}
 */

Table.prototype.toString = function() {
  var cols = this.columns()
  var out = new Table()

  // copy options
  out.separator = this.separator

  // Write header
  cols.forEach(function(col) {
    out.cell(col, col)
  })
  out.newRow()
  out.pushDelimeter(cols)

  // Write body
  out.rows = out.rows.concat(this.rows)

  // Totals
  if (this.totals && this.rows.length) {
    out.pushDelimeter(cols)
    this.forEachTotal(out.cell.bind(out))
    out.newRow()
  }

  return out.print()
}

/**
 * Push delimeter row to the table (with each cell filled with dashs during printing)
 *
 * @param {String[]} [cols]
 * @returns {Table} `this`
 */

Table.prototype.pushDelimeter = function(cols) {
  cols = cols || this.columns()
  cols.forEach(function(col) {
    this.cell(col, undefined, leftPadder('-'))
  }, this)
  return this.newRow()
}

/**
 * Compute all totals and yield the results to `cb`
 *
 * @param {Function} cb - Callback function with signature `(column, value, printer)`
 */

Table.prototype.forEachTotal = function(cb) {
  for(var key in this.totals) {
    var aggr = this.totals[key]
    var acc = aggr.init
    var len = this.rows.length
    this.rows.forEach(function(row, idx) {
      acc = aggr.reduce.call(row, acc, row[key], idx, len)
    })
    cb(key, acc, aggr.printer)
  }
}

/**
 * Format the table so that each row represents column and each column represents row
 *
 * @param {Object} [opts]
 * @param {String} [ops.separator] - Column separation string
 * @param {Function} [opts.namePrinter] - Printer to format column names
 * @returns {String}
 */

Table.prototype.printTransposed = function(opts) {
  opts = opts || {}
  var out = new Table
  out.separator = opts.separator || this.separator
  this.columns().forEach(function(col) {
    out.cell(0, col, opts.namePrinter)
    this.rows.forEach(function(row, idx) {
      out.cell(idx+1, row[col], row.__printers[col])
    })
    out.newRow()
  }, this)
  return out.print()
}

/**
 * Sort the table
 *
 * @param {Function|string[]} [cmp] - Either compare function or a list of columns to sort on
 * @returns {Table} `this`
 */

Table.prototype.sort = function(cmp) {
  if (typeof cmp == 'function') {
    this.rows.sort(cmp)
    return this
  }

  var keys = Array.isArray(cmp) ? cmp : this.columns()

  var comparators = keys.map(function(key) {
    var order = 'asc'
    var m = /(.*)\|\s*(asc|des)\s*$/.exec(key)
    if (m) {
      key = m[1]
      order = m[2]
    }
    return function (a, b) {
      return order == 'asc'
        ? compare(a[key], b[key])
        : compare(b[key], a[key])
    }
  })

  return this.sort(function(a, b) {
    for (var i = 0; i < comparators.length; i++) {
      var order = comparators[i](a, b)
      if (order != 0) return order
    }
    return 0
  })
}

function compare(a, b) {
  if (a === b) return 0
  if (a === undefined) return 1
  if (b === undefined) return -1
  if (a === null) return 1
  if (b === null) return -1
  if (a > b) return 1
  if (a < b) return -1
  return compare(String(a), String(b))
}

/**
 * Add a total for the column
 *
 * @param {String} col - column name
 * @param {Object} [opts]
 * @param {Function} [opts.reduce = sum] - reduce(acc, val, idx, length) function to compute the total value
 * @param {Function} [opts.printer = padLeft] - Printer to format the total cell
 * @param {Any} [opts.init = 0] - Initial value for reduction
 * @returns {Table} `this`
 */

Table.prototype.total = function(col, opts) {
  opts = opts || {}
  this.totals = this.totals || {}
  this.totals[col] = {
    reduce: opts.reduce || Table.aggr.sum,
    printer: opts.printer || padLeft,
    init: opts.init == null ? 0 : opts.init
  }
  return this
}

/**
 * Predefined helpers for totals
 */

Table.aggr = {}

/**
 * Create a printer which formats the value with `printer`,
 * adds the `prefix` to it and right aligns the whole thing
 *
 * @param {String} prefix
 * @param {Function} printer
 * @returns {printer}
 */

Table.aggr.printer = function(prefix, printer) {
  printer = printer || string
  return function(val, width) {
    return padLeft(prefix + printer(val), width)
  }
}

/**
 * Sum reduction
 */

Table.aggr.sum = function(acc, val) {
  return acc + val
}

/**
 * Average reduction
 */

Table.aggr.avg = function(acc, val, idx, len) {
  acc = acc + val
  return idx + 1 == len ? acc/len : acc
}

/**
 * Print the array or object
 *
 * @param {Array|Object} obj - Object to print
 * @param {Function|Object} [format] - Format options
 * @param {Function} [cb] - Table post processing and formating
 * @returns {String}
 */

Table.print = function(obj, format, cb) {
  var opts = format || {}

  format = typeof format == 'function'
    ? format
    : function(obj, cell) {
      for(var key in obj) {
        if (!obj.hasOwnProperty(key)) continue
        var params = opts[key] || {}
        cell(params.name || key, obj[key], params.printer)
      }
    }

  var t = new Table
  var cell = t.cell.bind(t)

  if (Array.isArray(obj)) {
    cb = cb || function(t) { return t.toString() }
    obj.forEach(function(item) {
      format(item, cell)
      t.newRow()
    })
  } else {
    cb = cb || function(t) { return t.printTransposed({separator: ' : '}) }
    format(obj, cell)
    t.newRow()
  }

  return cb(t)
}

/**
 * Same as `Table.print()` but yields the result to `console.log()`
 */

Table.log = function(obj, format, cb) {
  console.log(Table.print(obj, format, cb))
}

/**
 * Same as `.toString()` but yields the result to `console.log()`
 */

Table.prototype.log = function() {
  console.log(this.toString())
}

},{}],16:[function(require,module,exports){
var utils = require('./utils');

module.exports = profile;

function profile(fn, config) {

    if (!(fn instanceof Function)) {
        throw new Error('No function to profile!');
    }

    config = utils.configure(config, {
        limitIterations: 1e3,
        limitTime: 100
    });

    var started = Date.now();
    var lastResult,
        elapsed,
        operations = 0;

    while (true) {

        lastResult = fn();
        elapsed = Date.now() - started;
        operations++;

        if (elapsed >= config.limitTime
        ||  operations >= config.limitIterations) {
            break;
        }
    }

    return {
        ops: operations / elapsed * 1000,
        time: elapsed / operations,
        lastResult: lastResult
    };
}
},{"./utils":19}],17:[function(require,module,exports){
require('console.table');
var easyTable = require('easy-table');
//var Table = require('easy-table');

var suite = require('./suite');
var formatNumber = require('./utils').formatNumber;
var utils = require('./utils');
var chalk = require('chalk');

module.exports = report;

function report(result, options) {

    result = result.map(function (x) {
        return {
            name: x.name,
            ops: utils.formatNumber(x.ops),
            time: utils.formatNumber(x.time)
        };
    });
    console.log(result);
    console.table(result);
    return;

    var getMaxLength = function (key) {
        var headerLength = headers[key].length;

        var column = result.map(utils.prop(key));
        var columnLength = column.map(utils.prop('length'));
        var maxColumnLength = utils.max(columnLength);

        return Math.max(headerLength, maxColumnLength);
    };

    var getChartLength = function (x, maxOps) {
        var chartWidth = config.chartWidth - 1;
        var k = x.original.ops / maxOps;
        if (isNaN(k)) {
            return chartWidth;
        }
        return Math.round(chartWidth * k);
    };

    // init

    var config = {
        chartWidth: 20
    };

    if (typeof options == 'object' ) {
        Object.keys(options).forEach(function (key) {
            config[key] = options[key];
        });
    }

    // column headers
    var headers = {
        name: 'Name',
        ops: 'Iterations per second',
        time: 'Average time, ms',
        chart: 'x'
    };

    // max operations per second value
    var maxOps = utils.max(result.map(utils.prop('ops')));

    // formatting
    result = result.map(function (x) {
        return {
            name: x.name,
            ops: utils.formatNumber(x.ops),
            time: utils.formatNumber(x.time),
            lastResult: x.lastResult,
            original: x
        };
    });

    // columns' widths
    var nameMaxLength = getMaxLength('name');
    var opsMaxLength = getMaxLength('ops');
    var timeMaxLength = getMaxLength('time');

    // final processing and output
    var rowSeparator = '\n';
    var cellSeparator = ' | ';

    var rows = result
        .map(function (x) {
            return [
                utils.pad(x.name, nameMaxLength),
                utils.pad(x.ops, opsMaxLength),
                utils.pad(x.time, timeMaxLength),
                utils.pad(utils.repeat('=', getChartLength(x, maxOps)) + '>', config.chartWidth)
            ].join(cellSeparator);
        });

    headers = [
        utils.pad(headers.name, nameMaxLength),
        utils.pad(headers.ops, opsMaxLength),
        utils.padLeft(headers.time, timeMaxLength),
        utils.pad(headers.chart, config.chartWidth)
    ];

    var prefix = '| ';
    var suffix = ' |';

    var output = [];
    var totalWidth = rows[0].length + prefix.length + suffix.length;
    var horizontalLine = '+' + utils.repeat('-', totalWidth - 2) + '+';

    output.push(horizontalLine);
    output.push(prefix + headers.join(cellSeparator) + suffix);
    output.push(horizontalLine);
    output.push(rows.map(function (x, i) {
        var color = i == 0 && 'green'
                ||  i == 1 && 'yellow'
                ||            'reset';
        x = chalk[color](x);
        return prefix + x + suffix;
    }).join(rowSeparator));
    output.push(horizontalLine);

    return output.join('\n');
}
},{"./suite":18,"./utils":19,"chalk":3,"console.table":11,"easy-table":15}],18:[function(require,module,exports){
var utils = require('./utils');
var profile = require('./profile');
var report = require('./report');

module.exports = suite;

function extractFunctionName(fn) {
    var exclude = ['function', 'return'];
    var words = fn
        .toString()
        .replace(/!.*$/, '')
        .match(/([\w]+)/g)
        .filter(function (x) {
            return exclude.indexOf(x.trim()) == -1;
        });
    return utils.crop(words.join(' ').trim(), 20);
}

function suite(specs, config) {
    specs = specs || [];
    config = utils.configure(config, {
        limitTime: 1, // profile
        limitIterations: 1,  // profile
        repeatTimes: 1,
        printReport: false,
        cacheWarmUpIterations: 0,
        chartWidth: 20 // report
    });

    var repeatFn = function (fn, times) {
        return function () {
            for (var i = 0; i < times; i++) {
                fn();
            }
        };
    };

    var suiteResult = specs.map(function (fn) {
        var name = fn.name || extractFunctionName(fn) || utils.uniqId('test-');
        if (config.repeatTimes != 1) {
            fn = repeatFn(fn, config.repeatTimes);
        }
        var result = profile(fn, config);
        return {
            name: name,
            ops: result.ops,
            time: result.time,
            lastResult: result.lastResult
        };
    });

    suiteResult.sort(function (a, b) {
        return b.ops - a.ops;
    });

    if (config.printReport) {
        console.log(report(suiteResult, config));
    }

    return suiteResult;
}
},{"./profile":16,"./report":17,"./utils":19}],19:[function(require,module,exports){
module.exports = {
    // number
    formatNumber: formatNumber,
    // string
    pad: pad,
    padLeft: padLeft,
    crop: crop,
    // functional
    prop: prop,
    max: max,
    repeat: repeat,
    uniqId: uniqId,
    // object
    configure: configure
};

//////////////////////////////////////////////////////////////////////////////

function formatNumber(n) {
    if (typeof n == 'number') {
        switch (true) {
            case n === 0:
                return '0';
            case n < 1:
                return n.toFixed(2);
            case n < 1000:
                return n.toFixed(0);
            default:
                return n.toExponential(1).replace(/e\+/, ' x 10^');
        }
    } else {
        return n;
    }
}

//////////////////////////////////////////////////////////////////////////////

function pad(str, n, char) {
    if (char === undefined || char === '') {
        char = ' ';
    }
    if (str.length < n) {
        return pad(str + char, n, char);
    }
    return str;
}

function padLeft(str, n, char) {
    if (char === undefined || char === '') {
        char = ' ';
    }
    if (str.length < n) {
        return padLeft(char + str, n, char);
    }
    return str;
}

function crop(str, length, subst) {
    if (str.length <= length) {
        return str;
    }
    subst = subst || '...';
    return str.slice(0, length - subst.length + 1) + subst;
}

//////////////////////////////////////////////////////////////////////////////

function prop(key) {
    return function (x) {
        return x[key];
    };
}

function max(list) {
    return Math.max.apply(Math, list);
}

function repeat(str, times) {
    return new Array(times + 1).join(str);
}

function uniqId(prefix) {
    return prefix + String(uniqId.counter++);
}
uniqId.counter = 0;
uniqId.reset = function (counter) { uniqId.counter = counter };

//////////////////////////////////////////////////////////////////////////////

function configure(config, defaults) {
    config = config || {};
    defaults = defaults || {};

    Object.keys(config).forEach(function (key) {
        defaults[key] = config[key];
    });

    return defaults;
}

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvY2hhbGsvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2hhbGsvbm9kZV9tb2R1bGVzL2Fuc2ktc3R5bGVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NoYWxrL25vZGVfbW9kdWxlcy9lc2NhcGUtc3RyaW5nLXJlZ2V4cC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jaGFsay9ub2RlX21vZHVsZXMvaGFzLWFuc2kvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2hhbGsvbm9kZV9tb2R1bGVzL2hhcy1hbnNpL25vZGVfbW9kdWxlcy9hbnNpLXJlZ2V4L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NoYWxrL25vZGVfbW9kdWxlcy9zdHJpcC1hbnNpL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NoYWxrL25vZGVfbW9kdWxlcy9zdXBwb3J0cy1jb2xvci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jb25zb2xlLnRhYmxlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NvbnNvbGUudGFibGUvbm9kZV9tb2R1bGVzL2Vhc3ktdGFibGUvbGliL2FnZ3JlZ2F0aW9ucy5qcyIsIm5vZGVfbW9kdWxlcy9jb25zb2xlLnRhYmxlL25vZGVfbW9kdWxlcy9lYXN5LXRhYmxlL2xpYi9zb3J0LmpzIiwibm9kZV9tb2R1bGVzL2NvbnNvbGUudGFibGUvbm9kZV9tb2R1bGVzL2Vhc3ktdGFibGUvbGliL3RhYmxlLmpzIiwibm9kZV9tb2R1bGVzL2Vhc3ktdGFibGUvbGliL3RhYmxlLmpzIiwic3JjL3Byb2ZpbGUuanMiLCJzcmMvcmVwb3J0LmpzIiwic3JjL3N1aXRlLmpzIiwic3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBwcm9maWxlID0gcmVxdWlyZSgnLi9zcmMvcHJvZmlsZScpO1xudmFyIHN1aXRlID0gcmVxdWlyZSgnLi9zcmMvc3VpdGUnKTtcbnZhciByZXBvcnQgPSByZXF1aXJlKCcuL3NyYy9yZXBvcnQnKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi9zcmMvdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJvZmlsZTogcHJvZmlsZSxcbiAgICBwcm9maWxlQXN5bmM6IHByb2ZpbGVBc3luYyxcbiAgICBzdWl0ZTogc3VpdGUsXG4gICAgc3VpdGVBc3luYzogc3VpdGVBc3luYyxcbiAgICByZXBvcnQ6IHJlcG9ydCxcbiAgICB1dGlsOiB1dGlsXG59O1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIndXNlIHN0cmljdCc7XG52YXIgZXNjYXBlU3RyaW5nUmVnZXhwID0gcmVxdWlyZSgnZXNjYXBlLXN0cmluZy1yZWdleHAnKTtcbnZhciBhbnNpU3R5bGVzID0gcmVxdWlyZSgnYW5zaS1zdHlsZXMnKTtcbnZhciBzdHJpcEFuc2kgPSByZXF1aXJlKCdzdHJpcC1hbnNpJyk7XG52YXIgaGFzQW5zaSA9IHJlcXVpcmUoJ2hhcy1hbnNpJyk7XG52YXIgc3VwcG9ydHNDb2xvciA9IHJlcXVpcmUoJ3N1cHBvcnRzLWNvbG9yJyk7XG52YXIgZGVmaW5lUHJvcHMgPSBPYmplY3QuZGVmaW5lUHJvcGVydGllcztcbnZhciBpc1NpbXBsZVdpbmRvd3NUZXJtID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJyAmJiAhL154dGVybS9pLnRlc3QocHJvY2Vzcy5lbnYuVEVSTSk7XG5cbmZ1bmN0aW9uIENoYWxrKG9wdGlvbnMpIHtcblx0Ly8gZGV0ZWN0IG1vZGUgaWYgbm90IHNldCBtYW51YWxseVxuXHR0aGlzLmVuYWJsZWQgPSAhb3B0aW9ucyB8fCBvcHRpb25zLmVuYWJsZWQgPT09IHVuZGVmaW5lZCA/IHN1cHBvcnRzQ29sb3IgOiBvcHRpb25zLmVuYWJsZWQ7XG59XG5cbi8vIHVzZSBicmlnaHQgYmx1ZSBvbiBXaW5kb3dzIGFzIHRoZSBub3JtYWwgYmx1ZSBjb2xvciBpcyBpbGxlZ2libGVcbmlmIChpc1NpbXBsZVdpbmRvd3NUZXJtKSB7XG5cdGFuc2lTdHlsZXMuYmx1ZS5vcGVuID0gJ1xcdTAwMWJbOTRtJztcbn1cblxudmFyIHN0eWxlcyA9IChmdW5jdGlvbiAoKSB7XG5cdHZhciByZXQgPSB7fTtcblxuXHRPYmplY3Qua2V5cyhhbnNpU3R5bGVzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcblx0XHRhbnNpU3R5bGVzW2tleV0uY2xvc2VSZSA9IG5ldyBSZWdFeHAoZXNjYXBlU3RyaW5nUmVnZXhwKGFuc2lTdHlsZXNba2V5XS5jbG9zZSksICdnJyk7XG5cblx0XHRyZXRba2V5XSA9IHtcblx0XHRcdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gYnVpbGQuY2FsbCh0aGlzLCB0aGlzLl9zdHlsZXMuY29uY2F0KGtleSkpO1xuXHRcdFx0fVxuXHRcdH07XG5cdH0pO1xuXG5cdHJldHVybiByZXQ7XG59KSgpO1xuXG52YXIgcHJvdG8gPSBkZWZpbmVQcm9wcyhmdW5jdGlvbiBjaGFsaygpIHt9LCBzdHlsZXMpO1xuXG5mdW5jdGlvbiBidWlsZChfc3R5bGVzKSB7XG5cdHZhciBidWlsZGVyID0gZnVuY3Rpb24gYnVpbGRlcigpIHtcblx0XHRyZXR1cm4gYXBwbHlTdHlsZS5hcHBseShidWlsZGVyLCBhcmd1bWVudHMpO1xuXHR9O1xuXG5cdGJ1aWxkZXIuX3N0eWxlcyA9IF9zdHlsZXM7XG5cdGJ1aWxkZXIuZW5hYmxlZCA9IHRoaXMuZW5hYmxlZDtcblx0Ly8gX19wcm90b19fIGlzIHVzZWQgYmVjYXVzZSB3ZSBtdXN0IHJldHVybiBhIGZ1bmN0aW9uLCBidXQgdGhlcmUgaXNcblx0Ly8gbm8gd2F5IHRvIGNyZWF0ZSBhIGZ1bmN0aW9uIHdpdGggYSBkaWZmZXJlbnQgcHJvdG90eXBlLlxuXHQvKmVzbGludCBuby1wcm90bzogMCAqL1xuXHRidWlsZGVyLl9fcHJvdG9fXyA9IHByb3RvO1xuXG5cdHJldHVybiBidWlsZGVyO1xufVxuXG5mdW5jdGlvbiBhcHBseVN0eWxlKCkge1xuXHQvLyBzdXBwb3J0IHZhcmFncywgYnV0IHNpbXBseSBjYXN0IHRvIHN0cmluZyBpbiBjYXNlIHRoZXJlJ3Mgb25seSBvbmUgYXJnXG5cdHZhciBhcmdzID0gYXJndW1lbnRzO1xuXHR2YXIgYXJnc0xlbiA9IGFyZ3MubGVuZ3RoO1xuXHR2YXIgc3RyID0gYXJnc0xlbiAhPT0gMCAmJiBTdHJpbmcoYXJndW1lbnRzWzBdKTtcblxuXHRpZiAoYXJnc0xlbiA+IDEpIHtcblx0XHQvLyBkb24ndCBzbGljZSBgYXJndW1lbnRzYCwgaXQgcHJldmVudHMgdjggb3B0aW1pemF0aW9uc1xuXHRcdGZvciAodmFyIGEgPSAxOyBhIDwgYXJnc0xlbjsgYSsrKSB7XG5cdFx0XHRzdHIgKz0gJyAnICsgYXJnc1thXTtcblx0XHR9XG5cdH1cblxuXHRpZiAoIXRoaXMuZW5hYmxlZCB8fCAhc3RyKSB7XG5cdFx0cmV0dXJuIHN0cjtcblx0fVxuXG5cdHZhciBuZXN0ZWRTdHlsZXMgPSB0aGlzLl9zdHlsZXM7XG5cdHZhciBpID0gbmVzdGVkU3R5bGVzLmxlbmd0aDtcblxuXHQvLyBUdXJucyBvdXQgdGhhdCBvbiBXaW5kb3dzIGRpbW1lZCBncmF5IHRleHQgYmVjb21lcyBpbnZpc2libGUgaW4gY21kLmV4ZSxcblx0Ly8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9jaGFsay9jaGFsay9pc3N1ZXMvNThcblx0Ly8gSWYgd2UncmUgb24gV2luZG93cyBhbmQgd2UncmUgZGVhbGluZyB3aXRoIGEgZ3JheSBjb2xvciwgdGVtcG9yYXJpbHkgbWFrZSAnZGltJyBhIG5vb3AuXG5cdHZhciBvcmlnaW5hbERpbSA9IGFuc2lTdHlsZXMuZGltLm9wZW47XG5cdGlmIChpc1NpbXBsZVdpbmRvd3NUZXJtICYmIChuZXN0ZWRTdHlsZXMuaW5kZXhPZignZ3JheScpICE9PSAtMSB8fCBuZXN0ZWRTdHlsZXMuaW5kZXhPZignZ3JleScpICE9PSAtMSkpIHtcblx0XHRhbnNpU3R5bGVzLmRpbS5vcGVuID0gJyc7XG5cdH1cblxuXHR3aGlsZSAoaS0tKSB7XG5cdFx0dmFyIGNvZGUgPSBhbnNpU3R5bGVzW25lc3RlZFN0eWxlc1tpXV07XG5cblx0XHQvLyBSZXBsYWNlIGFueSBpbnN0YW5jZXMgYWxyZWFkeSBwcmVzZW50IHdpdGggYSByZS1vcGVuaW5nIGNvZGVcblx0XHQvLyBvdGhlcndpc2Ugb25seSB0aGUgcGFydCBvZiB0aGUgc3RyaW5nIHVudGlsIHNhaWQgY2xvc2luZyBjb2RlXG5cdFx0Ly8gd2lsbCBiZSBjb2xvcmVkLCBhbmQgdGhlIHJlc3Qgd2lsbCBzaW1wbHkgYmUgJ3BsYWluJy5cblx0XHRzdHIgPSBjb2RlLm9wZW4gKyBzdHIucmVwbGFjZShjb2RlLmNsb3NlUmUsIGNvZGUub3BlbikgKyBjb2RlLmNsb3NlO1xuXHR9XG5cblx0Ly8gUmVzZXQgdGhlIG9yaWdpbmFsICdkaW0nIGlmIHdlIGNoYW5nZWQgaXQgdG8gd29yayBhcm91bmQgdGhlIFdpbmRvd3MgZGltbWVkIGdyYXkgaXNzdWUuXG5cdGFuc2lTdHlsZXMuZGltLm9wZW4gPSBvcmlnaW5hbERpbTtcblxuXHRyZXR1cm4gc3RyO1xufVxuXG5mdW5jdGlvbiBpbml0KCkge1xuXHR2YXIgcmV0ID0ge307XG5cblx0T2JqZWN0LmtleXMoc3R5bGVzKS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0cmV0W25hbWVdID0ge1xuXHRcdFx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBidWlsZC5jYWxsKHRoaXMsIFtuYW1lXSk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fSk7XG5cblx0cmV0dXJuIHJldDtcbn1cblxuZGVmaW5lUHJvcHMoQ2hhbGsucHJvdG90eXBlLCBpbml0KCkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBDaGFsaygpO1xubW9kdWxlLmV4cG9ydHMuc3R5bGVzID0gYW5zaVN0eWxlcztcbm1vZHVsZS5leHBvcnRzLmhhc0NvbG9yID0gaGFzQW5zaTtcbm1vZHVsZS5leHBvcnRzLnN0cmlwQ29sb3IgPSBzdHJpcEFuc2k7XG5tb2R1bGUuZXhwb3J0cy5zdXBwb3J0c0NvbG9yID0gc3VwcG9ydHNDb2xvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gYXNzZW1ibGVTdHlsZXMgKCkge1xuXHR2YXIgc3R5bGVzID0ge1xuXHRcdG1vZGlmaWVyczoge1xuXHRcdFx0cmVzZXQ6IFswLCAwXSxcblx0XHRcdGJvbGQ6IFsxLCAyMl0sIC8vIDIxIGlzbid0IHdpZGVseSBzdXBwb3J0ZWQgYW5kIDIyIGRvZXMgdGhlIHNhbWUgdGhpbmdcblx0XHRcdGRpbTogWzIsIDIyXSxcblx0XHRcdGl0YWxpYzogWzMsIDIzXSxcblx0XHRcdHVuZGVybGluZTogWzQsIDI0XSxcblx0XHRcdGludmVyc2U6IFs3LCAyN10sXG5cdFx0XHRoaWRkZW46IFs4LCAyOF0sXG5cdFx0XHRzdHJpa2V0aHJvdWdoOiBbOSwgMjldXG5cdFx0fSxcblx0XHRjb2xvcnM6IHtcblx0XHRcdGJsYWNrOiBbMzAsIDM5XSxcblx0XHRcdHJlZDogWzMxLCAzOV0sXG5cdFx0XHRncmVlbjogWzMyLCAzOV0sXG5cdFx0XHR5ZWxsb3c6IFszMywgMzldLFxuXHRcdFx0Ymx1ZTogWzM0LCAzOV0sXG5cdFx0XHRtYWdlbnRhOiBbMzUsIDM5XSxcblx0XHRcdGN5YW46IFszNiwgMzldLFxuXHRcdFx0d2hpdGU6IFszNywgMzldLFxuXHRcdFx0Z3JheTogWzkwLCAzOV1cblx0XHR9LFxuXHRcdGJnQ29sb3JzOiB7XG5cdFx0XHRiZ0JsYWNrOiBbNDAsIDQ5XSxcblx0XHRcdGJnUmVkOiBbNDEsIDQ5XSxcblx0XHRcdGJnR3JlZW46IFs0MiwgNDldLFxuXHRcdFx0YmdZZWxsb3c6IFs0MywgNDldLFxuXHRcdFx0YmdCbHVlOiBbNDQsIDQ5XSxcblx0XHRcdGJnTWFnZW50YTogWzQ1LCA0OV0sXG5cdFx0XHRiZ0N5YW46IFs0NiwgNDldLFxuXHRcdFx0YmdXaGl0ZTogWzQ3LCA0OV1cblx0XHR9XG5cdH07XG5cblx0Ly8gZml4IGh1bWFuc1xuXHRzdHlsZXMuY29sb3JzLmdyZXkgPSBzdHlsZXMuY29sb3JzLmdyYXk7XG5cblx0T2JqZWN0LmtleXMoc3R5bGVzKS5mb3JFYWNoKGZ1bmN0aW9uIChncm91cE5hbWUpIHtcblx0XHR2YXIgZ3JvdXAgPSBzdHlsZXNbZ3JvdXBOYW1lXTtcblxuXHRcdE9iamVjdC5rZXlzKGdyb3VwKS5mb3JFYWNoKGZ1bmN0aW9uIChzdHlsZU5hbWUpIHtcblx0XHRcdHZhciBzdHlsZSA9IGdyb3VwW3N0eWxlTmFtZV07XG5cblx0XHRcdHN0eWxlc1tzdHlsZU5hbWVdID0gZ3JvdXBbc3R5bGVOYW1lXSA9IHtcblx0XHRcdFx0b3BlbjogJ1xcdTAwMWJbJyArIHN0eWxlWzBdICsgJ20nLFxuXHRcdFx0XHRjbG9zZTogJ1xcdTAwMWJbJyArIHN0eWxlWzFdICsgJ20nXG5cdFx0XHR9O1xuXHRcdH0pO1xuXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHN0eWxlcywgZ3JvdXBOYW1lLCB7XG5cdFx0XHR2YWx1ZTogZ3JvdXAsXG5cdFx0XHRlbnVtZXJhYmxlOiBmYWxzZVxuXHRcdH0pO1xuXHR9KTtcblxuXHRyZXR1cm4gc3R5bGVzO1xufVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkobW9kdWxlLCAnZXhwb3J0cycsIHtcblx0ZW51bWVyYWJsZTogdHJ1ZSxcblx0Z2V0OiBhc3NlbWJsZVN0eWxlc1xufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtYXRjaE9wZXJhdG9yc1JlID0gL1t8XFxcXHt9KClbXFxdXiQrKj8uXS9nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHIpIHtcblx0aWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgYSBzdHJpbmcnKTtcblx0fVxuXG5cdHJldHVybiBzdHIucmVwbGFjZShtYXRjaE9wZXJhdG9yc1JlLCAgJ1xcXFwkJicpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBhbnNpUmVnZXggPSByZXF1aXJlKCdhbnNpLXJlZ2V4Jyk7XG52YXIgcmUgPSBuZXcgUmVnRXhwKGFuc2lSZWdleCgpLnNvdXJjZSk7IC8vIHJlbW92ZSB0aGUgYGdgIGZsYWdcbm1vZHVsZS5leHBvcnRzID0gcmUudGVzdC5iaW5kKHJlKTtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gL1tcXHUwMDFiXFx1MDA5Yl1bWygpIzs/XSooPzpbMC05XXsxLDR9KD86O1swLTldezAsNH0pKik/WzAtOUEtT1JaY2YtbnFyeT0+PF0vZztcbn07XG4iLCIndXNlIHN0cmljdCc7XG52YXIgYW5zaVJlZ2V4ID0gcmVxdWlyZSgnYW5zaS1yZWdleCcpKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0cikge1xuXHRyZXR1cm4gdHlwZW9mIHN0ciA9PT0gJ3N0cmluZycgPyBzdHIucmVwbGFjZShhbnNpUmVnZXgsICcnKSA6IHN0cjtcbn07XG4iLCIndXNlIHN0cmljdCc7XG52YXIgYXJndiA9IHByb2Nlc3MuYXJndjtcblxudmFyIHRlcm1pbmF0b3IgPSBhcmd2LmluZGV4T2YoJy0tJyk7XG52YXIgaGFzRmxhZyA9IGZ1bmN0aW9uIChmbGFnKSB7XG5cdGZsYWcgPSAnLS0nICsgZmxhZztcblx0dmFyIHBvcyA9IGFyZ3YuaW5kZXhPZihmbGFnKTtcblx0cmV0dXJuIHBvcyAhPT0gLTEgJiYgKHRlcm1pbmF0b3IgIT09IC0xID8gcG9zIDwgdGVybWluYXRvciA6IHRydWUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gKCkge1xuXHRpZiAoJ0ZPUkNFX0NPTE9SJyBpbiBwcm9jZXNzLmVudikge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0aWYgKGhhc0ZsYWcoJ25vLWNvbG9yJykgfHxcblx0XHRoYXNGbGFnKCduby1jb2xvcnMnKSB8fFxuXHRcdGhhc0ZsYWcoJ2NvbG9yPWZhbHNlJykpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRpZiAoaGFzRmxhZygnY29sb3InKSB8fFxuXHRcdGhhc0ZsYWcoJ2NvbG9ycycpIHx8XG5cdFx0aGFzRmxhZygnY29sb3I9dHJ1ZScpIHx8XG5cdFx0aGFzRmxhZygnY29sb3I9YWx3YXlzJykpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdGlmIChwcm9jZXNzLnN0ZG91dCAmJiAhcHJvY2Vzcy5zdGRvdXQuaXNUVFkpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0aWYgKCdDT0xPUlRFUk0nIGluIHByb2Nlc3MuZW52KSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRpZiAocHJvY2Vzcy5lbnYuVEVSTSA9PT0gJ2R1bWInKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0aWYgKC9ec2NyZWVufF54dGVybXxednQxMDB8Y29sb3J8YW5zaXxjeWd3aW58bGludXgvaS50ZXN0KHByb2Nlc3MuZW52LlRFUk0pKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRyZXR1cm4gZmFsc2U7XG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGZ1bmN0aW9uIHNldHVwQ29uc29sZVRhYmxlKCkge1xuICAgIGlmICh0eXBlb2YgY29uc29sZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignV2VpcmQsIGNvbnNvbGUgb2JqZWN0IGlzIHVuZGVmaW5lZCcpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGNvbnNvbGUudGFibGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgVGFibGUgPSByZXF1aXJlKCdlYXN5LXRhYmxlJyk7XG5cbiAgICBmdW5jdGlvbiBhcnJheVRvU3RyaW5nKGFycikge1xuICAgICAgdmFyIHQgPSBuZXcgVGFibGUoKTtcbiAgICAgIGFyci5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiByZWNvcmQgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICAgdHlwZW9mIHJlY29yZCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICB0LmNlbGwoJ2l0ZW0nLCByZWNvcmQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGFzc3VtZSBwbGFpbiBvYmplY3RcbiAgICAgICAgICBPYmplY3Qua2V5cyhyZWNvcmQpLmZvckVhY2goZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICB0LmNlbGwocHJvcGVydHksIHJlY29yZFtwcm9wZXJ0eV0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHQubmV3Um93KCk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0LnRvU3RyaW5nKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJpbnRUaXRsZVRhYmxlKHRpdGxlLCBhcnIpIHtcbiAgICAgIHZhciBzdHIgPSBhcnJheVRvU3RyaW5nKGFycik7XG4gICAgICB2YXIgcm93TGVuZ3RoID0gc3RyLmluZGV4T2YoJ1xcbicpO1xuICAgICAgaWYgKHJvd0xlbmd0aCA+IDApIHtcbiAgICAgICAgaWYgKHRpdGxlLmxlbmd0aCA+IHJvd0xlbmd0aCkge1xuICAgICAgICAgIHJvd0xlbmd0aCA9IHRpdGxlLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyh0aXRsZSk7XG4gICAgICAgIHZhciBzZXAgPSAnLScsIGssIGxpbmUgPSAnJztcbiAgICAgICAgZm9yIChrID0gMDsgayA8IHJvd0xlbmd0aDsgayArPSAxKSB7XG4gICAgICAgICAgbGluZSArPSBzZXA7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2cobGluZSk7XG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZyhzdHIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9iamVjdFRvQXJyYXkob2JqKSB7XG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iaik7XG4gICAgICByZXR1cm4ga2V5cy5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgIHZhbHVlOiBvYmpba2V5XVxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcob2JqKSB7XG4gICAgICByZXR1cm4gYXJyYXlUb1N0cmluZyhvYmplY3RUb0FycmF5KG9iaikpO1xuICAgIH1cblxuICAgIGNvbnNvbGUudGFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG5cbiAgICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMiAmJlxuICAgICAgICB0eXBlb2YgYXJnc1swXSA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgQXJyYXkuaXNBcnJheShhcmdzWzFdKSkge1xuXG4gICAgICAgIHJldHVybiBwcmludFRpdGxlVGFibGUoYXJnc1swXSwgYXJnc1sxXSk7XG4gICAgICB9XG4gICAgICBhcmdzLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgICAgaWYgKHR5cGVvZiBrID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiBjb25zb2xlLmxvZyhrKTtcbiAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGspKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coYXJyYXlUb1N0cmluZyhrKSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGsgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgY29uc29sZS5sb2cob2JqZWN0VG9TdHJpbmcoaykpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuICB9XG5cbiAgc2V0dXBDb25zb2xlVGFibGUoKTtcbn0oKSk7XG4iLCJ2YXIgcGFkTGVmdCA9IHJlcXVpcmUoJy4vdGFibGUnKS5wYWRMZWZ0XG5cbnZhciBQcmludGVyID0gZXhwb3J0cy5QcmludGVyID0gZnVuY3Rpb24gKG5hbWUsIGZvcm1hdCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAodmFsLCB3aWR0aCkge1xuICAgICAgICB2YXIgcyA9IG5hbWUgKyAnICcgKyBmb3JtYXQodmFsKVxuICAgICAgICByZXR1cm4gd2lkdGggPT0gbnVsbFxuICAgICAgICAgICAgPyBzXG4gICAgICAgICAgICA6IHBhZExlZnQocywgd2lkdGgpXG4gICAgfVxufVxuXG5cbmV4cG9ydHMuc3VtID0gZnVuY3Rpb24gKHN1bSwgdmFsKSB7XG4gICAgc3VtID0gc3VtIHx8IDBcbiAgICByZXR1cm4gc3VtICs9IHZhbFxufVxuXG5leHBvcnRzLnN1bS5wcmludGVyID0gUHJpbnRlcignXFx1MjIxMScsIFN0cmluZylcblxuXG5leHBvcnRzLmF2ZyA9IGZ1bmN0aW9uIChzdW0sIHZhbCwgaW5kZXgsIGxlbmd0aCkge1xuICAgIHN1bSA9IHN1bSB8fCAwXG4gICAgc3VtICs9IHZhbFxuICAgIHJldHVybiBpbmRleCArIDEgPT0gbGVuZ3RoXG4gICAgICAgID8gc3VtIC8gbGVuZ3RoXG4gICAgICAgIDogc3VtXG59XG5cbmV4cG9ydHMuYXZnLnByaW50ZXIgPSBQcmludGVyKCdBdmc6JywgU3RyaW5nKSIsIm1vZHVsZS5leHBvcnRzID0gc29ydFxuXG5mdW5jdGlvbiBzb3J0IChjb21wYXJhdG9yKSB7XG4gICAgaWYgKHR5cGVvZiBjb21wYXJhdG9yICE9ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFyIHNvcnRLZXlzID0gQXJyYXkuaXNBcnJheShjb21wYXJhdG9yKVxuICAgICAgICAgICAgPyBjb21wYXJhdG9yXG4gICAgICAgICAgICA6IE9iamVjdC5rZXlzKHRoaXMuY29sdW1ucylcbiAgICAgICAgY29tcGFyYXRvciA9IEtleXNDb21wYXJhdG9yKHNvcnRLZXlzKVxuICAgIH1cbiAgICB0aGlzLnJvd3Muc29ydChjb21wYXJhdG9yKVxuICAgIHJldHVybiB0aGlzXG59XG5cbmZ1bmN0aW9uIEtleXNDb21wYXJhdG9yIChrZXlzKSB7XG4gICAgdmFyIGNvbXBhcmF0b3JzID0ga2V5cy5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICB2YXIgc29ydEZuID0gJ2FzYydcblxuICAgICAgICB2YXIgbSA9IC8oLiopXFx8XFxzKihhc2N8ZGVzKVxccyokLy5leGVjKGtleSlcbiAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgIGtleSA9IG1bMV1cbiAgICAgICAgICAgIHNvcnRGbiA9IG1bMl1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgdmFyIHJldCA9IGNvbXBhcmUoYVtrZXldLCBiW2tleV0pXG4gICAgICAgICAgICByZXR1cm4gc29ydEZuID09ICdhc2MnID8gcmV0IDogLTEgKiByZXRcbiAgICAgICAgfVxuICAgIH0pXG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb21wYXJhdG9ycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHJlcyA9IGNvbXBhcmF0b3JzW2ldKGEsIGIpXG4gICAgICAgICAgICBpZiAocmVzICE9IDApIHJldHVybiByZXNcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMFxuICAgIH1cbn1cblxuZnVuY3Rpb24gY29tcGFyZSAoYSwgYikge1xuICAgIGlmIChhID09PSBiKSByZXR1cm4gMFxuICAgIGlmIChhID09PSB1bmRlZmluZWQpIHJldHVybiAxXG4gICAgaWYgKGIgPT09IHVuZGVmaW5lZCkgcmV0dXJuIC0xXG4gICAgaWYgKGEgPT09IG51bGwpIHJldHVybiAxXG4gICAgaWYgKGIgPT09IG51bGwpIHJldHVybiAtMVxuICAgIGlmIChhID4gYikgcmV0dXJuIDFcbiAgICBpZiAoYSA8IGIpIHJldHVybiAtMVxuICAgIHJldHVybiBjb21wYXJlKFN0cmluZyhhKSwgU3RyaW5nKGIpKVxufSIsIm1vZHVsZS5leHBvcnRzID0gVGFibGVcblxuVGFibGUuc3RyaW5nID0gZnVuY3Rpb24gKHZhbCkge1xuICAgIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuICcnXG4gICAgcmV0dXJuIFN0cmluZyh2YWwpXG59XG5cblRhYmxlLk51bWJlciA9IGZ1bmN0aW9uIChkaWdpdHMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHZhbCwgd2lkdGgpIHtcbiAgICAgICAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gJydcbiAgICAgICAgaWYgKHR5cGVvZiB2YWwgIT0gJ251bWJlcicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoU3RyaW5nKHZhbCkgKyAnIGlzIG5vdCBhIG51bWJlcicpXG4gICAgICAgIHZhciBzID0gZGlnaXRzID09IG51bGwgPyBTdHJpbmcodmFsKSA6IHZhbC50b0ZpeGVkKGRpZ2l0cykudG9TdHJpbmcoKVxuICAgICAgICByZXR1cm4gVGFibGUucGFkTGVmdChzLCB3aWR0aClcbiAgICB9XG59XG5cblRhYmxlLlJpZ2h0UGFkZGVyID0gZnVuY3Rpb24gKGNoYXIpIHtcbiAgICBjaGFyID0gY2hhciB8fCAnICdcbiAgICByZXR1cm4gZnVuY3Rpb24gKHZhbCwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciBzID0gU3RyaW5nKHZhbClcbiAgICAgICAgdmFyIGwgPSBzLmxlbmd0aFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aCAtIGw7IGkrKykge1xuICAgICAgICAgICAgcyArPSBjaGFyXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNcbiAgICB9XG59XG5cblRhYmxlLkxlZnRQYWRkZXIgPSBmdW5jdGlvbiAoY2hhcikge1xuICAgIGNoYXIgPSBjaGFyIHx8ICcgJ1xuICAgIHJldHVybiBmdW5jdGlvbiAodmFsLCBsZW5ndGgpIHtcbiAgICAgICAgdmFyIHJldCA9ICcnXG4gICAgICAgIHZhciBzID0gU3RyaW5nKHZhbClcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGggLSBzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICByZXQgKz0gY2hhclxuICAgICAgICB9XG4gICAgICAgIHJldCArPSBzXG4gICAgICAgIHJldHVybiByZXRcbiAgICB9XG59XG5cblRhYmxlLnBhZExlZnQgPSBUYWJsZS5MZWZ0UGFkZGVyKClcblxuVGFibGUucHJpbnRBcnJheSA9IGZ1bmN0aW9uIChhcnIsIGZvcm1hdCwgY2IpIHtcbiAgICBmb3JtYXQgPSB0eXBlb2YgZm9ybWF0ID09ICdmdW5jdGlvbicgPyBmb3JtYXQgOiBGb3JtYXR0ZXIoZm9ybWF0KVxuICAgIGNiID0gY2IgfHwgZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgcmV0dXJuIHQudG9TdHJpbmcoKVxuICAgIH1cblxuICAgIHZhciB0ID0gbmV3IFRhYmxlXG4gICAgdmFyIGNlbGwgPSB0LmNlbGwuYmluZCh0KVxuXG4gICAgYXJyLmZvckVhY2goZnVuY3Rpb24gKG9iaikge1xuICAgICAgICBmb3JtYXQob2JqLCBjZWxsKVxuICAgICAgICB0Lm5ld1JvdygpXG4gICAgfSlcbiAgICByZXR1cm4gY2IodClcbn1cblxuVGFibGUucHJpbnRPYmogPSBmdW5jdGlvbiAob2JqLCBmb3JtYXQsIGNiKSB7XG4gICAgZm9ybWF0ID0gdHlwZW9mIGZvcm1hdCA9PSAnZnVuY3Rpb24nID8gZm9ybWF0IDogRm9ybWF0dGVyKGZvcm1hdClcbiAgICBjYiA9IGNiIHx8IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIHJldHVybiB0LnByaW50VHJhbnNwb3NlZCgnIDogJylcbiAgICB9XG5cbiAgICB2YXIgdCA9IG5ldyBUYWJsZVxuICAgIGZvcm1hdChvYmosIHQuY2VsbC5iaW5kKHQpKVxuICAgIHQubmV3Um93KClcbiAgICByZXR1cm4gY2IodClcbn1cblxuZnVuY3Rpb24gRm9ybWF0dGVyIChvcHRzKSB7XG4gICAgb3B0cyA9IG9wdHMgfHwge31cbiAgICByZXR1cm4gZnVuY3Rpb24gKG9iaiwgY2VsbCkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgICAgICBpZiAoIW9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZVxuICAgICAgICAgICAgdmFyIG8gPSBvcHRzW2tleV1cbiAgICAgICAgICAgIGNlbGwoXG4gICAgICAgICAgICAgICAgKG8gJiYgby5uYW1lKSB8fCBrZXksXG4gICAgICAgICAgICAgICAgb2JqW2tleV0sXG4gICAgICAgICAgICAgICAgbyAmJiBvLnByaW50ZXIsXG4gICAgICAgICAgICAgICAgbyAmJiBvLndpZHRoXG4gICAgICAgICAgICApXG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuVGFibGUuUm93ID0gUm93XG5mdW5jdGlvbiBSb3cgKCkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcbiAgICAgICAgX19wcmludGVyczoge1xuICAgICAgICAgICAgdmFsdWU6IHt9LFxuICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgX19jZWxsOiB7XG4gICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24gKGNvbCwgdmFsLCBwcmludGVyKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tjb2xdID0gdmFsXG4gICAgICAgICAgICAgICAgdGhpcy5fX3ByaW50ZXJzW2NvbF0gPSBwcmludGVyXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2VcbiAgICAgICAgfVxuICAgIH0pXG59XG5cblxuVGFibGUucHJpbnQgPSBwcmludFxuZnVuY3Rpb24gcHJpbnQgKHJvd3MsIGNvbHVtbnMsIHNoaWZ0KSB7XG4gICAgdmFyIHBhZFNwYWNlcyA9IFRhYmxlLlJpZ2h0UGFkZGVyKClcbiAgICB2YXIgd2lkdGhzID0ge31cblxuICAgIGZ1bmN0aW9uIHNldFdpZHRoIChjb2wsIHdpZHRoKSB7XG4gICAgICAgIHZhciBpc0ZpeGVkID0gY29sdW1uc1tjb2xdLndpZHRoICE9IG51bGxcbiAgICAgICAgaWYgKGlzRml4ZWQpIHtcbiAgICAgICAgICAgIHdpZHRoc1tjb2xdID0gY29sdW1uc1tjb2xdLndpZHRoXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAod2lkdGhzW2NvbF0gPiB3aWR0aCkgcmV0dXJuXG4gICAgICAgICAgICB3aWR0aHNbY29sXSA9IHdpZHRoXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjZWxsUHJpbnRlciAocm93LCBjb2wpIHtcbiAgICAgICAgcmV0dXJuIChyb3cuX19wcmludGVycyAmJiByb3cuX19wcmludGVyc1tjb2xdKSB8fCBUYWJsZS5zdHJpbmdcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYWxjV2lkdGhzICgpIHtcbiAgICAgICAgcm93cy5mb3JFYWNoKGZ1bmN0aW9uIChyb3cpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBjb2x1bW5zKSB7XG4gICAgICAgICAgICAgICAgc2V0V2lkdGgoa2V5LCBjZWxsUHJpbnRlcihyb3csIGtleSkuY2FsbChyb3csIHJvd1trZXldKS5sZW5ndGgpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJpbnRSb3cgKGNiKSB7XG4gICAgICAgIHZhciBzID0gJydcbiAgICAgICAgdmFyIGZpcnN0Q29sdW1uID0gdHJ1ZVxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gY29sdW1ucykge1xuICAgICAgICAgICAgaWYgKCFmaXJzdENvbHVtbikgcyArPSBzaGlmdFxuICAgICAgICAgICAgZmlyc3RDb2x1bW4gPSBmYWxzZVxuICAgICAgICAgICAgdmFyIHdpZHRoID0gd2lkdGhzW2tleV1cbiAgICAgICAgICAgIHMgKz0gcHJpbnRDZWxsKGNiKGtleSwgd2lkdGgpLCB3aWR0aClcbiAgICAgICAgfVxuICAgICAgICBzICs9ICdcXG4nXG4gICAgICAgIHJldHVybiBzXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJpbnRDZWxsIChzLCB3aWR0aCkge1xuICAgICAgICBpZiAocy5sZW5ndGggPD0gd2lkdGgpIHJldHVybiBwYWRTcGFjZXMocywgd2lkdGgpXG4gICAgICAgIHMgPSBzLnNsaWNlKDAsIHdpZHRoKVxuICAgICAgICBpZiAod2lkdGggPiAzKSBzID0gcy5zbGljZSgwLCAtMykuY29uY2F0KCcuLi4nKVxuICAgICAgICByZXR1cm4gc1xuICAgIH1cblxuICAgIGNhbGNXaWR0aHMoKVxuXG4gICAgcmV0dXJuIHJvd3MubWFwKGZ1bmN0aW9uIChyb3cpIHtcbiAgICAgICAgcmV0dXJuIHByaW50Um93KGZ1bmN0aW9uIChrZXksIHdpZHRoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2VsbFByaW50ZXIocm93LCBrZXkpLmNhbGwocm93LCByb3dba2V5XSwgd2lkdGgpXG4gICAgICAgIH0pXG4gICAgfSkuam9pbignJylcblxufVxuXG5cbmZ1bmN0aW9uIFRhYmxlICgpIHtcbiAgICB0aGlzLmNvbHVtbnMgPSB7fSAvKiBAYXBpOiBwdWJsaWMgKi9cbiAgICB0aGlzLnJvd3MgPSBbXSAvKiBAYXBpOiBwdWJsaWMgKi9cbiAgICB0aGlzLl9yb3cgPSBuZXcgUm93XG59XG5cblxuVGFibGUucHJvdG90eXBlLmNlbGwgPSBmdW5jdGlvbiAoY29sLCB2YWwsIHByaW50ZXIsIHdpZHRoKSB7XG4gICAgdGhpcy5fcm93Ll9fY2VsbChjb2wsIHZhbCwgcHJpbnRlcilcbiAgICB2YXIgYyA9IHRoaXMuY29sdW1uc1tjb2xdIHx8ICh0aGlzLmNvbHVtbnNbY29sXSA9IHt9KVxuICAgIGlmICh3aWR0aCAhPSBudWxsKSBjLndpZHRoID0gd2lkdGhcbiAgICByZXR1cm4gdGhpc1xufVxuXG5UYWJsZS5wcm90b3R5cGUubmV3Um93ID0gVGFibGUucHJvdG90eXBlLm5ld0xpbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5yb3dzLnB1c2godGhpcy5fcm93KVxuICAgIHRoaXMuX3JvdyA9IG5ldyBSb3dcbiAgICByZXR1cm4gdGhpc1xufVxuXG5UYWJsZS5wcm90b3R5cGUuc29ydCA9IHJlcXVpcmUoJy4vc29ydCcpXG5cblRhYmxlLmFnZ3IgPSByZXF1aXJlKCcuL2FnZ3JlZ2F0aW9ucycpXG5cblRhYmxlLnByb3RvdHlwZS50b3RhbHMgPSBudWxsIC8qIEBhcGk6IHB1YmxpYyAqL1xuXG5UYWJsZS5wcm90b3R5cGUudG90YWwgPSBmdW5jdGlvbiAoY29sLCBmbiwgcHJpbnRlcikge1xuICAgIGZuID0gZm4gfHwgVGFibGUuYWdnci5zdW1cbiAgICBwcmludGVyID0gcHJpbnRlciB8fCBmbi5wcmludGVyXG5cbiAgICB0aGlzLnRvdGFscyA9IHRoaXMudG90YWxzIHx8IG5ldyBSb3dcblxuICAgIHZhciB2YWxcbiAgICB2YXIgcm93cyA9IHRoaXMucm93c1xuXG4gICAgdGhpcy50b3RhbHMuX19jZWxsKGNvbCwgbnVsbCwgZnVuY3Rpb24gKF8sIHdpZHRoKSB7XG4gICAgICAgIGlmICh3aWR0aCAhPSBudWxsKSByZXR1cm4gcHJpbnRlcih2YWwsIHdpZHRoKVxuICAgICAgICB2YWwgPSByb3dzLnJlZHVjZShmdW5jdGlvbiAodmFsLCByb3csIGluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gZm4odmFsLCByb3dbY29sXSwgaW5kZXgsIHJvd3MubGVuZ3RoKVxuICAgICAgICB9LCBudWxsKVxuICAgICAgICByZXR1cm4gcHJpbnRlcih2YWwpXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xufVxuXG5UYWJsZS5wcm90b3R5cGUuc2hpZnQgPSAnICAnXG5cblRhYmxlLnByb3RvdHlwZS5wcmludCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gcHJpbnQodGhpcy5yb3dzLCB0aGlzLmNvbHVtbnMsIHRoaXMuc2hpZnQpXG59XG5cblRhYmxlLnByb3RvdHlwZS5wcmludFRyYW5zcG9zZWQgPSBmdW5jdGlvbiAoZGVsaW1ldGVyKSB7XG4gICAgdmFyIHQgPSBuZXcgVGFibGVcbiAgICBpZiAoZGVsaW1ldGVyKSB0LnNoaWZ0ID0gZGVsaW1ldGVyXG5cbiAgICBmdW5jdGlvbiBQcmludGVyIChyb3csIGtleSkge1xuICAgICAgICB2YXIgcCA9IHJvdy5fX3ByaW50ZXJzICYmIHJvdy5fX3ByaW50ZXJzW2tleV1cbiAgICAgICAgaWYgKHApIHJldHVybiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICByZXR1cm4gcCh2YWwpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gdGhpcy5jb2x1bW5zKSB7XG4gICAgICAgIHQuY2VsbCgnaCcsIGtleSlcbiAgICAgICAgdGhpcy5yb3dzLmZvckVhY2goZnVuY3Rpb24gKHJvdywgaW5kZXgpIHtcbiAgICAgICAgICAgIHQuY2VsbCgnZicgKyBpbmRleCwgcm93W2tleV0sIFByaW50ZXIocm93LCBrZXkpKVxuICAgICAgICB9KVxuICAgICAgICB0Lm5ld1JvdygpXG4gICAgfVxuICAgIHJldHVybiB0LnByaW50KClcbn1cblxuVGFibGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYWRXaXRoRGFzaHMgPSBUYWJsZS5SaWdodFBhZGRlcignLScpXG4gICAgdmFyIGRlbGltZXRlciA9IHRoaXMuY3JlYXRlUm93KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFsnJywgcGFkV2l0aERhc2hzXVxuICAgIH0pXG4gICAgdmFyIGhlYWQgPSB0aGlzLmNyZWF0ZVJvdyhmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBba2V5XVxuICAgIH0pXG4gICAgdmFyIHJvd3MgPSBbaGVhZCwgZGVsaW1ldGVyXS5jb25jYXQodGhpcy5yb3dzKVxuICAgIGlmICh0aGlzLnRvdGFscykge1xuICAgICAgICByb3dzID0gcm93cy5jb25jYXQoW2RlbGltZXRlciwgdGhpcy50b3RhbHNdKVxuICAgIH1cbiAgICByZXR1cm4gcHJpbnQocm93cywgdGhpcy5jb2x1bW5zLCB0aGlzLnNoaWZ0KVxufVxuXG5UYWJsZS5wcm90b3R5cGUuY3JlYXRlUm93ID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgdmFyIHJvdyA9IG5ldyBSb3dcbiAgICBmb3IgKHZhciBrZXkgaW4gdGhpcy5jb2x1bW5zKSB7XG4gICAgICAgIHZhciBhcmdzID0gY2Ioa2V5KVxuICAgICAgICByb3cuX19jZWxsKGtleSwgYXJnc1swXSwgYXJnc1sxXSlcbiAgICB9XG4gICAgcmV0dXJuIHJvd1xufSIsIm1vZHVsZS5leHBvcnRzID0gVGFibGVcblxuZnVuY3Rpb24gVGFibGUoKSB7XG4gIHRoaXMucm93cyA9IFtdXG4gIHRoaXMucm93ID0ge19fcHJpbnRlcnMgOiB7fX1cbn1cblxuLyoqXG4gKiBQdXNoIHRoZSBjdXJyZW50IHJvdyB0byB0aGUgdGFibGUgYW5kIHN0YXJ0IGEgbmV3IG9uZVxuICpcbiAqIEByZXR1cm5zIHtUYWJsZX0gYHRoaXNgXG4gKi9cblxuVGFibGUucHJvdG90eXBlLm5ld1JvdyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnJvd3MucHVzaCh0aGlzLnJvdylcbiAgdGhpcy5yb3cgPSB7X19wcmludGVycyA6IHt9fVxuICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqIFdyaXRlIGNlbGwgaW4gdGhlIGN1cnJlbnQgcm93XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGNvbCAgICAgICAgICAtIENvbHVtbiBuYW1lXG4gKiBAcGFyYW0ge0FueX0gdmFsICAgICAgICAgICAgIC0gQ2VsbCB2YWx1ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3ByaW50ZXJdICAtIFByaW50ZXIgZnVuY3Rpb24gdG8gZm9ybWF0IHRoZSB2YWx1ZVxuICogQHJldHVybnMge1RhYmxlfSBgdGhpc2BcbiAqL1xuXG5UYWJsZS5wcm90b3R5cGUuY2VsbCA9IGZ1bmN0aW9uKGNvbCwgdmFsLCBwcmludGVyKSB7XG4gIHRoaXMucm93W2NvbF0gPSB2YWxcbiAgdGhpcy5yb3cuX19wcmludGVyc1tjb2xdID0gcHJpbnRlciB8fCBzdHJpbmdcbiAgcmV0dXJuIHRoaXNcbn1cblxuLyoqXG4gKiBTdHJpbmcgdG8gc2VwYXJhdGUgY29sdW1uc1xuICovXG5cblRhYmxlLnByb3RvdHlwZS5zZXBhcmF0b3IgPSAnICAnXG5cbmZ1bmN0aW9uIHN0cmluZyh2YWwpIHtcbiAgcmV0dXJuIHZhbCA9PT0gdW5kZWZpbmVkID8gJycgOiAnJyt2YWxcbn1cblxuZnVuY3Rpb24gbGVuZ3RoKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGQrbS9nLCAnJykubGVuZ3RoXG59XG5cbi8qKlxuICogRGVmYXVsdCBwcmludGVyXG4gKi9cblxuVGFibGUuc3RyaW5nID0gc3RyaW5nXG5cbi8qKlxuICogQ3JlYXRlIGEgcHJpbnRlciB3aGljaCByaWdodCBhbGlnbnMgdGhlIGNvbnRlbnQgYnkgcGFkZGluZyB3aXRoIGBjaGAgb24gdGhlIGxlZnRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY2hcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAqL1xuXG5UYWJsZS5sZWZ0UGFkZGVyID0gbGVmdFBhZGRlclxuXG5mdW5jdGlvbiBsZWZ0UGFkZGVyKGNoKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWwsIHdpZHRoKSB7XG4gICAgdmFyIHN0ciA9IHN0cmluZyh2YWwpXG4gICAgdmFyIGxlbiA9IGxlbmd0aChzdHIpXG4gICAgdmFyIHBhZCA9IHdpZHRoID4gbGVuID8gQXJyYXkod2lkdGggLSBsZW4gKyAxKS5qb2luKGNoKSA6ICcnXG4gICAgcmV0dXJuIHBhZCArIHN0clxuICB9XG59XG5cbi8qKlxuICogUHJpbnRlciB3aGljaCByaWdodCBhbGlnbnMgdGhlIGNvbnRlbnRcbiAqL1xuXG52YXIgcGFkTGVmdCA9IFRhYmxlLnBhZExlZnQgPSBsZWZ0UGFkZGVyKCcgJylcblxuLyoqXG4gKiBDcmVhdGUgYSBwcmludGVyIHdoaWNoIHBhZHMgd2l0aCBgY2hgIG9uIHRoZSByaWdodFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjaFxuICogQHJldHVybnMge0Z1bmN0aW9ufVxuICovXG5cblRhYmxlLnJpZ2h0UGFkZGVyID0gcmlnaHRQYWRkZXJcblxuZnVuY3Rpb24gcmlnaHRQYWRkZXIoY2gpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIHBhZFJpZ2h0KHZhbCwgd2lkdGgpIHtcbiAgICB2YXIgc3RyID0gc3RyaW5nKHZhbClcbiAgICB2YXIgbGVuID0gbGVuZ3RoKHN0cilcbiAgICB2YXIgcGFkID0gd2lkdGggPiBsZW4gPyBBcnJheSh3aWR0aCAtIGxlbiArIDEpLmpvaW4oY2gpIDogJydcbiAgICByZXR1cm4gc3RyICsgcGFkXG4gIH1cbn1cblxudmFyIHBhZFJpZ2h0ID0gcmlnaHRQYWRkZXIoJyAnKVxuXG4vKipcbiAqIENyZWF0ZSBhIHByaW50ZXIgZm9yIG51bWJlcnNcbiAqXG4gKiBXaWxsIGRvIHJpZ2h0IGFsaWdubWVudCBhbmQgb3B0aW9uYWxseSBmaXggdGhlIG51bWJlciBvZiBkaWdpdHMgYWZ0ZXIgZGVjaW1hbCBwb2ludFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBbZGlnaXRzXSAtIE51bWJlciBvZiBkaWdpdHMgZm9yIGZpeHBvaW50IG5vdGF0aW9uXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gKi9cblxuVGFibGUubnVtYmVyID0gZnVuY3Rpb24oZGlnaXRzKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWwsIHdpZHRoKSB7XG4gICAgaWYgKHZhbCA9PSBudWxsKSByZXR1cm4gJydcbiAgICBpZiAodHlwZW9mIHZhbCAhPSAnbnVtYmVyJylcbiAgICAgIHRocm93IG5ldyBFcnJvcignJyt2YWwgKyAnIGlzIG5vdCBhIG51bWJlcicpXG4gICAgdmFyIHN0ciA9IGRpZ2l0cyA9PSBudWxsID8gdmFsKycnIDogdmFsLnRvRml4ZWQoZGlnaXRzKVxuICAgIHJldHVybiBwYWRMZWZ0KHN0ciwgd2lkdGgpXG4gIH1cbn1cblxuZnVuY3Rpb24gZWFjaChyb3csIGZuKSB7XG4gIGZvcih2YXIga2V5IGluIHJvdykge1xuICAgIGlmIChrZXkgPT0gJ19fcHJpbnRlcnMnKSBjb250aW51ZVxuICAgIGZuKGtleSwgcm93W2tleV0pXG4gIH1cbn1cblxuLyoqXG4gKiBHZXQgbGlzdCBvZiBjb2x1bW5zIGluIHByaW50aW5nIG9yZGVyXG4gKlxuICogQHJldHVybnMge3N0cmluZ1tdfVxuICovXG5cblRhYmxlLnByb3RvdHlwZS5jb2x1bW5zID0gZnVuY3Rpb24oKSB7XG4gIHZhciBjb2xzID0ge31cbiAgZm9yKHZhciBpID0gMDsgaSA8IDI7IGkrKykgeyAvLyBkbyAyIHRpbWVzXG4gICAgdGhpcy5yb3dzLmZvckVhY2goZnVuY3Rpb24ocm93KSB7XG4gICAgICB2YXIgaWR4ID0gMFxuICAgICAgZWFjaChyb3csIGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBpZHggPSBNYXRoLm1heChpZHgsIGNvbHNba2V5XSB8fCAwKVxuICAgICAgICBjb2xzW2tleV0gPSBpZHhcbiAgICAgICAgaWR4KytcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuICByZXR1cm4gT2JqZWN0LmtleXMoY29scykuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGNvbHNbYV0gLSBjb2xzW2JdXG4gIH0pXG59XG5cbi8qKlxuICogRm9ybWF0IGp1c3Qgcm93cywgaS5lLiBwcmludCB0aGUgdGFibGUgd2l0aG91dCBoZWFkZXJzIGFuZCB0b3RhbHNcbiAqXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBTdHJpbmcgcmVwcmVzZW50YWlvbiBvZiB0aGUgdGFibGVcbiAqL1xuXG5UYWJsZS5wcm90b3R5cGUucHJpbnQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGNvbHMgPSB0aGlzLmNvbHVtbnMoKVxuICB2YXIgc2VwYXJhdG9yID0gdGhpcy5zZXBhcmF0b3JcbiAgdmFyIHdpZHRocyA9IHt9XG4gIHZhciBvdXQgPSAnJ1xuXG4gIC8vIENhbGMgd2lkdGhzXG4gIHRoaXMucm93cy5mb3JFYWNoKGZ1bmN0aW9uKHJvdykge1xuICAgIGVhY2gocm93LCBmdW5jdGlvbihrZXksIHZhbCkge1xuICAgICAgdmFyIHN0ciA9IHJvdy5fX3ByaW50ZXJzW2tleV0uY2FsbChyb3csIHZhbClcbiAgICAgIHdpZHRoc1trZXldID0gTWF0aC5tYXgobGVuZ3RoKHN0ciksIHdpZHRoc1trZXldIHx8IDApXG4gICAgfSlcbiAgfSlcblxuICAvLyBOb3cgcHJpbnRcbiAgdGhpcy5yb3dzLmZvckVhY2goZnVuY3Rpb24ocm93KSB7XG4gICAgdmFyIGxpbmUgPSAnJ1xuICAgIGNvbHMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciB3aWR0aCA9IHdpZHRoc1trZXldXG4gICAgICB2YXIgc3RyID0gcm93Lmhhc093blByb3BlcnR5KGtleSlcbiAgICAgICAgPyAnJytyb3cuX19wcmludGVyc1trZXldLmNhbGwocm93LCByb3dba2V5XSwgd2lkdGgpXG4gICAgICAgIDogJydcbiAgICAgIGxpbmUgKz0gcGFkUmlnaHQoc3RyLCB3aWR0aCkgKyBzZXBhcmF0b3JcbiAgICB9KVxuICAgIGxpbmUgPSBsaW5lLnNsaWNlKDAsIC1zZXBhcmF0b3IubGVuZ3RoKVxuICAgIG91dCArPSBsaW5lICsgJ1xcbidcbiAgfSlcblxuICByZXR1cm4gb3V0XG59XG5cbi8qKlxuICogRm9ybWF0IHRoZSB0YWJsZVxuICpcbiAqIEByZXR1cm5zIHtTdHJpbmd9XG4gKi9cblxuVGFibGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHZhciBjb2xzID0gdGhpcy5jb2x1bW5zKClcbiAgdmFyIG91dCA9IG5ldyBUYWJsZSgpXG5cbiAgLy8gY29weSBvcHRpb25zXG4gIG91dC5zZXBhcmF0b3IgPSB0aGlzLnNlcGFyYXRvclxuXG4gIC8vIFdyaXRlIGhlYWRlclxuICBjb2xzLmZvckVhY2goZnVuY3Rpb24oY29sKSB7XG4gICAgb3V0LmNlbGwoY29sLCBjb2wpXG4gIH0pXG4gIG91dC5uZXdSb3coKVxuICBvdXQucHVzaERlbGltZXRlcihjb2xzKVxuXG4gIC8vIFdyaXRlIGJvZHlcbiAgb3V0LnJvd3MgPSBvdXQucm93cy5jb25jYXQodGhpcy5yb3dzKVxuXG4gIC8vIFRvdGFsc1xuICBpZiAodGhpcy50b3RhbHMgJiYgdGhpcy5yb3dzLmxlbmd0aCkge1xuICAgIG91dC5wdXNoRGVsaW1ldGVyKGNvbHMpXG4gICAgdGhpcy5mb3JFYWNoVG90YWwob3V0LmNlbGwuYmluZChvdXQpKVxuICAgIG91dC5uZXdSb3coKVxuICB9XG5cbiAgcmV0dXJuIG91dC5wcmludCgpXG59XG5cbi8qKlxuICogUHVzaCBkZWxpbWV0ZXIgcm93IHRvIHRoZSB0YWJsZSAod2l0aCBlYWNoIGNlbGwgZmlsbGVkIHdpdGggZGFzaHMgZHVyaW5nIHByaW50aW5nKVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nW119IFtjb2xzXVxuICogQHJldHVybnMge1RhYmxlfSBgdGhpc2BcbiAqL1xuXG5UYWJsZS5wcm90b3R5cGUucHVzaERlbGltZXRlciA9IGZ1bmN0aW9uKGNvbHMpIHtcbiAgY29scyA9IGNvbHMgfHwgdGhpcy5jb2x1bW5zKClcbiAgY29scy5mb3JFYWNoKGZ1bmN0aW9uKGNvbCkge1xuICAgIHRoaXMuY2VsbChjb2wsIHVuZGVmaW5lZCwgbGVmdFBhZGRlcignLScpKVxuICB9LCB0aGlzKVxuICByZXR1cm4gdGhpcy5uZXdSb3coKVxufVxuXG4vKipcbiAqIENvbXB1dGUgYWxsIHRvdGFscyBhbmQgeWllbGQgdGhlIHJlc3VsdHMgdG8gYGNiYFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gQ2FsbGJhY2sgZnVuY3Rpb24gd2l0aCBzaWduYXR1cmUgYChjb2x1bW4sIHZhbHVlLCBwcmludGVyKWBcbiAqL1xuXG5UYWJsZS5wcm90b3R5cGUuZm9yRWFjaFRvdGFsID0gZnVuY3Rpb24oY2IpIHtcbiAgZm9yKHZhciBrZXkgaW4gdGhpcy50b3RhbHMpIHtcbiAgICB2YXIgYWdnciA9IHRoaXMudG90YWxzW2tleV1cbiAgICB2YXIgYWNjID0gYWdnci5pbml0XG4gICAgdmFyIGxlbiA9IHRoaXMucm93cy5sZW5ndGhcbiAgICB0aGlzLnJvd3MuZm9yRWFjaChmdW5jdGlvbihyb3csIGlkeCkge1xuICAgICAgYWNjID0gYWdnci5yZWR1Y2UuY2FsbChyb3csIGFjYywgcm93W2tleV0sIGlkeCwgbGVuKVxuICAgIH0pXG4gICAgY2Ioa2V5LCBhY2MsIGFnZ3IucHJpbnRlcilcbiAgfVxufVxuXG4vKipcbiAqIEZvcm1hdCB0aGUgdGFibGUgc28gdGhhdCBlYWNoIHJvdyByZXByZXNlbnRzIGNvbHVtbiBhbmQgZWFjaCBjb2x1bW4gcmVwcmVzZW50cyByb3dcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdHNdXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wcy5zZXBhcmF0b3JdIC0gQ29sdW1uIHNlcGFyYXRpb24gc3RyaW5nXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbb3B0cy5uYW1lUHJpbnRlcl0gLSBQcmludGVyIHRvIGZvcm1hdCBjb2x1bW4gbmFtZXNcbiAqIEByZXR1cm5zIHtTdHJpbmd9XG4gKi9cblxuVGFibGUucHJvdG90eXBlLnByaW50VHJhbnNwb3NlZCA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgb3B0cyA9IG9wdHMgfHwge31cbiAgdmFyIG91dCA9IG5ldyBUYWJsZVxuICBvdXQuc2VwYXJhdG9yID0gb3B0cy5zZXBhcmF0b3IgfHwgdGhpcy5zZXBhcmF0b3JcbiAgdGhpcy5jb2x1bW5zKCkuZm9yRWFjaChmdW5jdGlvbihjb2wpIHtcbiAgICBvdXQuY2VsbCgwLCBjb2wsIG9wdHMubmFtZVByaW50ZXIpXG4gICAgdGhpcy5yb3dzLmZvckVhY2goZnVuY3Rpb24ocm93LCBpZHgpIHtcbiAgICAgIG91dC5jZWxsKGlkeCsxLCByb3dbY29sXSwgcm93Ll9fcHJpbnRlcnNbY29sXSlcbiAgICB9KVxuICAgIG91dC5uZXdSb3coKVxuICB9LCB0aGlzKVxuICByZXR1cm4gb3V0LnByaW50KClcbn1cblxuLyoqXG4gKiBTb3J0IHRoZSB0YWJsZVxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb258c3RyaW5nW119IFtjbXBdIC0gRWl0aGVyIGNvbXBhcmUgZnVuY3Rpb24gb3IgYSBsaXN0IG9mIGNvbHVtbnMgdG8gc29ydCBvblxuICogQHJldHVybnMge1RhYmxlfSBgdGhpc2BcbiAqL1xuXG5UYWJsZS5wcm90b3R5cGUuc29ydCA9IGZ1bmN0aW9uKGNtcCkge1xuICBpZiAodHlwZW9mIGNtcCA9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhpcy5yb3dzLnNvcnQoY21wKVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICB2YXIga2V5cyA9IEFycmF5LmlzQXJyYXkoY21wKSA/IGNtcCA6IHRoaXMuY29sdW1ucygpXG5cbiAgdmFyIGNvbXBhcmF0b3JzID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIG9yZGVyID0gJ2FzYydcbiAgICB2YXIgbSA9IC8oLiopXFx8XFxzKihhc2N8ZGVzKVxccyokLy5leGVjKGtleSlcbiAgICBpZiAobSkge1xuICAgICAga2V5ID0gbVsxXVxuICAgICAgb3JkZXIgPSBtWzJdXG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgcmV0dXJuIG9yZGVyID09ICdhc2MnXG4gICAgICAgID8gY29tcGFyZShhW2tleV0sIGJba2V5XSlcbiAgICAgICAgOiBjb21wYXJlKGJba2V5XSwgYVtrZXldKVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gdGhpcy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbXBhcmF0b3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgb3JkZXIgPSBjb21wYXJhdG9yc1tpXShhLCBiKVxuICAgICAgaWYgKG9yZGVyICE9IDApIHJldHVybiBvcmRlclxuICAgIH1cbiAgICByZXR1cm4gMFxuICB9KVxufVxuXG5mdW5jdGlvbiBjb21wYXJlKGEsIGIpIHtcbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG4gIGlmIChhID09PSB1bmRlZmluZWQpIHJldHVybiAxXG4gIGlmIChiID09PSB1bmRlZmluZWQpIHJldHVybiAtMVxuICBpZiAoYSA9PT0gbnVsbCkgcmV0dXJuIDFcbiAgaWYgKGIgPT09IG51bGwpIHJldHVybiAtMVxuICBpZiAoYSA+IGIpIHJldHVybiAxXG4gIGlmIChhIDwgYikgcmV0dXJuIC0xXG4gIHJldHVybiBjb21wYXJlKFN0cmluZyhhKSwgU3RyaW5nKGIpKVxufVxuXG4vKipcbiAqIEFkZCBhIHRvdGFsIGZvciB0aGUgY29sdW1uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGNvbCAtIGNvbHVtbiBuYW1lXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdHNdXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbb3B0cy5yZWR1Y2UgPSBzdW1dIC0gcmVkdWNlKGFjYywgdmFsLCBpZHgsIGxlbmd0aCkgZnVuY3Rpb24gdG8gY29tcHV0ZSB0aGUgdG90YWwgdmFsdWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtvcHRzLnByaW50ZXIgPSBwYWRMZWZ0XSAtIFByaW50ZXIgdG8gZm9ybWF0IHRoZSB0b3RhbCBjZWxsXG4gKiBAcGFyYW0ge0FueX0gW29wdHMuaW5pdCA9IDBdIC0gSW5pdGlhbCB2YWx1ZSBmb3IgcmVkdWN0aW9uXG4gKiBAcmV0dXJucyB7VGFibGV9IGB0aGlzYFxuICovXG5cblRhYmxlLnByb3RvdHlwZS50b3RhbCA9IGZ1bmN0aW9uKGNvbCwgb3B0cykge1xuICBvcHRzID0gb3B0cyB8fCB7fVxuICB0aGlzLnRvdGFscyA9IHRoaXMudG90YWxzIHx8IHt9XG4gIHRoaXMudG90YWxzW2NvbF0gPSB7XG4gICAgcmVkdWNlOiBvcHRzLnJlZHVjZSB8fCBUYWJsZS5hZ2dyLnN1bSxcbiAgICBwcmludGVyOiBvcHRzLnByaW50ZXIgfHwgcGFkTGVmdCxcbiAgICBpbml0OiBvcHRzLmluaXQgPT0gbnVsbCA/IDAgOiBvcHRzLmluaXRcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqIFByZWRlZmluZWQgaGVscGVycyBmb3IgdG90YWxzXG4gKi9cblxuVGFibGUuYWdnciA9IHt9XG5cbi8qKlxuICogQ3JlYXRlIGEgcHJpbnRlciB3aGljaCBmb3JtYXRzIHRoZSB2YWx1ZSB3aXRoIGBwcmludGVyYCxcbiAqIGFkZHMgdGhlIGBwcmVmaXhgIHRvIGl0IGFuZCByaWdodCBhbGlnbnMgdGhlIHdob2xlIHRoaW5nXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHByZWZpeFxuICogQHBhcmFtIHtGdW5jdGlvbn0gcHJpbnRlclxuICogQHJldHVybnMge3ByaW50ZXJ9XG4gKi9cblxuVGFibGUuYWdnci5wcmludGVyID0gZnVuY3Rpb24ocHJlZml4LCBwcmludGVyKSB7XG4gIHByaW50ZXIgPSBwcmludGVyIHx8IHN0cmluZ1xuICByZXR1cm4gZnVuY3Rpb24odmFsLCB3aWR0aCkge1xuICAgIHJldHVybiBwYWRMZWZ0KHByZWZpeCArIHByaW50ZXIodmFsKSwgd2lkdGgpXG4gIH1cbn1cblxuLyoqXG4gKiBTdW0gcmVkdWN0aW9uXG4gKi9cblxuVGFibGUuYWdnci5zdW0gPSBmdW5jdGlvbihhY2MsIHZhbCkge1xuICByZXR1cm4gYWNjICsgdmFsXG59XG5cbi8qKlxuICogQXZlcmFnZSByZWR1Y3Rpb25cbiAqL1xuXG5UYWJsZS5hZ2dyLmF2ZyA9IGZ1bmN0aW9uKGFjYywgdmFsLCBpZHgsIGxlbikge1xuICBhY2MgPSBhY2MgKyB2YWxcbiAgcmV0dXJuIGlkeCArIDEgPT0gbGVuID8gYWNjL2xlbiA6IGFjY1xufVxuXG4vKipcbiAqIFByaW50IHRoZSBhcnJheSBvciBvYmplY3RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fE9iamVjdH0gb2JqIC0gT2JqZWN0IHRvIHByaW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdH0gW2Zvcm1hdF0gLSBGb3JtYXQgb3B0aW9uc1xuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXSAtIFRhYmxlIHBvc3QgcHJvY2Vzc2luZyBhbmQgZm9ybWF0aW5nXG4gKiBAcmV0dXJucyB7U3RyaW5nfVxuICovXG5cblRhYmxlLnByaW50ID0gZnVuY3Rpb24ob2JqLCBmb3JtYXQsIGNiKSB7XG4gIHZhciBvcHRzID0gZm9ybWF0IHx8IHt9XG5cbiAgZm9ybWF0ID0gdHlwZW9mIGZvcm1hdCA9PSAnZnVuY3Rpb24nXG4gICAgPyBmb3JtYXRcbiAgICA6IGZ1bmN0aW9uKG9iaiwgY2VsbCkge1xuICAgICAgZm9yKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmICghb2JqLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlXG4gICAgICAgIHZhciBwYXJhbXMgPSBvcHRzW2tleV0gfHwge31cbiAgICAgICAgY2VsbChwYXJhbXMubmFtZSB8fCBrZXksIG9ialtrZXldLCBwYXJhbXMucHJpbnRlcilcbiAgICAgIH1cbiAgICB9XG5cbiAgdmFyIHQgPSBuZXcgVGFibGVcbiAgdmFyIGNlbGwgPSB0LmNlbGwuYmluZCh0KVxuXG4gIGlmIChBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICBjYiA9IGNiIHx8IGZ1bmN0aW9uKHQpIHsgcmV0dXJuIHQudG9TdHJpbmcoKSB9XG4gICAgb2JqLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgZm9ybWF0KGl0ZW0sIGNlbGwpXG4gICAgICB0Lm5ld1JvdygpXG4gICAgfSlcbiAgfSBlbHNlIHtcbiAgICBjYiA9IGNiIHx8IGZ1bmN0aW9uKHQpIHsgcmV0dXJuIHQucHJpbnRUcmFuc3Bvc2VkKHtzZXBhcmF0b3I6ICcgOiAnfSkgfVxuICAgIGZvcm1hdChvYmosIGNlbGwpXG4gICAgdC5uZXdSb3coKVxuICB9XG5cbiAgcmV0dXJuIGNiKHQpXG59XG5cbi8qKlxuICogU2FtZSBhcyBgVGFibGUucHJpbnQoKWAgYnV0IHlpZWxkcyB0aGUgcmVzdWx0IHRvIGBjb25zb2xlLmxvZygpYFxuICovXG5cblRhYmxlLmxvZyA9IGZ1bmN0aW9uKG9iaiwgZm9ybWF0LCBjYikge1xuICBjb25zb2xlLmxvZyhUYWJsZS5wcmludChvYmosIGZvcm1hdCwgY2IpKVxufVxuXG4vKipcbiAqIFNhbWUgYXMgYC50b1N0cmluZygpYCBidXQgeWllbGRzIHRoZSByZXN1bHQgdG8gYGNvbnNvbGUubG9nKClgXG4gKi9cblxuVGFibGUucHJvdG90eXBlLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZyh0aGlzLnRvU3RyaW5nKCkpXG59XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gcHJvZmlsZTtcblxuZnVuY3Rpb24gcHJvZmlsZShmbiwgY29uZmlnKSB7XG5cbiAgICBpZiAoIShmbiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGZ1bmN0aW9uIHRvIHByb2ZpbGUhJyk7XG4gICAgfVxuXG4gICAgY29uZmlnID0gdXRpbHMuY29uZmlndXJlKGNvbmZpZywge1xuICAgICAgICBsaW1pdEl0ZXJhdGlvbnM6IDFlMyxcbiAgICAgICAgbGltaXRUaW1lOiAxMDBcbiAgICB9KTtcblxuICAgIHZhciBzdGFydGVkID0gRGF0ZS5ub3coKTtcbiAgICB2YXIgbGFzdFJlc3VsdCxcbiAgICAgICAgZWxhcHNlZCxcbiAgICAgICAgb3BlcmF0aW9ucyA9IDA7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuXG4gICAgICAgIGxhc3RSZXN1bHQgPSBmbigpO1xuICAgICAgICBlbGFwc2VkID0gRGF0ZS5ub3coKSAtIHN0YXJ0ZWQ7XG4gICAgICAgIG9wZXJhdGlvbnMrKztcblxuICAgICAgICBpZiAoZWxhcHNlZCA+PSBjb25maWcubGltaXRUaW1lXG4gICAgICAgIHx8ICBvcGVyYXRpb25zID49IGNvbmZpZy5saW1pdEl0ZXJhdGlvbnMpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgb3BzOiBvcGVyYXRpb25zIC8gZWxhcHNlZCAqIDEwMDAsXG4gICAgICAgIHRpbWU6IGVsYXBzZWQgLyBvcGVyYXRpb25zLFxuICAgICAgICBsYXN0UmVzdWx0OiBsYXN0UmVzdWx0XG4gICAgfTtcbn0iLCJyZXF1aXJlKCdjb25zb2xlLnRhYmxlJyk7XG52YXIgZWFzeVRhYmxlID0gcmVxdWlyZSgnZWFzeS10YWJsZScpO1xuLy92YXIgVGFibGUgPSByZXF1aXJlKCdlYXN5LXRhYmxlJyk7XG5cbnZhciBzdWl0ZSA9IHJlcXVpcmUoJy4vc3VpdGUnKTtcbnZhciBmb3JtYXROdW1iZXIgPSByZXF1aXJlKCcuL3V0aWxzJykuZm9ybWF0TnVtYmVyO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXBvcnQ7XG5cbmZ1bmN0aW9uIHJlcG9ydChyZXN1bHQsIG9wdGlvbnMpIHtcblxuICAgIHJlc3VsdCA9IHJlc3VsdC5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IHgubmFtZSxcbiAgICAgICAgICAgIG9wczogdXRpbHMuZm9ybWF0TnVtYmVyKHgub3BzKSxcbiAgICAgICAgICAgIHRpbWU6IHV0aWxzLmZvcm1hdE51bWJlcih4LnRpbWUpXG4gICAgICAgIH07XG4gICAgfSk7XG4gICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICBjb25zb2xlLnRhYmxlKHJlc3VsdCk7XG4gICAgcmV0dXJuO1xuXG4gICAgdmFyIGdldE1heExlbmd0aCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgdmFyIGhlYWRlckxlbmd0aCA9IGhlYWRlcnNba2V5XS5sZW5ndGg7XG5cbiAgICAgICAgdmFyIGNvbHVtbiA9IHJlc3VsdC5tYXAodXRpbHMucHJvcChrZXkpKTtcbiAgICAgICAgdmFyIGNvbHVtbkxlbmd0aCA9IGNvbHVtbi5tYXAodXRpbHMucHJvcCgnbGVuZ3RoJykpO1xuICAgICAgICB2YXIgbWF4Q29sdW1uTGVuZ3RoID0gdXRpbHMubWF4KGNvbHVtbkxlbmd0aCk7XG5cbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KGhlYWRlckxlbmd0aCwgbWF4Q29sdW1uTGVuZ3RoKTtcbiAgICB9O1xuXG4gICAgdmFyIGdldENoYXJ0TGVuZ3RoID0gZnVuY3Rpb24gKHgsIG1heE9wcykge1xuICAgICAgICB2YXIgY2hhcnRXaWR0aCA9IGNvbmZpZy5jaGFydFdpZHRoIC0gMTtcbiAgICAgICAgdmFyIGsgPSB4Lm9yaWdpbmFsLm9wcyAvIG1heE9wcztcbiAgICAgICAgaWYgKGlzTmFOKGspKSB7XG4gICAgICAgICAgICByZXR1cm4gY2hhcnRXaWR0aDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTWF0aC5yb3VuZChjaGFydFdpZHRoICogayk7XG4gICAgfTtcblxuICAgIC8vIGluaXRcblxuICAgIHZhciBjb25maWcgPSB7XG4gICAgICAgIGNoYXJ0V2lkdGg6IDIwXG4gICAgfTtcblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PSAnb2JqZWN0JyApIHtcbiAgICAgICAgT2JqZWN0LmtleXMob3B0aW9ucykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICBjb25maWdba2V5XSA9IG9wdGlvbnNba2V5XTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gY29sdW1uIGhlYWRlcnNcbiAgICB2YXIgaGVhZGVycyA9IHtcbiAgICAgICAgbmFtZTogJ05hbWUnLFxuICAgICAgICBvcHM6ICdJdGVyYXRpb25zIHBlciBzZWNvbmQnLFxuICAgICAgICB0aW1lOiAnQXZlcmFnZSB0aW1lLCBtcycsXG4gICAgICAgIGNoYXJ0OiAneCdcbiAgICB9O1xuXG4gICAgLy8gbWF4IG9wZXJhdGlvbnMgcGVyIHNlY29uZCB2YWx1ZVxuICAgIHZhciBtYXhPcHMgPSB1dGlscy5tYXgocmVzdWx0Lm1hcCh1dGlscy5wcm9wKCdvcHMnKSkpO1xuXG4gICAgLy8gZm9ybWF0dGluZ1xuICAgIHJlc3VsdCA9IHJlc3VsdC5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IHgubmFtZSxcbiAgICAgICAgICAgIG9wczogdXRpbHMuZm9ybWF0TnVtYmVyKHgub3BzKSxcbiAgICAgICAgICAgIHRpbWU6IHV0aWxzLmZvcm1hdE51bWJlcih4LnRpbWUpLFxuICAgICAgICAgICAgbGFzdFJlc3VsdDogeC5sYXN0UmVzdWx0LFxuICAgICAgICAgICAgb3JpZ2luYWw6IHhcbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIC8vIGNvbHVtbnMnIHdpZHRoc1xuICAgIHZhciBuYW1lTWF4TGVuZ3RoID0gZ2V0TWF4TGVuZ3RoKCduYW1lJyk7XG4gICAgdmFyIG9wc01heExlbmd0aCA9IGdldE1heExlbmd0aCgnb3BzJyk7XG4gICAgdmFyIHRpbWVNYXhMZW5ndGggPSBnZXRNYXhMZW5ndGgoJ3RpbWUnKTtcblxuICAgIC8vIGZpbmFsIHByb2Nlc3NpbmcgYW5kIG91dHB1dFxuICAgIHZhciByb3dTZXBhcmF0b3IgPSAnXFxuJztcbiAgICB2YXIgY2VsbFNlcGFyYXRvciA9ICcgfCAnO1xuXG4gICAgdmFyIHJvd3MgPSByZXN1bHRcbiAgICAgICAgLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICB1dGlscy5wYWQoeC5uYW1lLCBuYW1lTWF4TGVuZ3RoKSxcbiAgICAgICAgICAgICAgICB1dGlscy5wYWQoeC5vcHMsIG9wc01heExlbmd0aCksXG4gICAgICAgICAgICAgICAgdXRpbHMucGFkKHgudGltZSwgdGltZU1heExlbmd0aCksXG4gICAgICAgICAgICAgICAgdXRpbHMucGFkKHV0aWxzLnJlcGVhdCgnPScsIGdldENoYXJ0TGVuZ3RoKHgsIG1heE9wcykpICsgJz4nLCBjb25maWcuY2hhcnRXaWR0aClcbiAgICAgICAgICAgIF0uam9pbihjZWxsU2VwYXJhdG9yKTtcbiAgICAgICAgfSk7XG5cbiAgICBoZWFkZXJzID0gW1xuICAgICAgICB1dGlscy5wYWQoaGVhZGVycy5uYW1lLCBuYW1lTWF4TGVuZ3RoKSxcbiAgICAgICAgdXRpbHMucGFkKGhlYWRlcnMub3BzLCBvcHNNYXhMZW5ndGgpLFxuICAgICAgICB1dGlscy5wYWRMZWZ0KGhlYWRlcnMudGltZSwgdGltZU1heExlbmd0aCksXG4gICAgICAgIHV0aWxzLnBhZChoZWFkZXJzLmNoYXJ0LCBjb25maWcuY2hhcnRXaWR0aClcbiAgICBdO1xuXG4gICAgdmFyIHByZWZpeCA9ICd8ICc7XG4gICAgdmFyIHN1ZmZpeCA9ICcgfCc7XG5cbiAgICB2YXIgb3V0cHV0ID0gW107XG4gICAgdmFyIHRvdGFsV2lkdGggPSByb3dzWzBdLmxlbmd0aCArIHByZWZpeC5sZW5ndGggKyBzdWZmaXgubGVuZ3RoO1xuICAgIHZhciBob3Jpem9udGFsTGluZSA9ICcrJyArIHV0aWxzLnJlcGVhdCgnLScsIHRvdGFsV2lkdGggLSAyKSArICcrJztcblxuICAgIG91dHB1dC5wdXNoKGhvcml6b250YWxMaW5lKTtcbiAgICBvdXRwdXQucHVzaChwcmVmaXggKyBoZWFkZXJzLmpvaW4oY2VsbFNlcGFyYXRvcikgKyBzdWZmaXgpO1xuICAgIG91dHB1dC5wdXNoKGhvcml6b250YWxMaW5lKTtcbiAgICBvdXRwdXQucHVzaChyb3dzLm1hcChmdW5jdGlvbiAoeCwgaSkge1xuICAgICAgICB2YXIgY29sb3IgPSBpID09IDAgJiYgJ2dyZWVuJ1xuICAgICAgICAgICAgICAgIHx8ICBpID09IDEgJiYgJ3llbGxvdydcbiAgICAgICAgICAgICAgICB8fCAgICAgICAgICAgICdyZXNldCc7XG4gICAgICAgIHggPSBjaGFsa1tjb2xvcl0oeCk7XG4gICAgICAgIHJldHVybiBwcmVmaXggKyB4ICsgc3VmZml4O1xuICAgIH0pLmpvaW4ocm93U2VwYXJhdG9yKSk7XG4gICAgb3V0cHV0LnB1c2goaG9yaXpvbnRhbExpbmUpO1xuXG4gICAgcmV0dXJuIG91dHB1dC5qb2luKCdcXG4nKTtcbn0iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgcHJvZmlsZSA9IHJlcXVpcmUoJy4vcHJvZmlsZScpO1xudmFyIHJlcG9ydCA9IHJlcXVpcmUoJy4vcmVwb3J0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gc3VpdGU7XG5cbmZ1bmN0aW9uIGV4dHJhY3RGdW5jdGlvbk5hbWUoZm4pIHtcbiAgICB2YXIgZXhjbHVkZSA9IFsnZnVuY3Rpb24nLCAncmV0dXJuJ107XG4gICAgdmFyIHdvcmRzID0gZm5cbiAgICAgICAgLnRvU3RyaW5nKClcbiAgICAgICAgLnJlcGxhY2UoLyEuKiQvLCAnJylcbiAgICAgICAgLm1hdGNoKC8oW1xcd10rKS9nKVxuICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gZXhjbHVkZS5pbmRleE9mKHgudHJpbSgpKSA9PSAtMTtcbiAgICAgICAgfSk7XG4gICAgcmV0dXJuIHV0aWxzLmNyb3Aod29yZHMuam9pbignICcpLnRyaW0oKSwgMjApO1xufVxuXG5mdW5jdGlvbiBzdWl0ZShzcGVjcywgY29uZmlnKSB7XG4gICAgc3BlY3MgPSBzcGVjcyB8fCBbXTtcbiAgICBjb25maWcgPSB1dGlscy5jb25maWd1cmUoY29uZmlnLCB7XG4gICAgICAgIGxpbWl0VGltZTogMSwgLy8gcHJvZmlsZVxuICAgICAgICBsaW1pdEl0ZXJhdGlvbnM6IDEsICAvLyBwcm9maWxlXG4gICAgICAgIHJlcGVhdFRpbWVzOiAxLFxuICAgICAgICBwcmludFJlcG9ydDogZmFsc2UsXG4gICAgICAgIGNhY2hlV2FybVVwSXRlcmF0aW9uczogMCxcbiAgICAgICAgY2hhcnRXaWR0aDogMjAgLy8gcmVwb3J0XG4gICAgfSk7XG5cbiAgICB2YXIgcmVwZWF0Rm4gPSBmdW5jdGlvbiAoZm4sIHRpbWVzKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRpbWVzOyBpKyspIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgc3VpdGVSZXN1bHQgPSBzcGVjcy5tYXAoZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHZhciBuYW1lID0gZm4ubmFtZSB8fCBleHRyYWN0RnVuY3Rpb25OYW1lKGZuKSB8fCB1dGlscy51bmlxSWQoJ3Rlc3QtJyk7XG4gICAgICAgIGlmIChjb25maWcucmVwZWF0VGltZXMgIT0gMSkge1xuICAgICAgICAgICAgZm4gPSByZXBlYXRGbihmbiwgY29uZmlnLnJlcGVhdFRpbWVzKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVzdWx0ID0gcHJvZmlsZShmbiwgY29uZmlnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICBvcHM6IHJlc3VsdC5vcHMsXG4gICAgICAgICAgICB0aW1lOiByZXN1bHQudGltZSxcbiAgICAgICAgICAgIGxhc3RSZXN1bHQ6IHJlc3VsdC5sYXN0UmVzdWx0XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBzdWl0ZVJlc3VsdC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiBiLm9wcyAtIGEub3BzO1xuICAgIH0pO1xuXG4gICAgaWYgKGNvbmZpZy5wcmludFJlcG9ydCkge1xuICAgICAgICBjb25zb2xlLmxvZyhyZXBvcnQoc3VpdGVSZXN1bHQsIGNvbmZpZykpO1xuICAgIH1cblxuICAgIHJldHVybiBzdWl0ZVJlc3VsdDtcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvLyBudW1iZXJcbiAgICBmb3JtYXROdW1iZXI6IGZvcm1hdE51bWJlcixcbiAgICAvLyBzdHJpbmdcbiAgICBwYWQ6IHBhZCxcbiAgICBwYWRMZWZ0OiBwYWRMZWZ0LFxuICAgIGNyb3A6IGNyb3AsXG4gICAgLy8gZnVuY3Rpb25hbFxuICAgIHByb3A6IHByb3AsXG4gICAgbWF4OiBtYXgsXG4gICAgcmVwZWF0OiByZXBlYXQsXG4gICAgdW5pcUlkOiB1bmlxSWQsXG4gICAgLy8gb2JqZWN0XG4gICAgY29uZmlndXJlOiBjb25maWd1cmVcbn07XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5mdW5jdGlvbiBmb3JtYXROdW1iZXIobikge1xuICAgIGlmICh0eXBlb2YgbiA9PSAnbnVtYmVyJykge1xuICAgICAgICBzd2l0Y2ggKHRydWUpIHtcbiAgICAgICAgICAgIGNhc2UgbiA9PT0gMDpcbiAgICAgICAgICAgICAgICByZXR1cm4gJzAnO1xuICAgICAgICAgICAgY2FzZSBuIDwgMTpcbiAgICAgICAgICAgICAgICByZXR1cm4gbi50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgY2FzZSBuIDwgMTAwMDpcbiAgICAgICAgICAgICAgICByZXR1cm4gbi50b0ZpeGVkKDApO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gbi50b0V4cG9uZW50aWFsKDEpLnJlcGxhY2UoL2VcXCsvLCAnIHggMTBeJyk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbjtcbiAgICB9XG59XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5mdW5jdGlvbiBwYWQoc3RyLCBuLCBjaGFyKSB7XG4gICAgaWYgKGNoYXIgPT09IHVuZGVmaW5lZCB8fCBjaGFyID09PSAnJykge1xuICAgICAgICBjaGFyID0gJyAnO1xuICAgIH1cbiAgICBpZiAoc3RyLmxlbmd0aCA8IG4pIHtcbiAgICAgICAgcmV0dXJuIHBhZChzdHIgKyBjaGFyLCBuLCBjaGFyKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbn1cblxuZnVuY3Rpb24gcGFkTGVmdChzdHIsIG4sIGNoYXIpIHtcbiAgICBpZiAoY2hhciA9PT0gdW5kZWZpbmVkIHx8IGNoYXIgPT09ICcnKSB7XG4gICAgICAgIGNoYXIgPSAnICc7XG4gICAgfVxuICAgIGlmIChzdHIubGVuZ3RoIDwgbikge1xuICAgICAgICByZXR1cm4gcGFkTGVmdChjaGFyICsgc3RyLCBuLCBjaGFyKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbn1cblxuZnVuY3Rpb24gY3JvcChzdHIsIGxlbmd0aCwgc3Vic3QpIHtcbiAgICBpZiAoc3RyLmxlbmd0aCA8PSBsZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgc3Vic3QgPSBzdWJzdCB8fCAnLi4uJztcbiAgICByZXR1cm4gc3RyLnNsaWNlKDAsIGxlbmd0aCAtIHN1YnN0Lmxlbmd0aCArIDEpICsgc3Vic3Q7XG59XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5mdW5jdGlvbiBwcm9wKGtleSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoeCkge1xuICAgICAgICByZXR1cm4geFtrZXldO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIG1heChsaXN0KSB7XG4gICAgcmV0dXJuIE1hdGgubWF4LmFwcGx5KE1hdGgsIGxpc3QpO1xufVxuXG5mdW5jdGlvbiByZXBlYXQoc3RyLCB0aW1lcykge1xuICAgIHJldHVybiBuZXcgQXJyYXkodGltZXMgKyAxKS5qb2luKHN0cik7XG59XG5cbmZ1bmN0aW9uIHVuaXFJZChwcmVmaXgpIHtcbiAgICByZXR1cm4gcHJlZml4ICsgU3RyaW5nKHVuaXFJZC5jb3VudGVyKyspO1xufVxudW5pcUlkLmNvdW50ZXIgPSAwO1xudW5pcUlkLnJlc2V0ID0gZnVuY3Rpb24gKGNvdW50ZXIpIHsgdW5pcUlkLmNvdW50ZXIgPSBjb3VudGVyIH07XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5mdW5jdGlvbiBjb25maWd1cmUoY29uZmlnLCBkZWZhdWx0cykge1xuICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcbiAgICBkZWZhdWx0cyA9IGRlZmF1bHRzIHx8IHt9O1xuXG4gICAgT2JqZWN0LmtleXMoY29uZmlnKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgZGVmYXVsdHNba2V5XSA9IGNvbmZpZ1trZXldO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRlZmF1bHRzO1xufVxuIl19
