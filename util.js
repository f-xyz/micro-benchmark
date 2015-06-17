function formatNumber(n) {
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

module.exports = {
    formatNumber: formatNumber,
    pad: pad,
    padLeft: padLeft
};
