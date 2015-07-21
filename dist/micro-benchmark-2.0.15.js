(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.microBenchmark = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var profile = require('./profile');
var suite = require('./suite');
var report = require('./report');
var util = require('./utils');

module.exports = {
    profile: profile,
    profileAsync: profileAsync,
    suite: suite,
    suiteAsync: suiteAsync,
    report: report,
    util: util
};

},{"./profile":16,"./report":17,"./suite":18,"./utils":19}],2:[function(require,module,exports){
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

    config = utils.configure({
        limitIterations: 1e3,
        limitTime: 100
    }, config);

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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvY2hhbGsvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2hhbGsvbm9kZV9tb2R1bGVzL2Fuc2ktc3R5bGVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NoYWxrL25vZGVfbW9kdWxlcy9lc2NhcGUtc3RyaW5nLXJlZ2V4cC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jaGFsay9ub2RlX21vZHVsZXMvaGFzLWFuc2kvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2hhbGsvbm9kZV9tb2R1bGVzL2hhcy1hbnNpL25vZGVfbW9kdWxlcy9hbnNpLXJlZ2V4L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NoYWxrL25vZGVfbW9kdWxlcy9zdHJpcC1hbnNpL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NoYWxrL25vZGVfbW9kdWxlcy9zdXBwb3J0cy1jb2xvci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jb25zb2xlLnRhYmxlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NvbnNvbGUudGFibGUvbm9kZV9tb2R1bGVzL2Vhc3ktdGFibGUvbGliL2FnZ3JlZ2F0aW9ucy5qcyIsIm5vZGVfbW9kdWxlcy9jb25zb2xlLnRhYmxlL25vZGVfbW9kdWxlcy9lYXN5LXRhYmxlL2xpYi9zb3J0LmpzIiwibm9kZV9tb2R1bGVzL2NvbnNvbGUudGFibGUvbm9kZV9tb2R1bGVzL2Vhc3ktdGFibGUvbGliL3RhYmxlLmpzIiwibm9kZV9tb2R1bGVzL2Vhc3ktdGFibGUvbGliL3RhYmxlLmpzIiwicHJvZmlsZS5qcyIsInJlcG9ydC5qcyIsInN1aXRlLmpzIiwidXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdGJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIHByb2ZpbGUgPSByZXF1aXJlKCcuL3Byb2ZpbGUnKTtcbnZhciBzdWl0ZSA9IHJlcXVpcmUoJy4vc3VpdGUnKTtcbnZhciByZXBvcnQgPSByZXF1aXJlKCcuL3JlcG9ydCcpO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHByb2ZpbGU6IHByb2ZpbGUsXG4gICAgcHJvZmlsZUFzeW5jOiBwcm9maWxlQXN5bmMsXG4gICAgc3VpdGU6IHN1aXRlLFxuICAgIHN1aXRlQXN5bmM6IHN1aXRlQXN5bmMsXG4gICAgcmVwb3J0OiByZXBvcnQsXG4gICAgdXRpbDogdXRpbFxufTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGVzY2FwZVN0cmluZ1JlZ2V4cCA9IHJlcXVpcmUoJ2VzY2FwZS1zdHJpbmctcmVnZXhwJyk7XG52YXIgYW5zaVN0eWxlcyA9IHJlcXVpcmUoJ2Fuc2ktc3R5bGVzJyk7XG52YXIgc3RyaXBBbnNpID0gcmVxdWlyZSgnc3RyaXAtYW5zaScpO1xudmFyIGhhc0Fuc2kgPSByZXF1aXJlKCdoYXMtYW5zaScpO1xudmFyIHN1cHBvcnRzQ29sb3IgPSByZXF1aXJlKCdzdXBwb3J0cy1jb2xvcicpO1xudmFyIGRlZmluZVByb3BzID0gT2JqZWN0LmRlZmluZVByb3BlcnRpZXM7XG52YXIgaXNTaW1wbGVXaW5kb3dzVGVybSA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicgJiYgIS9eeHRlcm0vaS50ZXN0KHByb2Nlc3MuZW52LlRFUk0pO1xuXG5mdW5jdGlvbiBDaGFsayhvcHRpb25zKSB7XG5cdC8vIGRldGVjdCBtb2RlIGlmIG5vdCBzZXQgbWFudWFsbHlcblx0dGhpcy5lbmFibGVkID0gIW9wdGlvbnMgfHwgb3B0aW9ucy5lbmFibGVkID09PSB1bmRlZmluZWQgPyBzdXBwb3J0c0NvbG9yIDogb3B0aW9ucy5lbmFibGVkO1xufVxuXG4vLyB1c2UgYnJpZ2h0IGJsdWUgb24gV2luZG93cyBhcyB0aGUgbm9ybWFsIGJsdWUgY29sb3IgaXMgaWxsZWdpYmxlXG5pZiAoaXNTaW1wbGVXaW5kb3dzVGVybSkge1xuXHRhbnNpU3R5bGVzLmJsdWUub3BlbiA9ICdcXHUwMDFiWzk0bSc7XG59XG5cbnZhciBzdHlsZXMgPSAoZnVuY3Rpb24gKCkge1xuXHR2YXIgcmV0ID0ge307XG5cblx0T2JqZWN0LmtleXMoYW5zaVN0eWxlcykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG5cdFx0YW5zaVN0eWxlc1trZXldLmNsb3NlUmUgPSBuZXcgUmVnRXhwKGVzY2FwZVN0cmluZ1JlZ2V4cChhbnNpU3R5bGVzW2tleV0uY2xvc2UpLCAnZycpO1xuXG5cdFx0cmV0W2tleV0gPSB7XG5cdFx0XHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGJ1aWxkLmNhbGwodGhpcywgdGhpcy5fc3R5bGVzLmNvbmNhdChrZXkpKTtcblx0XHRcdH1cblx0XHR9O1xuXHR9KTtcblxuXHRyZXR1cm4gcmV0O1xufSkoKTtcblxudmFyIHByb3RvID0gZGVmaW5lUHJvcHMoZnVuY3Rpb24gY2hhbGsoKSB7fSwgc3R5bGVzKTtcblxuZnVuY3Rpb24gYnVpbGQoX3N0eWxlcykge1xuXHR2YXIgYnVpbGRlciA9IGZ1bmN0aW9uIGJ1aWxkZXIoKSB7XG5cdFx0cmV0dXJuIGFwcGx5U3R5bGUuYXBwbHkoYnVpbGRlciwgYXJndW1lbnRzKTtcblx0fTtcblxuXHRidWlsZGVyLl9zdHlsZXMgPSBfc3R5bGVzO1xuXHRidWlsZGVyLmVuYWJsZWQgPSB0aGlzLmVuYWJsZWQ7XG5cdC8vIF9fcHJvdG9fXyBpcyB1c2VkIGJlY2F1c2Ugd2UgbXVzdCByZXR1cm4gYSBmdW5jdGlvbiwgYnV0IHRoZXJlIGlzXG5cdC8vIG5vIHdheSB0byBjcmVhdGUgYSBmdW5jdGlvbiB3aXRoIGEgZGlmZmVyZW50IHByb3RvdHlwZS5cblx0Lyplc2xpbnQgbm8tcHJvdG86IDAgKi9cblx0YnVpbGRlci5fX3Byb3RvX18gPSBwcm90bztcblxuXHRyZXR1cm4gYnVpbGRlcjtcbn1cblxuZnVuY3Rpb24gYXBwbHlTdHlsZSgpIHtcblx0Ly8gc3VwcG9ydCB2YXJhZ3MsIGJ1dCBzaW1wbHkgY2FzdCB0byBzdHJpbmcgaW4gY2FzZSB0aGVyZSdzIG9ubHkgb25lIGFyZ1xuXHR2YXIgYXJncyA9IGFyZ3VtZW50cztcblx0dmFyIGFyZ3NMZW4gPSBhcmdzLmxlbmd0aDtcblx0dmFyIHN0ciA9IGFyZ3NMZW4gIT09IDAgJiYgU3RyaW5nKGFyZ3VtZW50c1swXSk7XG5cblx0aWYgKGFyZ3NMZW4gPiAxKSB7XG5cdFx0Ly8gZG9uJ3Qgc2xpY2UgYGFyZ3VtZW50c2AsIGl0IHByZXZlbnRzIHY4IG9wdGltaXphdGlvbnNcblx0XHRmb3IgKHZhciBhID0gMTsgYSA8IGFyZ3NMZW47IGErKykge1xuXHRcdFx0c3RyICs9ICcgJyArIGFyZ3NbYV07XG5cdFx0fVxuXHR9XG5cblx0aWYgKCF0aGlzLmVuYWJsZWQgfHwgIXN0cikge1xuXHRcdHJldHVybiBzdHI7XG5cdH1cblxuXHR2YXIgbmVzdGVkU3R5bGVzID0gdGhpcy5fc3R5bGVzO1xuXHR2YXIgaSA9IG5lc3RlZFN0eWxlcy5sZW5ndGg7XG5cblx0Ly8gVHVybnMgb3V0IHRoYXQgb24gV2luZG93cyBkaW1tZWQgZ3JheSB0ZXh0IGJlY29tZXMgaW52aXNpYmxlIGluIGNtZC5leGUsXG5cdC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vY2hhbGsvY2hhbGsvaXNzdWVzLzU4XG5cdC8vIElmIHdlJ3JlIG9uIFdpbmRvd3MgYW5kIHdlJ3JlIGRlYWxpbmcgd2l0aCBhIGdyYXkgY29sb3IsIHRlbXBvcmFyaWx5IG1ha2UgJ2RpbScgYSBub29wLlxuXHR2YXIgb3JpZ2luYWxEaW0gPSBhbnNpU3R5bGVzLmRpbS5vcGVuO1xuXHRpZiAoaXNTaW1wbGVXaW5kb3dzVGVybSAmJiAobmVzdGVkU3R5bGVzLmluZGV4T2YoJ2dyYXknKSAhPT0gLTEgfHwgbmVzdGVkU3R5bGVzLmluZGV4T2YoJ2dyZXknKSAhPT0gLTEpKSB7XG5cdFx0YW5zaVN0eWxlcy5kaW0ub3BlbiA9ICcnO1xuXHR9XG5cblx0d2hpbGUgKGktLSkge1xuXHRcdHZhciBjb2RlID0gYW5zaVN0eWxlc1tuZXN0ZWRTdHlsZXNbaV1dO1xuXG5cdFx0Ly8gUmVwbGFjZSBhbnkgaW5zdGFuY2VzIGFscmVhZHkgcHJlc2VudCB3aXRoIGEgcmUtb3BlbmluZyBjb2RlXG5cdFx0Ly8gb3RoZXJ3aXNlIG9ubHkgdGhlIHBhcnQgb2YgdGhlIHN0cmluZyB1bnRpbCBzYWlkIGNsb3NpbmcgY29kZVxuXHRcdC8vIHdpbGwgYmUgY29sb3JlZCwgYW5kIHRoZSByZXN0IHdpbGwgc2ltcGx5IGJlICdwbGFpbicuXG5cdFx0c3RyID0gY29kZS5vcGVuICsgc3RyLnJlcGxhY2UoY29kZS5jbG9zZVJlLCBjb2RlLm9wZW4pICsgY29kZS5jbG9zZTtcblx0fVxuXG5cdC8vIFJlc2V0IHRoZSBvcmlnaW5hbCAnZGltJyBpZiB3ZSBjaGFuZ2VkIGl0IHRvIHdvcmsgYXJvdW5kIHRoZSBXaW5kb3dzIGRpbW1lZCBncmF5IGlzc3VlLlxuXHRhbnNpU3R5bGVzLmRpbS5vcGVuID0gb3JpZ2luYWxEaW07XG5cblx0cmV0dXJuIHN0cjtcbn1cblxuZnVuY3Rpb24gaW5pdCgpIHtcblx0dmFyIHJldCA9IHt9O1xuXG5cdE9iamVjdC5rZXlzKHN0eWxlcykuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuXHRcdHJldFtuYW1lXSA9IHtcblx0XHRcdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gYnVpbGQuY2FsbCh0aGlzLCBbbmFtZV0pO1xuXHRcdFx0fVxuXHRcdH07XG5cdH0pO1xuXG5cdHJldHVybiByZXQ7XG59XG5cbmRlZmluZVByb3BzKENoYWxrLnByb3RvdHlwZSwgaW5pdCgpKTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQ2hhbGsoKTtcbm1vZHVsZS5leHBvcnRzLnN0eWxlcyA9IGFuc2lTdHlsZXM7XG5tb2R1bGUuZXhwb3J0cy5oYXNDb2xvciA9IGhhc0Fuc2k7XG5tb2R1bGUuZXhwb3J0cy5zdHJpcENvbG9yID0gc3RyaXBBbnNpO1xubW9kdWxlLmV4cG9ydHMuc3VwcG9ydHNDb2xvciA9IHN1cHBvcnRzQ29sb3I7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGFzc2VtYmxlU3R5bGVzICgpIHtcblx0dmFyIHN0eWxlcyA9IHtcblx0XHRtb2RpZmllcnM6IHtcblx0XHRcdHJlc2V0OiBbMCwgMF0sXG5cdFx0XHRib2xkOiBbMSwgMjJdLCAvLyAyMSBpc24ndCB3aWRlbHkgc3VwcG9ydGVkIGFuZCAyMiBkb2VzIHRoZSBzYW1lIHRoaW5nXG5cdFx0XHRkaW06IFsyLCAyMl0sXG5cdFx0XHRpdGFsaWM6IFszLCAyM10sXG5cdFx0XHR1bmRlcmxpbmU6IFs0LCAyNF0sXG5cdFx0XHRpbnZlcnNlOiBbNywgMjddLFxuXHRcdFx0aGlkZGVuOiBbOCwgMjhdLFxuXHRcdFx0c3RyaWtldGhyb3VnaDogWzksIDI5XVxuXHRcdH0sXG5cdFx0Y29sb3JzOiB7XG5cdFx0XHRibGFjazogWzMwLCAzOV0sXG5cdFx0XHRyZWQ6IFszMSwgMzldLFxuXHRcdFx0Z3JlZW46IFszMiwgMzldLFxuXHRcdFx0eWVsbG93OiBbMzMsIDM5XSxcblx0XHRcdGJsdWU6IFszNCwgMzldLFxuXHRcdFx0bWFnZW50YTogWzM1LCAzOV0sXG5cdFx0XHRjeWFuOiBbMzYsIDM5XSxcblx0XHRcdHdoaXRlOiBbMzcsIDM5XSxcblx0XHRcdGdyYXk6IFs5MCwgMzldXG5cdFx0fSxcblx0XHRiZ0NvbG9yczoge1xuXHRcdFx0YmdCbGFjazogWzQwLCA0OV0sXG5cdFx0XHRiZ1JlZDogWzQxLCA0OV0sXG5cdFx0XHRiZ0dyZWVuOiBbNDIsIDQ5XSxcblx0XHRcdGJnWWVsbG93OiBbNDMsIDQ5XSxcblx0XHRcdGJnQmx1ZTogWzQ0LCA0OV0sXG5cdFx0XHRiZ01hZ2VudGE6IFs0NSwgNDldLFxuXHRcdFx0YmdDeWFuOiBbNDYsIDQ5XSxcblx0XHRcdGJnV2hpdGU6IFs0NywgNDldXG5cdFx0fVxuXHR9O1xuXG5cdC8vIGZpeCBodW1hbnNcblx0c3R5bGVzLmNvbG9ycy5ncmV5ID0gc3R5bGVzLmNvbG9ycy5ncmF5O1xuXG5cdE9iamVjdC5rZXlzKHN0eWxlcykuZm9yRWFjaChmdW5jdGlvbiAoZ3JvdXBOYW1lKSB7XG5cdFx0dmFyIGdyb3VwID0gc3R5bGVzW2dyb3VwTmFtZV07XG5cblx0XHRPYmplY3Qua2V5cyhncm91cCkuZm9yRWFjaChmdW5jdGlvbiAoc3R5bGVOYW1lKSB7XG5cdFx0XHR2YXIgc3R5bGUgPSBncm91cFtzdHlsZU5hbWVdO1xuXG5cdFx0XHRzdHlsZXNbc3R5bGVOYW1lXSA9IGdyb3VwW3N0eWxlTmFtZV0gPSB7XG5cdFx0XHRcdG9wZW46ICdcXHUwMDFiWycgKyBzdHlsZVswXSArICdtJyxcblx0XHRcdFx0Y2xvc2U6ICdcXHUwMDFiWycgKyBzdHlsZVsxXSArICdtJ1xuXHRcdFx0fTtcblx0XHR9KTtcblxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzdHlsZXMsIGdyb3VwTmFtZSwge1xuXHRcdFx0dmFsdWU6IGdyb3VwLFxuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2Vcblx0XHR9KTtcblx0fSk7XG5cblx0cmV0dXJuIHN0eWxlcztcbn1cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KG1vZHVsZSwgJ2V4cG9ydHMnLCB7XG5cdGVudW1lcmFibGU6IHRydWUsXG5cdGdldDogYXNzZW1ibGVTdHlsZXNcbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWF0Y2hPcGVyYXRvcnNSZSA9IC9bfFxcXFx7fSgpW1xcXV4kKyo/Ll0vZztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyKSB7XG5cdGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGEgc3RyaW5nJyk7XG5cdH1cblxuXHRyZXR1cm4gc3RyLnJlcGxhY2UobWF0Y2hPcGVyYXRvcnNSZSwgICdcXFxcJCYnKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG52YXIgYW5zaVJlZ2V4ID0gcmVxdWlyZSgnYW5zaS1yZWdleCcpO1xudmFyIHJlID0gbmV3IFJlZ0V4cChhbnNpUmVnZXgoKS5zb3VyY2UpOyAvLyByZW1vdmUgdGhlIGBnYCBmbGFnXG5tb2R1bGUuZXhwb3J0cyA9IHJlLnRlc3QuYmluZChyZSk7XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIC9bXFx1MDAxYlxcdTAwOWJdW1soKSM7P10qKD86WzAtOV17MSw0fSg/OjtbMC05XXswLDR9KSopP1swLTlBLU9SWmNmLW5xcnk9PjxdL2c7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGFuc2lSZWdleCA9IHJlcXVpcmUoJ2Fuc2ktcmVnZXgnKSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHIpIHtcblx0cmV0dXJuIHR5cGVvZiBzdHIgPT09ICdzdHJpbmcnID8gc3RyLnJlcGxhY2UoYW5zaVJlZ2V4LCAnJykgOiBzdHI7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGFyZ3YgPSBwcm9jZXNzLmFyZ3Y7XG5cbnZhciB0ZXJtaW5hdG9yID0gYXJndi5pbmRleE9mKCctLScpO1xudmFyIGhhc0ZsYWcgPSBmdW5jdGlvbiAoZmxhZykge1xuXHRmbGFnID0gJy0tJyArIGZsYWc7XG5cdHZhciBwb3MgPSBhcmd2LmluZGV4T2YoZmxhZyk7XG5cdHJldHVybiBwb3MgIT09IC0xICYmICh0ZXJtaW5hdG9yICE9PSAtMSA/IHBvcyA8IHRlcm1pbmF0b3IgOiB0cnVlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uICgpIHtcblx0aWYgKCdGT1JDRV9DT0xPUicgaW4gcHJvY2Vzcy5lbnYpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdGlmIChoYXNGbGFnKCduby1jb2xvcicpIHx8XG5cdFx0aGFzRmxhZygnbm8tY29sb3JzJykgfHxcblx0XHRoYXNGbGFnKCdjb2xvcj1mYWxzZScpKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0aWYgKGhhc0ZsYWcoJ2NvbG9yJykgfHxcblx0XHRoYXNGbGFnKCdjb2xvcnMnKSB8fFxuXHRcdGhhc0ZsYWcoJ2NvbG9yPXRydWUnKSB8fFxuXHRcdGhhc0ZsYWcoJ2NvbG9yPWFsd2F5cycpKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRpZiAocHJvY2Vzcy5zdGRvdXQgJiYgIXByb2Nlc3Muc3Rkb3V0LmlzVFRZKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0aWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdGlmICgnQ09MT1JURVJNJyBpbiBwcm9jZXNzLmVudikge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0aWYgKHByb2Nlc3MuZW52LlRFUk0gPT09ICdkdW1iJykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGlmICgvXnNjcmVlbnxeeHRlcm18XnZ0MTAwfGNvbG9yfGFuc2l8Y3lnd2lufGxpbnV4L2kudGVzdChwcm9jZXNzLmVudi5URVJNKSkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0cmV0dXJuIGZhbHNlO1xufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICBmdW5jdGlvbiBzZXR1cENvbnNvbGVUYWJsZSgpIHtcbiAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1dlaXJkLCBjb25zb2xlIG9iamVjdCBpcyB1bmRlZmluZWQnKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBjb25zb2xlLnRhYmxlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIFRhYmxlID0gcmVxdWlyZSgnZWFzeS10YWJsZScpO1xuXG4gICAgZnVuY3Rpb24gYXJyYXlUb1N0cmluZyhhcnIpIHtcbiAgICAgIHZhciB0ID0gbmV3IFRhYmxlKCk7XG4gICAgICBhcnIuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgcmVjb3JkID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgIHR5cGVvZiByZWNvcmQgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgdC5jZWxsKCdpdGVtJywgcmVjb3JkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBhc3N1bWUgcGxhaW4gb2JqZWN0XG4gICAgICAgICAgT2JqZWN0LmtleXMocmVjb3JkKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgdC5jZWxsKHByb3BlcnR5LCByZWNvcmRbcHJvcGVydHldKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0Lm5ld1JvdygpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gdC50b1N0cmluZygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHByaW50VGl0bGVUYWJsZSh0aXRsZSwgYXJyKSB7XG4gICAgICB2YXIgc3RyID0gYXJyYXlUb1N0cmluZyhhcnIpO1xuICAgICAgdmFyIHJvd0xlbmd0aCA9IHN0ci5pbmRleE9mKCdcXG4nKTtcbiAgICAgIGlmIChyb3dMZW5ndGggPiAwKSB7XG4gICAgICAgIGlmICh0aXRsZS5sZW5ndGggPiByb3dMZW5ndGgpIHtcbiAgICAgICAgICByb3dMZW5ndGggPSB0aXRsZS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2codGl0bGUpO1xuICAgICAgICB2YXIgc2VwID0gJy0nLCBrLCBsaW5lID0gJyc7XG4gICAgICAgIGZvciAoayA9IDA7IGsgPCByb3dMZW5ndGg7IGsgKz0gMSkge1xuICAgICAgICAgIGxpbmUgKz0gc2VwO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKGxpbmUpO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2coc3RyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvYmplY3RUb0FycmF5KG9iaikge1xuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopO1xuICAgICAgcmV0dXJuIGtleXMubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBrZXk6IGtleSxcbiAgICAgICAgICB2YWx1ZTogb2JqW2tleV1cbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG9iaikge1xuICAgICAgcmV0dXJuIGFycmF5VG9TdHJpbmcob2JqZWN0VG9BcnJheShvYmopKTtcbiAgICB9XG5cbiAgICBjb25zb2xlLnRhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gICAgICBpZiAoYXJncy5sZW5ndGggPT09IDIgJiZcbiAgICAgICAgdHlwZW9mIGFyZ3NbMF0gPT09ICdzdHJpbmcnICYmXG4gICAgICAgIEFycmF5LmlzQXJyYXkoYXJnc1sxXSkpIHtcblxuICAgICAgICByZXR1cm4gcHJpbnRUaXRsZVRhYmxlKGFyZ3NbMF0sIGFyZ3NbMV0pO1xuICAgICAgfVxuICAgICAgYXJncy5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICAgIGlmICh0eXBlb2YgayA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gY29uc29sZS5sb2coayk7XG4gICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShrKSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGFycmF5VG9TdHJpbmcoaykpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBrID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgIGNvbnNvbGUubG9nKG9iamVjdFRvU3RyaW5nKGspKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcbiAgfVxuXG4gIHNldHVwQ29uc29sZVRhYmxlKCk7XG59KCkpO1xuIiwidmFyIHBhZExlZnQgPSByZXF1aXJlKCcuL3RhYmxlJykucGFkTGVmdFxuXG52YXIgUHJpbnRlciA9IGV4cG9ydHMuUHJpbnRlciA9IGZ1bmN0aW9uIChuYW1lLCBmb3JtYXQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHZhbCwgd2lkdGgpIHtcbiAgICAgICAgdmFyIHMgPSBuYW1lICsgJyAnICsgZm9ybWF0KHZhbClcbiAgICAgICAgcmV0dXJuIHdpZHRoID09IG51bGxcbiAgICAgICAgICAgID8gc1xuICAgICAgICAgICAgOiBwYWRMZWZ0KHMsIHdpZHRoKVxuICAgIH1cbn1cblxuXG5leHBvcnRzLnN1bSA9IGZ1bmN0aW9uIChzdW0sIHZhbCkge1xuICAgIHN1bSA9IHN1bSB8fCAwXG4gICAgcmV0dXJuIHN1bSArPSB2YWxcbn1cblxuZXhwb3J0cy5zdW0ucHJpbnRlciA9IFByaW50ZXIoJ1xcdTIyMTEnLCBTdHJpbmcpXG5cblxuZXhwb3J0cy5hdmcgPSBmdW5jdGlvbiAoc3VtLCB2YWwsIGluZGV4LCBsZW5ndGgpIHtcbiAgICBzdW0gPSBzdW0gfHwgMFxuICAgIHN1bSArPSB2YWxcbiAgICByZXR1cm4gaW5kZXggKyAxID09IGxlbmd0aFxuICAgICAgICA/IHN1bSAvIGxlbmd0aFxuICAgICAgICA6IHN1bVxufVxuXG5leHBvcnRzLmF2Zy5wcmludGVyID0gUHJpbnRlcignQXZnOicsIFN0cmluZykiLCJtb2R1bGUuZXhwb3J0cyA9IHNvcnRcblxuZnVuY3Rpb24gc29ydCAoY29tcGFyYXRvcikge1xuICAgIGlmICh0eXBlb2YgY29tcGFyYXRvciAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHZhciBzb3J0S2V5cyA9IEFycmF5LmlzQXJyYXkoY29tcGFyYXRvcilcbiAgICAgICAgICAgID8gY29tcGFyYXRvclxuICAgICAgICAgICAgOiBPYmplY3Qua2V5cyh0aGlzLmNvbHVtbnMpXG4gICAgICAgIGNvbXBhcmF0b3IgPSBLZXlzQ29tcGFyYXRvcihzb3J0S2V5cylcbiAgICB9XG4gICAgdGhpcy5yb3dzLnNvcnQoY29tcGFyYXRvcilcbiAgICByZXR1cm4gdGhpc1xufVxuXG5mdW5jdGlvbiBLZXlzQ29tcGFyYXRvciAoa2V5cykge1xuICAgIHZhciBjb21wYXJhdG9ycyA9IGtleXMubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgdmFyIHNvcnRGbiA9ICdhc2MnXG5cbiAgICAgICAgdmFyIG0gPSAvKC4qKVxcfFxccyooYXNjfGRlcylcXHMqJC8uZXhlYyhrZXkpXG4gICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICBrZXkgPSBtWzFdXG4gICAgICAgICAgICBzb3J0Rm4gPSBtWzJdXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgIHZhciByZXQgPSBjb21wYXJlKGFba2V5XSwgYltrZXldKVxuICAgICAgICAgICAgcmV0dXJuIHNvcnRGbiA9PSAnYXNjJyA/IHJldCA6IC0xICogcmV0XG4gICAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29tcGFyYXRvcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciByZXMgPSBjb21wYXJhdG9yc1tpXShhLCBiKVxuICAgICAgICAgICAgaWYgKHJlcyAhPSAwKSByZXR1cm4gcmVzXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDBcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgICBpZiAoYSA9PT0gYikgcmV0dXJuIDBcbiAgICBpZiAoYSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gMVxuICAgIGlmIChiID09PSB1bmRlZmluZWQpIHJldHVybiAtMVxuICAgIGlmIChhID09PSBudWxsKSByZXR1cm4gMVxuICAgIGlmIChiID09PSBudWxsKSByZXR1cm4gLTFcbiAgICBpZiAoYSA+IGIpIHJldHVybiAxXG4gICAgaWYgKGEgPCBiKSByZXR1cm4gLTFcbiAgICByZXR1cm4gY29tcGFyZShTdHJpbmcoYSksIFN0cmluZyhiKSlcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IFRhYmxlXG5cblRhYmxlLnN0cmluZyA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgICBpZiAodmFsID09PSB1bmRlZmluZWQpIHJldHVybiAnJ1xuICAgIHJldHVybiBTdHJpbmcodmFsKVxufVxuXG5UYWJsZS5OdW1iZXIgPSBmdW5jdGlvbiAoZGlnaXRzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh2YWwsIHdpZHRoKSB7XG4gICAgICAgIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuICcnXG4gICAgICAgIGlmICh0eXBlb2YgdmFsICE9ICdudW1iZXInKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFN0cmluZyh2YWwpICsgJyBpcyBub3QgYSBudW1iZXInKVxuICAgICAgICB2YXIgcyA9IGRpZ2l0cyA9PSBudWxsID8gU3RyaW5nKHZhbCkgOiB2YWwudG9GaXhlZChkaWdpdHMpLnRvU3RyaW5nKClcbiAgICAgICAgcmV0dXJuIFRhYmxlLnBhZExlZnQocywgd2lkdGgpXG4gICAgfVxufVxuXG5UYWJsZS5SaWdodFBhZGRlciA9IGZ1bmN0aW9uIChjaGFyKSB7XG4gICAgY2hhciA9IGNoYXIgfHwgJyAnXG4gICAgcmV0dXJuIGZ1bmN0aW9uICh2YWwsIGxlbmd0aCkge1xuICAgICAgICB2YXIgcyA9IFN0cmluZyh2YWwpXG4gICAgICAgIHZhciBsID0gcy5sZW5ndGhcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGggLSBsOyBpKyspIHtcbiAgICAgICAgICAgIHMgKz0gY2hhclxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzXG4gICAgfVxufVxuXG5UYWJsZS5MZWZ0UGFkZGVyID0gZnVuY3Rpb24gKGNoYXIpIHtcbiAgICBjaGFyID0gY2hhciB8fCAnICdcbiAgICByZXR1cm4gZnVuY3Rpb24gKHZhbCwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciByZXQgPSAnJ1xuICAgICAgICB2YXIgcyA9IFN0cmluZyh2YWwpXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoIC0gcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcmV0ICs9IGNoYXJcbiAgICAgICAgfVxuICAgICAgICByZXQgKz0gc1xuICAgICAgICByZXR1cm4gcmV0XG4gICAgfVxufVxuXG5UYWJsZS5wYWRMZWZ0ID0gVGFibGUuTGVmdFBhZGRlcigpXG5cblRhYmxlLnByaW50QXJyYXkgPSBmdW5jdGlvbiAoYXJyLCBmb3JtYXQsIGNiKSB7XG4gICAgZm9ybWF0ID0gdHlwZW9mIGZvcm1hdCA9PSAnZnVuY3Rpb24nID8gZm9ybWF0IDogRm9ybWF0dGVyKGZvcm1hdClcbiAgICBjYiA9IGNiIHx8IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIHJldHVybiB0LnRvU3RyaW5nKClcbiAgICB9XG5cbiAgICB2YXIgdCA9IG5ldyBUYWJsZVxuICAgIHZhciBjZWxsID0gdC5jZWxsLmJpbmQodClcblxuICAgIGFyci5mb3JFYWNoKGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgZm9ybWF0KG9iaiwgY2VsbClcbiAgICAgICAgdC5uZXdSb3coKVxuICAgIH0pXG4gICAgcmV0dXJuIGNiKHQpXG59XG5cblRhYmxlLnByaW50T2JqID0gZnVuY3Rpb24gKG9iaiwgZm9ybWF0LCBjYikge1xuICAgIGZvcm1hdCA9IHR5cGVvZiBmb3JtYXQgPT0gJ2Z1bmN0aW9uJyA/IGZvcm1hdCA6IEZvcm1hdHRlcihmb3JtYXQpXG4gICAgY2IgPSBjYiB8fCBmdW5jdGlvbiAodCkge1xuICAgICAgICByZXR1cm4gdC5wcmludFRyYW5zcG9zZWQoJyA6ICcpXG4gICAgfVxuXG4gICAgdmFyIHQgPSBuZXcgVGFibGVcbiAgICBmb3JtYXQob2JqLCB0LmNlbGwuYmluZCh0KSlcbiAgICB0Lm5ld1JvdygpXG4gICAgcmV0dXJuIGNiKHQpXG59XG5cbmZ1bmN0aW9uIEZvcm1hdHRlciAob3B0cykge1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChvYmosIGNlbGwpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICAgICAgaWYgKCFvYmouaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWVcbiAgICAgICAgICAgIHZhciBvID0gb3B0c1trZXldXG4gICAgICAgICAgICBjZWxsKFxuICAgICAgICAgICAgICAgIChvICYmIG8ubmFtZSkgfHwga2V5LFxuICAgICAgICAgICAgICAgIG9ialtrZXldLFxuICAgICAgICAgICAgICAgIG8gJiYgby5wcmludGVyLFxuICAgICAgICAgICAgICAgIG8gJiYgby53aWR0aFxuICAgICAgICAgICAgKVxuICAgICAgICB9XG4gICAgfVxufVxuXG5cblRhYmxlLlJvdyA9IFJvd1xuZnVuY3Rpb24gUm93ICgpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG4gICAgICAgIF9fcHJpbnRlcnM6IHtcbiAgICAgICAgICAgIHZhbHVlOiB7fSxcbiAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIF9fY2VsbDoge1xuICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIChjb2wsIHZhbCwgcHJpbnRlcikge1xuICAgICAgICAgICAgICAgIHRoaXNbY29sXSA9IHZhbFxuICAgICAgICAgICAgICAgIHRoaXMuX19wcmludGVyc1tjb2xdID0gcHJpbnRlclxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgICAgIH1cbiAgICB9KVxufVxuXG5cblRhYmxlLnByaW50ID0gcHJpbnRcbmZ1bmN0aW9uIHByaW50IChyb3dzLCBjb2x1bW5zLCBzaGlmdCkge1xuICAgIHZhciBwYWRTcGFjZXMgPSBUYWJsZS5SaWdodFBhZGRlcigpXG4gICAgdmFyIHdpZHRocyA9IHt9XG5cbiAgICBmdW5jdGlvbiBzZXRXaWR0aCAoY29sLCB3aWR0aCkge1xuICAgICAgICB2YXIgaXNGaXhlZCA9IGNvbHVtbnNbY29sXS53aWR0aCAhPSBudWxsXG4gICAgICAgIGlmIChpc0ZpeGVkKSB7XG4gICAgICAgICAgICB3aWR0aHNbY29sXSA9IGNvbHVtbnNbY29sXS53aWR0aFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHdpZHRoc1tjb2xdID4gd2lkdGgpIHJldHVyblxuICAgICAgICAgICAgd2lkdGhzW2NvbF0gPSB3aWR0aFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2VsbFByaW50ZXIgKHJvdywgY29sKSB7XG4gICAgICAgIHJldHVybiAocm93Ll9fcHJpbnRlcnMgJiYgcm93Ll9fcHJpbnRlcnNbY29sXSkgfHwgVGFibGUuc3RyaW5nXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FsY1dpZHRocyAoKSB7XG4gICAgICAgIHJvd3MuZm9yRWFjaChmdW5jdGlvbiAocm93KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gY29sdW1ucykge1xuICAgICAgICAgICAgICAgIHNldFdpZHRoKGtleSwgY2VsbFByaW50ZXIocm93LCBrZXkpLmNhbGwocm93LCByb3dba2V5XSkubGVuZ3RoKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHByaW50Um93IChjYikge1xuICAgICAgICB2YXIgcyA9ICcnXG4gICAgICAgIHZhciBmaXJzdENvbHVtbiA9IHRydWVcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGNvbHVtbnMpIHtcbiAgICAgICAgICAgIGlmICghZmlyc3RDb2x1bW4pIHMgKz0gc2hpZnRcbiAgICAgICAgICAgIGZpcnN0Q29sdW1uID0gZmFsc2VcbiAgICAgICAgICAgIHZhciB3aWR0aCA9IHdpZHRoc1trZXldXG4gICAgICAgICAgICBzICs9IHByaW50Q2VsbChjYihrZXksIHdpZHRoKSwgd2lkdGgpXG4gICAgICAgIH1cbiAgICAgICAgcyArPSAnXFxuJ1xuICAgICAgICByZXR1cm4gc1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHByaW50Q2VsbCAocywgd2lkdGgpIHtcbiAgICAgICAgaWYgKHMubGVuZ3RoIDw9IHdpZHRoKSByZXR1cm4gcGFkU3BhY2VzKHMsIHdpZHRoKVxuICAgICAgICBzID0gcy5zbGljZSgwLCB3aWR0aClcbiAgICAgICAgaWYgKHdpZHRoID4gMykgcyA9IHMuc2xpY2UoMCwgLTMpLmNvbmNhdCgnLi4uJylcbiAgICAgICAgcmV0dXJuIHNcbiAgICB9XG5cbiAgICBjYWxjV2lkdGhzKClcblxuICAgIHJldHVybiByb3dzLm1hcChmdW5jdGlvbiAocm93KSB7XG4gICAgICAgIHJldHVybiBwcmludFJvdyhmdW5jdGlvbiAoa2V5LCB3aWR0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNlbGxQcmludGVyKHJvdywga2V5KS5jYWxsKHJvdywgcm93W2tleV0sIHdpZHRoKVxuICAgICAgICB9KVxuICAgIH0pLmpvaW4oJycpXG5cbn1cblxuXG5mdW5jdGlvbiBUYWJsZSAoKSB7XG4gICAgdGhpcy5jb2x1bW5zID0ge30gLyogQGFwaTogcHVibGljICovXG4gICAgdGhpcy5yb3dzID0gW10gLyogQGFwaTogcHVibGljICovXG4gICAgdGhpcy5fcm93ID0gbmV3IFJvd1xufVxuXG5cblRhYmxlLnByb3RvdHlwZS5jZWxsID0gZnVuY3Rpb24gKGNvbCwgdmFsLCBwcmludGVyLCB3aWR0aCkge1xuICAgIHRoaXMuX3Jvdy5fX2NlbGwoY29sLCB2YWwsIHByaW50ZXIpXG4gICAgdmFyIGMgPSB0aGlzLmNvbHVtbnNbY29sXSB8fCAodGhpcy5jb2x1bW5zW2NvbF0gPSB7fSlcbiAgICBpZiAod2lkdGggIT0gbnVsbCkgYy53aWR0aCA9IHdpZHRoXG4gICAgcmV0dXJuIHRoaXNcbn1cblxuVGFibGUucHJvdG90eXBlLm5ld1JvdyA9IFRhYmxlLnByb3RvdHlwZS5uZXdMaW5lID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucm93cy5wdXNoKHRoaXMuX3JvdylcbiAgICB0aGlzLl9yb3cgPSBuZXcgUm93XG4gICAgcmV0dXJuIHRoaXNcbn1cblxuVGFibGUucHJvdG90eXBlLnNvcnQgPSByZXF1aXJlKCcuL3NvcnQnKVxuXG5UYWJsZS5hZ2dyID0gcmVxdWlyZSgnLi9hZ2dyZWdhdGlvbnMnKVxuXG5UYWJsZS5wcm90b3R5cGUudG90YWxzID0gbnVsbCAvKiBAYXBpOiBwdWJsaWMgKi9cblxuVGFibGUucHJvdG90eXBlLnRvdGFsID0gZnVuY3Rpb24gKGNvbCwgZm4sIHByaW50ZXIpIHtcbiAgICBmbiA9IGZuIHx8IFRhYmxlLmFnZ3Iuc3VtXG4gICAgcHJpbnRlciA9IHByaW50ZXIgfHwgZm4ucHJpbnRlclxuXG4gICAgdGhpcy50b3RhbHMgPSB0aGlzLnRvdGFscyB8fCBuZXcgUm93XG5cbiAgICB2YXIgdmFsXG4gICAgdmFyIHJvd3MgPSB0aGlzLnJvd3NcblxuICAgIHRoaXMudG90YWxzLl9fY2VsbChjb2wsIG51bGwsIGZ1bmN0aW9uIChfLCB3aWR0aCkge1xuICAgICAgICBpZiAod2lkdGggIT0gbnVsbCkgcmV0dXJuIHByaW50ZXIodmFsLCB3aWR0aClcbiAgICAgICAgdmFsID0gcm93cy5yZWR1Y2UoZnVuY3Rpb24gKHZhbCwgcm93LCBpbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIGZuKHZhbCwgcm93W2NvbF0sIGluZGV4LCByb3dzLmxlbmd0aClcbiAgICAgICAgfSwgbnVsbClcbiAgICAgICAgcmV0dXJuIHByaW50ZXIodmFsKVxuICAgIH0pXG4gICAgcmV0dXJuIHRoaXNcbn1cblxuVGFibGUucHJvdG90eXBlLnNoaWZ0ID0gJyAgJ1xuXG5UYWJsZS5wcm90b3R5cGUucHJpbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHByaW50KHRoaXMucm93cywgdGhpcy5jb2x1bW5zLCB0aGlzLnNoaWZ0KVxufVxuXG5UYWJsZS5wcm90b3R5cGUucHJpbnRUcmFuc3Bvc2VkID0gZnVuY3Rpb24gKGRlbGltZXRlcikge1xuICAgIHZhciB0ID0gbmV3IFRhYmxlXG4gICAgaWYgKGRlbGltZXRlcikgdC5zaGlmdCA9IGRlbGltZXRlclxuXG4gICAgZnVuY3Rpb24gUHJpbnRlciAocm93LCBrZXkpIHtcbiAgICAgICAgdmFyIHAgPSByb3cuX19wcmludGVycyAmJiByb3cuX19wcmludGVyc1trZXldXG4gICAgICAgIGlmIChwKSByZXR1cm4gZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgcmV0dXJuIHAodmFsKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIga2V5IGluIHRoaXMuY29sdW1ucykge1xuICAgICAgICB0LmNlbGwoJ2gnLCBrZXkpXG4gICAgICAgIHRoaXMucm93cy5mb3JFYWNoKGZ1bmN0aW9uIChyb3csIGluZGV4KSB7XG4gICAgICAgICAgICB0LmNlbGwoJ2YnICsgaW5kZXgsIHJvd1trZXldLCBQcmludGVyKHJvdywga2V5KSlcbiAgICAgICAgfSlcbiAgICAgICAgdC5uZXdSb3coKVxuICAgIH1cbiAgICByZXR1cm4gdC5wcmludCgpXG59XG5cblRhYmxlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGFkV2l0aERhc2hzID0gVGFibGUuUmlnaHRQYWRkZXIoJy0nKVxuICAgIHZhciBkZWxpbWV0ZXIgPSB0aGlzLmNyZWF0ZVJvdyhmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBbJycsIHBhZFdpdGhEYXNoc11cbiAgICB9KVxuICAgIHZhciBoZWFkID0gdGhpcy5jcmVhdGVSb3coZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gW2tleV1cbiAgICB9KVxuICAgIHZhciByb3dzID0gW2hlYWQsIGRlbGltZXRlcl0uY29uY2F0KHRoaXMucm93cylcbiAgICBpZiAodGhpcy50b3RhbHMpIHtcbiAgICAgICAgcm93cyA9IHJvd3MuY29uY2F0KFtkZWxpbWV0ZXIsIHRoaXMudG90YWxzXSlcbiAgICB9XG4gICAgcmV0dXJuIHByaW50KHJvd3MsIHRoaXMuY29sdW1ucywgdGhpcy5zaGlmdClcbn1cblxuVGFibGUucHJvdG90eXBlLmNyZWF0ZVJvdyA9IGZ1bmN0aW9uIChjYikge1xuICAgIHZhciByb3cgPSBuZXcgUm93XG4gICAgZm9yICh2YXIga2V5IGluIHRoaXMuY29sdW1ucykge1xuICAgICAgICB2YXIgYXJncyA9IGNiKGtleSlcbiAgICAgICAgcm93Ll9fY2VsbChrZXksIGFyZ3NbMF0sIGFyZ3NbMV0pXG4gICAgfVxuICAgIHJldHVybiByb3dcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IFRhYmxlXG5cbmZ1bmN0aW9uIFRhYmxlKCkge1xuICB0aGlzLnJvd3MgPSBbXVxuICB0aGlzLnJvdyA9IHtfX3ByaW50ZXJzIDoge319XG59XG5cbi8qKlxuICogUHVzaCB0aGUgY3VycmVudCByb3cgdG8gdGhlIHRhYmxlIGFuZCBzdGFydCBhIG5ldyBvbmVcbiAqXG4gKiBAcmV0dXJucyB7VGFibGV9IGB0aGlzYFxuICovXG5cblRhYmxlLnByb3RvdHlwZS5uZXdSb3cgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5yb3dzLnB1c2godGhpcy5yb3cpXG4gIHRoaXMucm93ID0ge19fcHJpbnRlcnMgOiB7fX1cbiAgcmV0dXJuIHRoaXNcbn1cblxuLyoqXG4gKiBXcml0ZSBjZWxsIGluIHRoZSBjdXJyZW50IHJvd1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2wgICAgICAgICAgLSBDb2x1bW4gbmFtZVxuICogQHBhcmFtIHtBbnl9IHZhbCAgICAgICAgICAgICAtIENlbGwgdmFsdWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtwcmludGVyXSAgLSBQcmludGVyIGZ1bmN0aW9uIHRvIGZvcm1hdCB0aGUgdmFsdWVcbiAqIEByZXR1cm5zIHtUYWJsZX0gYHRoaXNgXG4gKi9cblxuVGFibGUucHJvdG90eXBlLmNlbGwgPSBmdW5jdGlvbihjb2wsIHZhbCwgcHJpbnRlcikge1xuICB0aGlzLnJvd1tjb2xdID0gdmFsXG4gIHRoaXMucm93Ll9fcHJpbnRlcnNbY29sXSA9IHByaW50ZXIgfHwgc3RyaW5nXG4gIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogU3RyaW5nIHRvIHNlcGFyYXRlIGNvbHVtbnNcbiAqL1xuXG5UYWJsZS5wcm90b3R5cGUuc2VwYXJhdG9yID0gJyAgJ1xuXG5mdW5jdGlvbiBzdHJpbmcodmFsKSB7XG4gIHJldHVybiB2YWwgPT09IHVuZGVmaW5lZCA/ICcnIDogJycrdmFsXG59XG5cbmZ1bmN0aW9uIGxlbmd0aChzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkK20vZywgJycpLmxlbmd0aFxufVxuXG4vKipcbiAqIERlZmF1bHQgcHJpbnRlclxuICovXG5cblRhYmxlLnN0cmluZyA9IHN0cmluZ1xuXG4vKipcbiAqIENyZWF0ZSBhIHByaW50ZXIgd2hpY2ggcmlnaHQgYWxpZ25zIHRoZSBjb250ZW50IGJ5IHBhZGRpbmcgd2l0aCBgY2hgIG9uIHRoZSBsZWZ0XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGNoXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gKi9cblxuVGFibGUubGVmdFBhZGRlciA9IGxlZnRQYWRkZXJcblxuZnVuY3Rpb24gbGVmdFBhZGRlcihjaCkge1xuICByZXR1cm4gZnVuY3Rpb24odmFsLCB3aWR0aCkge1xuICAgIHZhciBzdHIgPSBzdHJpbmcodmFsKVxuICAgIHZhciBsZW4gPSBsZW5ndGgoc3RyKVxuICAgIHZhciBwYWQgPSB3aWR0aCA+IGxlbiA/IEFycmF5KHdpZHRoIC0gbGVuICsgMSkuam9pbihjaCkgOiAnJ1xuICAgIHJldHVybiBwYWQgKyBzdHJcbiAgfVxufVxuXG4vKipcbiAqIFByaW50ZXIgd2hpY2ggcmlnaHQgYWxpZ25zIHRoZSBjb250ZW50XG4gKi9cblxudmFyIHBhZExlZnQgPSBUYWJsZS5wYWRMZWZ0ID0gbGVmdFBhZGRlcignICcpXG5cbi8qKlxuICogQ3JlYXRlIGEgcHJpbnRlciB3aGljaCBwYWRzIHdpdGggYGNoYCBvbiB0aGUgcmlnaHRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY2hcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAqL1xuXG5UYWJsZS5yaWdodFBhZGRlciA9IHJpZ2h0UGFkZGVyXG5cbmZ1bmN0aW9uIHJpZ2h0UGFkZGVyKGNoKSB7XG4gIHJldHVybiBmdW5jdGlvbiBwYWRSaWdodCh2YWwsIHdpZHRoKSB7XG4gICAgdmFyIHN0ciA9IHN0cmluZyh2YWwpXG4gICAgdmFyIGxlbiA9IGxlbmd0aChzdHIpXG4gICAgdmFyIHBhZCA9IHdpZHRoID4gbGVuID8gQXJyYXkod2lkdGggLSBsZW4gKyAxKS5qb2luKGNoKSA6ICcnXG4gICAgcmV0dXJuIHN0ciArIHBhZFxuICB9XG59XG5cbnZhciBwYWRSaWdodCA9IHJpZ2h0UGFkZGVyKCcgJylcblxuLyoqXG4gKiBDcmVhdGUgYSBwcmludGVyIGZvciBudW1iZXJzXG4gKlxuICogV2lsbCBkbyByaWdodCBhbGlnbm1lbnQgYW5kIG9wdGlvbmFsbHkgZml4IHRoZSBudW1iZXIgb2YgZGlnaXRzIGFmdGVyIGRlY2ltYWwgcG9pbnRcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gW2RpZ2l0c10gLSBOdW1iZXIgb2YgZGlnaXRzIGZvciBmaXhwb2ludCBub3RhdGlvblxuICogQHJldHVybnMge0Z1bmN0aW9ufVxuICovXG5cblRhYmxlLm51bWJlciA9IGZ1bmN0aW9uKGRpZ2l0cykge1xuICByZXR1cm4gZnVuY3Rpb24odmFsLCB3aWR0aCkge1xuICAgIGlmICh2YWwgPT0gbnVsbCkgcmV0dXJuICcnXG4gICAgaWYgKHR5cGVvZiB2YWwgIT0gJ251bWJlcicpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJycrdmFsICsgJyBpcyBub3QgYSBudW1iZXInKVxuICAgIHZhciBzdHIgPSBkaWdpdHMgPT0gbnVsbCA/IHZhbCsnJyA6IHZhbC50b0ZpeGVkKGRpZ2l0cylcbiAgICByZXR1cm4gcGFkTGVmdChzdHIsIHdpZHRoKVxuICB9XG59XG5cbmZ1bmN0aW9uIGVhY2gocm93LCBmbikge1xuICBmb3IodmFyIGtleSBpbiByb3cpIHtcbiAgICBpZiAoa2V5ID09ICdfX3ByaW50ZXJzJykgY29udGludWVcbiAgICBmbihrZXksIHJvd1trZXldKVxuICB9XG59XG5cbi8qKlxuICogR2V0IGxpc3Qgb2YgY29sdW1ucyBpbiBwcmludGluZyBvcmRlclxuICpcbiAqIEByZXR1cm5zIHtzdHJpbmdbXX1cbiAqL1xuXG5UYWJsZS5wcm90b3R5cGUuY29sdW1ucyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgY29scyA9IHt9XG4gIGZvcih2YXIgaSA9IDA7IGkgPCAyOyBpKyspIHsgLy8gZG8gMiB0aW1lc1xuICAgIHRoaXMucm93cy5mb3JFYWNoKGZ1bmN0aW9uKHJvdykge1xuICAgICAgdmFyIGlkeCA9IDBcbiAgICAgIGVhY2gocm93LCBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWR4ID0gTWF0aC5tYXgoaWR4LCBjb2xzW2tleV0gfHwgMClcbiAgICAgICAgY29sc1trZXldID0gaWR4XG4gICAgICAgIGlkeCsrXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbiAgcmV0dXJuIE9iamVjdC5rZXlzKGNvbHMpLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBjb2xzW2FdIC0gY29sc1tiXVxuICB9KVxufVxuXG4vKipcbiAqIEZvcm1hdCBqdXN0IHJvd3MsIGkuZS4gcHJpbnQgdGhlIHRhYmxlIHdpdGhvdXQgaGVhZGVycyBhbmQgdG90YWxzXG4gKlxuICogQHJldHVybnMge1N0cmluZ30gU3RyaW5nIHJlcHJlc2VudGFpb24gb2YgdGhlIHRhYmxlXG4gKi9cblxuVGFibGUucHJvdG90eXBlLnByaW50ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBjb2xzID0gdGhpcy5jb2x1bW5zKClcbiAgdmFyIHNlcGFyYXRvciA9IHRoaXMuc2VwYXJhdG9yXG4gIHZhciB3aWR0aHMgPSB7fVxuICB2YXIgb3V0ID0gJydcblxuICAvLyBDYWxjIHdpZHRoc1xuICB0aGlzLnJvd3MuZm9yRWFjaChmdW5jdGlvbihyb3cpIHtcbiAgICBlYWNoKHJvdywgZnVuY3Rpb24oa2V5LCB2YWwpIHtcbiAgICAgIHZhciBzdHIgPSByb3cuX19wcmludGVyc1trZXldLmNhbGwocm93LCB2YWwpXG4gICAgICB3aWR0aHNba2V5XSA9IE1hdGgubWF4KGxlbmd0aChzdHIpLCB3aWR0aHNba2V5XSB8fCAwKVxuICAgIH0pXG4gIH0pXG5cbiAgLy8gTm93IHByaW50XG4gIHRoaXMucm93cy5mb3JFYWNoKGZ1bmN0aW9uKHJvdykge1xuICAgIHZhciBsaW5lID0gJydcbiAgICBjb2xzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXIgd2lkdGggPSB3aWR0aHNba2V5XVxuICAgICAgdmFyIHN0ciA9IHJvdy5oYXNPd25Qcm9wZXJ0eShrZXkpXG4gICAgICAgID8gJycrcm93Ll9fcHJpbnRlcnNba2V5XS5jYWxsKHJvdywgcm93W2tleV0sIHdpZHRoKVxuICAgICAgICA6ICcnXG4gICAgICBsaW5lICs9IHBhZFJpZ2h0KHN0ciwgd2lkdGgpICsgc2VwYXJhdG9yXG4gICAgfSlcbiAgICBsaW5lID0gbGluZS5zbGljZSgwLCAtc2VwYXJhdG9yLmxlbmd0aClcbiAgICBvdXQgKz0gbGluZSArICdcXG4nXG4gIH0pXG5cbiAgcmV0dXJuIG91dFxufVxuXG4vKipcbiAqIEZvcm1hdCB0aGUgdGFibGVcbiAqXG4gKiBAcmV0dXJucyB7U3RyaW5nfVxuICovXG5cblRhYmxlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgY29scyA9IHRoaXMuY29sdW1ucygpXG4gIHZhciBvdXQgPSBuZXcgVGFibGUoKVxuXG4gIC8vIGNvcHkgb3B0aW9uc1xuICBvdXQuc2VwYXJhdG9yID0gdGhpcy5zZXBhcmF0b3JcblxuICAvLyBXcml0ZSBoZWFkZXJcbiAgY29scy5mb3JFYWNoKGZ1bmN0aW9uKGNvbCkge1xuICAgIG91dC5jZWxsKGNvbCwgY29sKVxuICB9KVxuICBvdXQubmV3Um93KClcbiAgb3V0LnB1c2hEZWxpbWV0ZXIoY29scylcblxuICAvLyBXcml0ZSBib2R5XG4gIG91dC5yb3dzID0gb3V0LnJvd3MuY29uY2F0KHRoaXMucm93cylcblxuICAvLyBUb3RhbHNcbiAgaWYgKHRoaXMudG90YWxzICYmIHRoaXMucm93cy5sZW5ndGgpIHtcbiAgICBvdXQucHVzaERlbGltZXRlcihjb2xzKVxuICAgIHRoaXMuZm9yRWFjaFRvdGFsKG91dC5jZWxsLmJpbmQob3V0KSlcbiAgICBvdXQubmV3Um93KClcbiAgfVxuXG4gIHJldHVybiBvdXQucHJpbnQoKVxufVxuXG4vKipcbiAqIFB1c2ggZGVsaW1ldGVyIHJvdyB0byB0aGUgdGFibGUgKHdpdGggZWFjaCBjZWxsIGZpbGxlZCB3aXRoIGRhc2hzIGR1cmluZyBwcmludGluZylcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ1tdfSBbY29sc11cbiAqIEByZXR1cm5zIHtUYWJsZX0gYHRoaXNgXG4gKi9cblxuVGFibGUucHJvdG90eXBlLnB1c2hEZWxpbWV0ZXIgPSBmdW5jdGlvbihjb2xzKSB7XG4gIGNvbHMgPSBjb2xzIHx8IHRoaXMuY29sdW1ucygpXG4gIGNvbHMuZm9yRWFjaChmdW5jdGlvbihjb2wpIHtcbiAgICB0aGlzLmNlbGwoY29sLCB1bmRlZmluZWQsIGxlZnRQYWRkZXIoJy0nKSlcbiAgfSwgdGhpcylcbiAgcmV0dXJuIHRoaXMubmV3Um93KClcbn1cblxuLyoqXG4gKiBDb21wdXRlIGFsbCB0b3RhbHMgYW5kIHlpZWxkIHRoZSByZXN1bHRzIHRvIGBjYmBcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIENhbGxiYWNrIGZ1bmN0aW9uIHdpdGggc2lnbmF0dXJlIGAoY29sdW1uLCB2YWx1ZSwgcHJpbnRlcilgXG4gKi9cblxuVGFibGUucHJvdG90eXBlLmZvckVhY2hUb3RhbCA9IGZ1bmN0aW9uKGNiKSB7XG4gIGZvcih2YXIga2V5IGluIHRoaXMudG90YWxzKSB7XG4gICAgdmFyIGFnZ3IgPSB0aGlzLnRvdGFsc1trZXldXG4gICAgdmFyIGFjYyA9IGFnZ3IuaW5pdFxuICAgIHZhciBsZW4gPSB0aGlzLnJvd3MubGVuZ3RoXG4gICAgdGhpcy5yb3dzLmZvckVhY2goZnVuY3Rpb24ocm93LCBpZHgpIHtcbiAgICAgIGFjYyA9IGFnZ3IucmVkdWNlLmNhbGwocm93LCBhY2MsIHJvd1trZXldLCBpZHgsIGxlbilcbiAgICB9KVxuICAgIGNiKGtleSwgYWNjLCBhZ2dyLnByaW50ZXIpXG4gIH1cbn1cblxuLyoqXG4gKiBGb3JtYXQgdGhlIHRhYmxlIHNvIHRoYXQgZWFjaCByb3cgcmVwcmVzZW50cyBjb2x1bW4gYW5kIGVhY2ggY29sdW1uIHJlcHJlc2VudHMgcm93XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRzXVxuICogQHBhcmFtIHtTdHJpbmd9IFtvcHMuc2VwYXJhdG9yXSAtIENvbHVtbiBzZXBhcmF0aW9uIHN0cmluZ1xuICogQHBhcmFtIHtGdW5jdGlvbn0gW29wdHMubmFtZVByaW50ZXJdIC0gUHJpbnRlciB0byBmb3JtYXQgY29sdW1uIG5hbWVzXG4gKiBAcmV0dXJucyB7U3RyaW5nfVxuICovXG5cblRhYmxlLnByb3RvdHlwZS5wcmludFRyYW5zcG9zZWQgPSBmdW5jdGlvbihvcHRzKSB7XG4gIG9wdHMgPSBvcHRzIHx8IHt9XG4gIHZhciBvdXQgPSBuZXcgVGFibGVcbiAgb3V0LnNlcGFyYXRvciA9IG9wdHMuc2VwYXJhdG9yIHx8IHRoaXMuc2VwYXJhdG9yXG4gIHRoaXMuY29sdW1ucygpLmZvckVhY2goZnVuY3Rpb24oY29sKSB7XG4gICAgb3V0LmNlbGwoMCwgY29sLCBvcHRzLm5hbWVQcmludGVyKVxuICAgIHRoaXMucm93cy5mb3JFYWNoKGZ1bmN0aW9uKHJvdywgaWR4KSB7XG4gICAgICBvdXQuY2VsbChpZHgrMSwgcm93W2NvbF0sIHJvdy5fX3ByaW50ZXJzW2NvbF0pXG4gICAgfSlcbiAgICBvdXQubmV3Um93KClcbiAgfSwgdGhpcylcbiAgcmV0dXJuIG91dC5wcmludCgpXG59XG5cbi8qKlxuICogU29ydCB0aGUgdGFibGVcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufHN0cmluZ1tdfSBbY21wXSAtIEVpdGhlciBjb21wYXJlIGZ1bmN0aW9uIG9yIGEgbGlzdCBvZiBjb2x1bW5zIHRvIHNvcnQgb25cbiAqIEByZXR1cm5zIHtUYWJsZX0gYHRoaXNgXG4gKi9cblxuVGFibGUucHJvdG90eXBlLnNvcnQgPSBmdW5jdGlvbihjbXApIHtcbiAgaWYgKHR5cGVvZiBjbXAgPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRoaXMucm93cy5zb3J0KGNtcClcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgdmFyIGtleXMgPSBBcnJheS5pc0FycmF5KGNtcCkgPyBjbXAgOiB0aGlzLmNvbHVtbnMoKVxuXG4gIHZhciBjb21wYXJhdG9ycyA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgIHZhciBvcmRlciA9ICdhc2MnXG4gICAgdmFyIG0gPSAvKC4qKVxcfFxccyooYXNjfGRlcylcXHMqJC8uZXhlYyhrZXkpXG4gICAgaWYgKG0pIHtcbiAgICAgIGtleSA9IG1bMV1cbiAgICAgIG9yZGVyID0gbVsyXVxuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgIHJldHVybiBvcmRlciA9PSAnYXNjJ1xuICAgICAgICA/IGNvbXBhcmUoYVtrZXldLCBiW2tleV0pXG4gICAgICAgIDogY29tcGFyZShiW2tleV0sIGFba2V5XSlcbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIHRoaXMuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb21wYXJhdG9ycy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG9yZGVyID0gY29tcGFyYXRvcnNbaV0oYSwgYilcbiAgICAgIGlmIChvcmRlciAhPSAwKSByZXR1cm4gb3JkZXJcbiAgICB9XG4gICAgcmV0dXJuIDBcbiAgfSlcbn1cblxuZnVuY3Rpb24gY29tcGFyZShhLCBiKSB7XG4gIGlmIChhID09PSBiKSByZXR1cm4gMFxuICBpZiAoYSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gMVxuICBpZiAoYiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gLTFcbiAgaWYgKGEgPT09IG51bGwpIHJldHVybiAxXG4gIGlmIChiID09PSBudWxsKSByZXR1cm4gLTFcbiAgaWYgKGEgPiBiKSByZXR1cm4gMVxuICBpZiAoYSA8IGIpIHJldHVybiAtMVxuICByZXR1cm4gY29tcGFyZShTdHJpbmcoYSksIFN0cmluZyhiKSlcbn1cblxuLyoqXG4gKiBBZGQgYSB0b3RhbCBmb3IgdGhlIGNvbHVtblxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2wgLSBjb2x1bW4gbmFtZVxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRzXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW29wdHMucmVkdWNlID0gc3VtXSAtIHJlZHVjZShhY2MsIHZhbCwgaWR4LCBsZW5ndGgpIGZ1bmN0aW9uIHRvIGNvbXB1dGUgdGhlIHRvdGFsIHZhbHVlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbb3B0cy5wcmludGVyID0gcGFkTGVmdF0gLSBQcmludGVyIHRvIGZvcm1hdCB0aGUgdG90YWwgY2VsbFxuICogQHBhcmFtIHtBbnl9IFtvcHRzLmluaXQgPSAwXSAtIEluaXRpYWwgdmFsdWUgZm9yIHJlZHVjdGlvblxuICogQHJldHVybnMge1RhYmxlfSBgdGhpc2BcbiAqL1xuXG5UYWJsZS5wcm90b3R5cGUudG90YWwgPSBmdW5jdGlvbihjb2wsIG9wdHMpIHtcbiAgb3B0cyA9IG9wdHMgfHwge31cbiAgdGhpcy50b3RhbHMgPSB0aGlzLnRvdGFscyB8fCB7fVxuICB0aGlzLnRvdGFsc1tjb2xdID0ge1xuICAgIHJlZHVjZTogb3B0cy5yZWR1Y2UgfHwgVGFibGUuYWdnci5zdW0sXG4gICAgcHJpbnRlcjogb3B0cy5wcmludGVyIHx8IHBhZExlZnQsXG4gICAgaW5pdDogb3B0cy5pbml0ID09IG51bGwgPyAwIDogb3B0cy5pbml0XG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuLyoqXG4gKiBQcmVkZWZpbmVkIGhlbHBlcnMgZm9yIHRvdGFsc1xuICovXG5cblRhYmxlLmFnZ3IgPSB7fVxuXG4vKipcbiAqIENyZWF0ZSBhIHByaW50ZXIgd2hpY2ggZm9ybWF0cyB0aGUgdmFsdWUgd2l0aCBgcHJpbnRlcmAsXG4gKiBhZGRzIHRoZSBgcHJlZml4YCB0byBpdCBhbmQgcmlnaHQgYWxpZ25zIHRoZSB3aG9sZSB0aGluZ1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwcmVmaXhcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHByaW50ZXJcbiAqIEByZXR1cm5zIHtwcmludGVyfVxuICovXG5cblRhYmxlLmFnZ3IucHJpbnRlciA9IGZ1bmN0aW9uKHByZWZpeCwgcHJpbnRlcikge1xuICBwcmludGVyID0gcHJpbnRlciB8fCBzdHJpbmdcbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbCwgd2lkdGgpIHtcbiAgICByZXR1cm4gcGFkTGVmdChwcmVmaXggKyBwcmludGVyKHZhbCksIHdpZHRoKVxuICB9XG59XG5cbi8qKlxuICogU3VtIHJlZHVjdGlvblxuICovXG5cblRhYmxlLmFnZ3Iuc3VtID0gZnVuY3Rpb24oYWNjLCB2YWwpIHtcbiAgcmV0dXJuIGFjYyArIHZhbFxufVxuXG4vKipcbiAqIEF2ZXJhZ2UgcmVkdWN0aW9uXG4gKi9cblxuVGFibGUuYWdnci5hdmcgPSBmdW5jdGlvbihhY2MsIHZhbCwgaWR4LCBsZW4pIHtcbiAgYWNjID0gYWNjICsgdmFsXG4gIHJldHVybiBpZHggKyAxID09IGxlbiA/IGFjYy9sZW4gOiBhY2Ncbn1cblxuLyoqXG4gKiBQcmludCB0aGUgYXJyYXkgb3Igb2JqZWN0XG4gKlxuICogQHBhcmFtIHtBcnJheXxPYmplY3R9IG9iaiAtIE9iamVjdCB0byBwcmludFxuICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R9IFtmb3JtYXRdIC0gRm9ybWF0IG9wdGlvbnNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYl0gLSBUYWJsZSBwb3N0IHByb2Nlc3NpbmcgYW5kIGZvcm1hdGluZ1xuICogQHJldHVybnMge1N0cmluZ31cbiAqL1xuXG5UYWJsZS5wcmludCA9IGZ1bmN0aW9uKG9iaiwgZm9ybWF0LCBjYikge1xuICB2YXIgb3B0cyA9IGZvcm1hdCB8fCB7fVxuXG4gIGZvcm1hdCA9IHR5cGVvZiBmb3JtYXQgPT0gJ2Z1bmN0aW9uJ1xuICAgID8gZm9ybWF0XG4gICAgOiBmdW5jdGlvbihvYmosIGNlbGwpIHtcbiAgICAgIGZvcih2YXIga2V5IGluIG9iaikge1xuICAgICAgICBpZiAoIW9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZVxuICAgICAgICB2YXIgcGFyYW1zID0gb3B0c1trZXldIHx8IHt9XG4gICAgICAgIGNlbGwocGFyYW1zLm5hbWUgfHwga2V5LCBvYmpba2V5XSwgcGFyYW1zLnByaW50ZXIpXG4gICAgICB9XG4gICAgfVxuXG4gIHZhciB0ID0gbmV3IFRhYmxlXG4gIHZhciBjZWxsID0gdC5jZWxsLmJpbmQodClcblxuICBpZiAoQXJyYXkuaXNBcnJheShvYmopKSB7XG4gICAgY2IgPSBjYiB8fCBmdW5jdGlvbih0KSB7IHJldHVybiB0LnRvU3RyaW5nKCkgfVxuICAgIG9iai5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIGZvcm1hdChpdGVtLCBjZWxsKVxuICAgICAgdC5uZXdSb3coKVxuICAgIH0pXG4gIH0gZWxzZSB7XG4gICAgY2IgPSBjYiB8fCBmdW5jdGlvbih0KSB7IHJldHVybiB0LnByaW50VHJhbnNwb3NlZCh7c2VwYXJhdG9yOiAnIDogJ30pIH1cbiAgICBmb3JtYXQob2JqLCBjZWxsKVxuICAgIHQubmV3Um93KClcbiAgfVxuXG4gIHJldHVybiBjYih0KVxufVxuXG4vKipcbiAqIFNhbWUgYXMgYFRhYmxlLnByaW50KClgIGJ1dCB5aWVsZHMgdGhlIHJlc3VsdCB0byBgY29uc29sZS5sb2coKWBcbiAqL1xuXG5UYWJsZS5sb2cgPSBmdW5jdGlvbihvYmosIGZvcm1hdCwgY2IpIHtcbiAgY29uc29sZS5sb2coVGFibGUucHJpbnQob2JqLCBmb3JtYXQsIGNiKSlcbn1cblxuLyoqXG4gKiBTYW1lIGFzIGAudG9TdHJpbmcoKWAgYnV0IHlpZWxkcyB0aGUgcmVzdWx0IHRvIGBjb25zb2xlLmxvZygpYFxuICovXG5cblRhYmxlLnByb3RvdHlwZS5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2codGhpcy50b1N0cmluZygpKVxufVxuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHByb2ZpbGU7XG5cbmZ1bmN0aW9uIHByb2ZpbGUoZm4sIGNvbmZpZykge1xuXG4gICAgaWYgKCEoZm4gaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBmdW5jdGlvbiB0byBwcm9maWxlIScpO1xuICAgIH1cblxuICAgIGNvbmZpZyA9IHV0aWxzLmNvbmZpZ3VyZSh7XG4gICAgICAgIGxpbWl0SXRlcmF0aW9uczogMWUzLFxuICAgICAgICBsaW1pdFRpbWU6IDEwMFxuICAgIH0sIGNvbmZpZyk7XG5cbiAgICB2YXIgc3RhcnRlZCA9IERhdGUubm93KCk7XG4gICAgdmFyIGxhc3RSZXN1bHQsXG4gICAgICAgIGVsYXBzZWQsXG4gICAgICAgIG9wZXJhdGlvbnMgPSAwO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcblxuICAgICAgICBsYXN0UmVzdWx0ID0gZm4oKTtcbiAgICAgICAgZWxhcHNlZCA9IERhdGUubm93KCkgLSBzdGFydGVkO1xuICAgICAgICBvcGVyYXRpb25zKys7XG5cbiAgICAgICAgaWYgKGVsYXBzZWQgPj0gY29uZmlnLmxpbWl0VGltZVxuICAgICAgICB8fCAgb3BlcmF0aW9ucyA+PSBjb25maWcubGltaXRJdGVyYXRpb25zKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIG9wczogb3BlcmF0aW9ucyAvIGVsYXBzZWQgKiAxMDAwLFxuICAgICAgICB0aW1lOiBlbGFwc2VkIC8gb3BlcmF0aW9ucyxcbiAgICAgICAgbGFzdFJlc3VsdDogbGFzdFJlc3VsdFxuICAgIH07XG59IiwicmVxdWlyZSgnY29uc29sZS50YWJsZScpO1xudmFyIGVhc3lUYWJsZSA9IHJlcXVpcmUoJ2Vhc3ktdGFibGUnKTtcbi8vdmFyIFRhYmxlID0gcmVxdWlyZSgnZWFzeS10YWJsZScpO1xuXG52YXIgc3VpdGUgPSByZXF1aXJlKCcuL3N1aXRlJyk7XG52YXIgZm9ybWF0TnVtYmVyID0gcmVxdWlyZSgnLi91dGlscycpLmZvcm1hdE51bWJlcjtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVwb3J0O1xuXG5mdW5jdGlvbiByZXBvcnQocmVzdWx0LCBvcHRpb25zKSB7XG5cbiAgICByZXN1bHQgPSByZXN1bHQubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuYW1lOiB4Lm5hbWUsXG4gICAgICAgICAgICBvcHM6IHV0aWxzLmZvcm1hdE51bWJlcih4Lm9wcyksXG4gICAgICAgICAgICB0aW1lOiB1dGlscy5mb3JtYXROdW1iZXIoeC50aW1lKVxuICAgICAgICB9O1xuICAgIH0pO1xuICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgY29uc29sZS50YWJsZShyZXN1bHQpO1xuICAgIHJldHVybjtcblxuICAgIHZhciBnZXRNYXhMZW5ndGggPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHZhciBoZWFkZXJMZW5ndGggPSBoZWFkZXJzW2tleV0ubGVuZ3RoO1xuXG4gICAgICAgIHZhciBjb2x1bW4gPSByZXN1bHQubWFwKHV0aWxzLnByb3Aoa2V5KSk7XG4gICAgICAgIHZhciBjb2x1bW5MZW5ndGggPSBjb2x1bW4ubWFwKHV0aWxzLnByb3AoJ2xlbmd0aCcpKTtcbiAgICAgICAgdmFyIG1heENvbHVtbkxlbmd0aCA9IHV0aWxzLm1heChjb2x1bW5MZW5ndGgpO1xuXG4gICAgICAgIHJldHVybiBNYXRoLm1heChoZWFkZXJMZW5ndGgsIG1heENvbHVtbkxlbmd0aCk7XG4gICAgfTtcblxuICAgIHZhciBnZXRDaGFydExlbmd0aCA9IGZ1bmN0aW9uICh4LCBtYXhPcHMpIHtcbiAgICAgICAgdmFyIGNoYXJ0V2lkdGggPSBjb25maWcuY2hhcnRXaWR0aCAtIDE7XG4gICAgICAgIHZhciBrID0geC5vcmlnaW5hbC5vcHMgLyBtYXhPcHM7XG4gICAgICAgIGlmIChpc05hTihrKSkge1xuICAgICAgICAgICAgcmV0dXJuIGNoYXJ0V2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1hdGgucm91bmQoY2hhcnRXaWR0aCAqIGspO1xuICAgIH07XG5cbiAgICAvLyBpbml0XG5cbiAgICB2YXIgY29uZmlnID0ge1xuICAgICAgICBjaGFydFdpZHRoOiAyMFxuICAgIH07XG5cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT0gJ29iamVjdCcgKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKG9wdGlvbnMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgY29uZmlnW2tleV0gPSBvcHRpb25zW2tleV07XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGNvbHVtbiBoZWFkZXJzXG4gICAgdmFyIGhlYWRlcnMgPSB7XG4gICAgICAgIG5hbWU6ICdOYW1lJyxcbiAgICAgICAgb3BzOiAnSXRlcmF0aW9ucyBwZXIgc2Vjb25kJyxcbiAgICAgICAgdGltZTogJ0F2ZXJhZ2UgdGltZSwgbXMnLFxuICAgICAgICBjaGFydDogJ3gnXG4gICAgfTtcblxuICAgIC8vIG1heCBvcGVyYXRpb25zIHBlciBzZWNvbmQgdmFsdWVcbiAgICB2YXIgbWF4T3BzID0gdXRpbHMubWF4KHJlc3VsdC5tYXAodXRpbHMucHJvcCgnb3BzJykpKTtcblxuICAgIC8vIGZvcm1hdHRpbmdcbiAgICByZXN1bHQgPSByZXN1bHQubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuYW1lOiB4Lm5hbWUsXG4gICAgICAgICAgICBvcHM6IHV0aWxzLmZvcm1hdE51bWJlcih4Lm9wcyksXG4gICAgICAgICAgICB0aW1lOiB1dGlscy5mb3JtYXROdW1iZXIoeC50aW1lKSxcbiAgICAgICAgICAgIGxhc3RSZXN1bHQ6IHgubGFzdFJlc3VsdCxcbiAgICAgICAgICAgIG9yaWdpbmFsOiB4XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICAvLyBjb2x1bW5zJyB3aWR0aHNcbiAgICB2YXIgbmFtZU1heExlbmd0aCA9IGdldE1heExlbmd0aCgnbmFtZScpO1xuICAgIHZhciBvcHNNYXhMZW5ndGggPSBnZXRNYXhMZW5ndGgoJ29wcycpO1xuICAgIHZhciB0aW1lTWF4TGVuZ3RoID0gZ2V0TWF4TGVuZ3RoKCd0aW1lJyk7XG5cbiAgICAvLyBmaW5hbCBwcm9jZXNzaW5nIGFuZCBvdXRwdXRcbiAgICB2YXIgcm93U2VwYXJhdG9yID0gJ1xcbic7XG4gICAgdmFyIGNlbGxTZXBhcmF0b3IgPSAnIHwgJztcblxuICAgIHZhciByb3dzID0gcmVzdWx0XG4gICAgICAgIC5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgdXRpbHMucGFkKHgubmFtZSwgbmFtZU1heExlbmd0aCksXG4gICAgICAgICAgICAgICAgdXRpbHMucGFkKHgub3BzLCBvcHNNYXhMZW5ndGgpLFxuICAgICAgICAgICAgICAgIHV0aWxzLnBhZCh4LnRpbWUsIHRpbWVNYXhMZW5ndGgpLFxuICAgICAgICAgICAgICAgIHV0aWxzLnBhZCh1dGlscy5yZXBlYXQoJz0nLCBnZXRDaGFydExlbmd0aCh4LCBtYXhPcHMpKSArICc+JywgY29uZmlnLmNoYXJ0V2lkdGgpXG4gICAgICAgICAgICBdLmpvaW4oY2VsbFNlcGFyYXRvcik7XG4gICAgICAgIH0pO1xuXG4gICAgaGVhZGVycyA9IFtcbiAgICAgICAgdXRpbHMucGFkKGhlYWRlcnMubmFtZSwgbmFtZU1heExlbmd0aCksXG4gICAgICAgIHV0aWxzLnBhZChoZWFkZXJzLm9wcywgb3BzTWF4TGVuZ3RoKSxcbiAgICAgICAgdXRpbHMucGFkTGVmdChoZWFkZXJzLnRpbWUsIHRpbWVNYXhMZW5ndGgpLFxuICAgICAgICB1dGlscy5wYWQoaGVhZGVycy5jaGFydCwgY29uZmlnLmNoYXJ0V2lkdGgpXG4gICAgXTtcblxuICAgIHZhciBwcmVmaXggPSAnfCAnO1xuICAgIHZhciBzdWZmaXggPSAnIHwnO1xuXG4gICAgdmFyIG91dHB1dCA9IFtdO1xuICAgIHZhciB0b3RhbFdpZHRoID0gcm93c1swXS5sZW5ndGggKyBwcmVmaXgubGVuZ3RoICsgc3VmZml4Lmxlbmd0aDtcbiAgICB2YXIgaG9yaXpvbnRhbExpbmUgPSAnKycgKyB1dGlscy5yZXBlYXQoJy0nLCB0b3RhbFdpZHRoIC0gMikgKyAnKyc7XG5cbiAgICBvdXRwdXQucHVzaChob3Jpem9udGFsTGluZSk7XG4gICAgb3V0cHV0LnB1c2gocHJlZml4ICsgaGVhZGVycy5qb2luKGNlbGxTZXBhcmF0b3IpICsgc3VmZml4KTtcbiAgICBvdXRwdXQucHVzaChob3Jpem9udGFsTGluZSk7XG4gICAgb3V0cHV0LnB1c2gocm93cy5tYXAoZnVuY3Rpb24gKHgsIGkpIHtcbiAgICAgICAgdmFyIGNvbG9yID0gaSA9PSAwICYmICdncmVlbidcbiAgICAgICAgICAgICAgICB8fCAgaSA9PSAxICYmICd5ZWxsb3cnXG4gICAgICAgICAgICAgICAgfHwgICAgICAgICAgICAncmVzZXQnO1xuICAgICAgICB4ID0gY2hhbGtbY29sb3JdKHgpO1xuICAgICAgICByZXR1cm4gcHJlZml4ICsgeCArIHN1ZmZpeDtcbiAgICB9KS5qb2luKHJvd1NlcGFyYXRvcikpO1xuICAgIG91dHB1dC5wdXNoKGhvcml6b250YWxMaW5lKTtcblxuICAgIHJldHVybiBvdXRwdXQuam9pbignXFxuJyk7XG59IiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIHByb2ZpbGUgPSByZXF1aXJlKCcuL3Byb2ZpbGUnKTtcbnZhciByZXBvcnQgPSByZXF1aXJlKCcuL3JlcG9ydCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHN1aXRlO1xuXG5mdW5jdGlvbiBleHRyYWN0RnVuY3Rpb25OYW1lKGZuKSB7XG4gICAgdmFyIGV4Y2x1ZGUgPSBbJ2Z1bmN0aW9uJywgJ3JldHVybiddO1xuICAgIHZhciB3b3JkcyA9IGZuXG4gICAgICAgIC50b1N0cmluZygpXG4gICAgICAgIC5yZXBsYWNlKC8hLiokLywgJycpXG4gICAgICAgIC5tYXRjaCgvKFtcXHddKykvZylcbiAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIGV4Y2x1ZGUuaW5kZXhPZih4LnRyaW0oKSkgPT0gLTE7XG4gICAgICAgIH0pO1xuICAgIHJldHVybiB1dGlscy5jcm9wKHdvcmRzLmpvaW4oJyAnKS50cmltKCksIDIwKTtcbn1cblxuZnVuY3Rpb24gc3VpdGUoc3BlY3MsIGNvbmZpZykge1xuICAgIHNwZWNzID0gc3BlY3MgfHwgW107XG4gICAgY29uZmlnID0gdXRpbHMuY29uZmlndXJlKGNvbmZpZywge1xuICAgICAgICBsaW1pdFRpbWU6IDEsIC8vIHByb2ZpbGVcbiAgICAgICAgbGltaXRJdGVyYXRpb25zOiAxLCAgLy8gcHJvZmlsZVxuICAgICAgICByZXBlYXRUaW1lczogMSxcbiAgICAgICAgcHJpbnRSZXBvcnQ6IGZhbHNlLFxuICAgICAgICBjYWNoZVdhcm1VcEl0ZXJhdGlvbnM6IDAsXG4gICAgICAgIGNoYXJ0V2lkdGg6IDIwIC8vIHJlcG9ydFxuICAgIH0pO1xuXG4gICAgdmFyIHJlcGVhdEZuID0gZnVuY3Rpb24gKGZuLCB0aW1lcykge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aW1lczsgaSsrKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgdmFyIHN1aXRlUmVzdWx0ID0gc3BlY3MubWFwKGZ1bmN0aW9uIChmbikge1xuICAgICAgICB2YXIgbmFtZSA9IGZuLm5hbWUgfHwgZXh0cmFjdEZ1bmN0aW9uTmFtZShmbikgfHwgdXRpbHMudW5pcUlkKCd0ZXN0LScpO1xuICAgICAgICBpZiAoY29uZmlnLnJlcGVhdFRpbWVzICE9IDEpIHtcbiAgICAgICAgICAgIGZuID0gcmVwZWF0Rm4oZm4sIGNvbmZpZy5yZXBlYXRUaW1lcyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlc3VsdCA9IHByb2ZpbGUoZm4sIGNvbmZpZyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgb3BzOiByZXN1bHQub3BzLFxuICAgICAgICAgICAgdGltZTogcmVzdWx0LnRpbWUsXG4gICAgICAgICAgICBsYXN0UmVzdWx0OiByZXN1bHQubGFzdFJlc3VsdFxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgc3VpdGVSZXN1bHQuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gYi5vcHMgLSBhLm9wcztcbiAgICB9KTtcblxuICAgIGlmIChjb25maWcucHJpbnRSZXBvcnQpIHtcbiAgICAgICAgY29uc29sZS5sb2cocmVwb3J0KHN1aXRlUmVzdWx0LCBjb25maWcpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VpdGVSZXN1bHQ7XG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgLy8gbnVtYmVyXG4gICAgZm9ybWF0TnVtYmVyOiBmb3JtYXROdW1iZXIsXG4gICAgLy8gc3RyaW5nXG4gICAgcGFkOiBwYWQsXG4gICAgcGFkTGVmdDogcGFkTGVmdCxcbiAgICBjcm9wOiBjcm9wLFxuICAgIC8vIGZ1bmN0aW9uYWxcbiAgICBwcm9wOiBwcm9wLFxuICAgIG1heDogbWF4LFxuICAgIHJlcGVhdDogcmVwZWF0LFxuICAgIHVuaXFJZDogdW5pcUlkLFxuICAgIC8vIG9iamVjdFxuICAgIGNvbmZpZ3VyZTogY29uZmlndXJlXG59O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuZnVuY3Rpb24gZm9ybWF0TnVtYmVyKG4pIHtcbiAgICBpZiAodHlwZW9mIG4gPT0gJ251bWJlcicpIHtcbiAgICAgICAgc3dpdGNoICh0cnVlKSB7XG4gICAgICAgICAgICBjYXNlIG4gPT09IDA6XG4gICAgICAgICAgICAgICAgcmV0dXJuICcwJztcbiAgICAgICAgICAgIGNhc2UgbiA8IDE6XG4gICAgICAgICAgICAgICAgcmV0dXJuIG4udG9GaXhlZCgyKTtcbiAgICAgICAgICAgIGNhc2UgbiA8IDEwMDA6XG4gICAgICAgICAgICAgICAgcmV0dXJuIG4udG9GaXhlZCgwKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIG4udG9FeHBvbmVudGlhbCgxKS5yZXBsYWNlKC9lXFwrLywgJyB4IDEwXicpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG47XG4gICAgfVxufVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuZnVuY3Rpb24gcGFkKHN0ciwgbiwgY2hhcikge1xuICAgIGlmIChjaGFyID09PSB1bmRlZmluZWQgfHwgY2hhciA9PT0gJycpIHtcbiAgICAgICAgY2hhciA9ICcgJztcbiAgICB9XG4gICAgaWYgKHN0ci5sZW5ndGggPCBuKSB7XG4gICAgICAgIHJldHVybiBwYWQoc3RyICsgY2hhciwgbiwgY2hhcik7XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG59XG5cbmZ1bmN0aW9uIHBhZExlZnQoc3RyLCBuLCBjaGFyKSB7XG4gICAgaWYgKGNoYXIgPT09IHVuZGVmaW5lZCB8fCBjaGFyID09PSAnJykge1xuICAgICAgICBjaGFyID0gJyAnO1xuICAgIH1cbiAgICBpZiAoc3RyLmxlbmd0aCA8IG4pIHtcbiAgICAgICAgcmV0dXJuIHBhZExlZnQoY2hhciArIHN0ciwgbiwgY2hhcik7XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG59XG5cbmZ1bmN0aW9uIGNyb3Aoc3RyLCBsZW5ndGgsIHN1YnN0KSB7XG4gICAgaWYgKHN0ci5sZW5ndGggPD0gbGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIHN1YnN0ID0gc3Vic3QgfHwgJy4uLic7XG4gICAgcmV0dXJuIHN0ci5zbGljZSgwLCBsZW5ndGggLSBzdWJzdC5sZW5ndGggKyAxKSArIHN1YnN0O1xufVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuZnVuY3Rpb24gcHJvcChrZXkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgcmV0dXJuIHhba2V5XTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBtYXgobGlzdCkge1xuICAgIHJldHVybiBNYXRoLm1heC5hcHBseShNYXRoLCBsaXN0KTtcbn1cblxuZnVuY3Rpb24gcmVwZWF0KHN0ciwgdGltZXMpIHtcbiAgICByZXR1cm4gbmV3IEFycmF5KHRpbWVzICsgMSkuam9pbihzdHIpO1xufVxuXG5mdW5jdGlvbiB1bmlxSWQocHJlZml4KSB7XG4gICAgcmV0dXJuIHByZWZpeCArIFN0cmluZyh1bmlxSWQuY291bnRlcisrKTtcbn1cbnVuaXFJZC5jb3VudGVyID0gMDtcbnVuaXFJZC5yZXNldCA9IGZ1bmN0aW9uIChjb3VudGVyKSB7IHVuaXFJZC5jb3VudGVyID0gY291bnRlciB9O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuZnVuY3Rpb24gY29uZmlndXJlKGNvbmZpZywgZGVmYXVsdHMpIHtcbiAgICBjb25maWcgPSBjb25maWcgfHwge307XG4gICAgZGVmYXVsdHMgPSBkZWZhdWx0cyB8fCB7fTtcblxuICAgIE9iamVjdC5rZXlzKGNvbmZpZykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGRlZmF1bHRzW2tleV0gPSBjb25maWdba2V5XTtcbiAgICB9KTtcblxuICAgIHJldHVybiBkZWZhdWx0cztcbn1cbiJdfQ==
