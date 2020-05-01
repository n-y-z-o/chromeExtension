'use strict';

function hexStringAsUint8Array(identifier) {

    identifier = identifier.split('-').join('');

    var array = new Uint8Array(identifier.length / 2);
    for (var i = 0; i < array.length; i++) {
        array[i] = parseInt(identifier.substring(i * 2, i * 2 + 2), 16);
    }

    return array;
}

function sha256Uint8(array) {
    var ascii = '';
    for (var i = 0; i < array.length; i++) {
        ascii += String.fromCharCode(array[i]);
    }

    return hexStringAsUint8Array(sha256(ascii));
}

function doubleSha256(array) {

    return sha256Uint8(sha256Uint8(array));
}

function stringAsUint8Array(string) {

    var encodedString = unescape(encodeURIComponent(string));

    var array = new Uint8Array(encodedString.length);
    for (var i = 0; i < encodedString.length; i++) {
        array[i] = encodedString.charCodeAt(i);
    }

    return array;
}

function printAmount(amountMicronyzos) {
    return '&cap;' + (amountMicronyzos / 1000000).toFixed(6);
}
