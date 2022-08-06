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

function senderDataAsUint8Array(senderData) {

    // Process normalized sender-data strings.
    let array = null;
    if (senderData.length == 67) {
        let lowercase = senderData.toLowerCase();
        if (lowercase[0] == 'x' && lowercase[1] == '(' && lowercase[66] == ')') {
            // Get the underscore index to determine the length of the data.
            let underscoreIndex = lowercase.indexOf('_');
            if (underscoreIndex < 0) {
                underscoreIndex = maximumSenderDataLength * 2 + 2;
            }
            let dataLength = underscoreIndex / 2 - 1;

            // Ensure that all characters in the data field are correct. The left section must be all alphanumeric, and
            // the right section must be underscores. The string was converted to lowercase.
            let allAreCorrect = true;
            for (let i = 2; i < 66 && allAreCorrect; i++) {
                // This could be written more succinctly, but it would be more difficult to read.
                if (i < underscoreIndex) {
                    allAreCorrect = (lowercase[i] >= '0' && lowercase[i] <= '9') ||
                        (lowercase[i] >= 'a' && lowercase[i] <= 'f');
                } else {
                    allAreCorrect = lowercase[i] == '_';
                }
            }

            // If all characters are correct, decode the data. Otherwise, leave the result null to indicate that the
            // input is not a valid sender-data string.
            if (allAreCorrect) {
                array = hexStringAsUint8Array(senderData.substring(2, 2 + dataLength * 2));
            }
        }
    }

    // If processing of a normalized sender-data string did not produce a result, process as a plain-text string.
    if (array == null) {
        array = new Uint8Array(Math.min(senderData.length, 32));
        for (var i = 0; i < array.length; i++) {
            array[i] = senderData.charCodeAt(i);
        }
    }

    return array;
}

function printAmount(amountMicronyzos) {
    return '&cap;' + (amountMicronyzos / 1000000).toFixed(6);
}
