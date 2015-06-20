function formatNumber(n) {
    if (typeof n != 'number') return n;

    switch (true) {
        case n === 0:
            return '0';
        case n < 1:
            return n.toFixed(2);
        case n < 1000:
            return n.toFixed(0);
        default:
            return n.toExponential(1)
                .replace(/e\+/, ' x 10^');
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

function repeat(str, times) {
    return new Array(times + 1).join(str);
}

var uniqIdCounter = 0;

function uniqId(prefix) {
    return prefix + String(uniqIdCounter++);
}

//////////////////////////////////////////////////////////////////////////////

module.exports = {
    // number
    formatNumber: formatNumber,
    // string
    pad: pad,
    padLeft: padLeft,
    // functional
    prop: prop,
    max: max,
    repeat: repeat,
    uniqId: uniqId
};
