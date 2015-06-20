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

//////////////////////////////////////////////////////////////////////////////

function prop(key) {
    return function (x) {
        return x[key];
    };
}

function max(list) {
    return Math.max.apply(Math, list);
}

//////////////////////////////////////////////////////////////////////////////

module.exports = {
    formatNumber: formatNumber,
    pad: pad,
    padLeft: padLeft,

    prop: prop,
    max: max
};
