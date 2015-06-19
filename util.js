function formatNumber(n) {
    if (typeof n != 'number') return n;

    switch (true) {
        case n < 1:
            return n.toFixed(2);
        case n < 1000:
            return n.toFixed(0);
        default:
            return n.toExponential(2);
    }
}

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

//////////////////////////////////////////////////////////////////////////////

function identity(x) {
    return x;
}

function prop(key) {
    return function (x) {
        return x[key];
    };
}

function getColumn(collection, key) {
    return collection.map(prop(key));
}

function max(list) {
    return Math.max.apply(Math, list);
}

function compose(f, g) {
    return function (x) {
        return f(g(x));
    };
}

function getColumnMaxLength(collection, key) {
    var column = getColumn(collection, key);
    return max(column.map(prop('length')));
}

//////////////////////////////////////////////////////////////////////////////

module.exports = {
    formatNumber: formatNumber,
    pad: pad,
    padLeft: padLeft,

    identity: identity,
    prop: prop,
    getColumn: getColumn,
    max: max,
    compose: compose,
};
