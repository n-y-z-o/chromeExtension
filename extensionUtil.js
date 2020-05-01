function isValidPrivateKey(keyString) {
    var valid = false;
    if (typeof keyString === 'string') {
        keyString = keyString.trim();
        var key = decode(keyString);
        valid = key != null && typeof key.getSeed() !== 'undefined';
    }

    return valid;
}

function isValidPublicIdentifier(identifierString) {
    var valid = false;
    if (typeof identifierString === 'string') {
        identifierString = identifierString.trim();
        var identifier = decode(identifierString);
        valid = identifier != null && typeof identifier.getIdentifier() !== 'undefined';
    }

    return valid;
}

function getTipAmountMicronyzos(tipString) {
    return Math.floor(+tipString * 1000000);
}

function isValidTipAmount(tipString) {
    var tipAmountMicronyzos = getTipAmountMicronyzos(tipString);
    return tipAmountMicronyzos >= 2 && tipAmountMicronyzos <= 100 * 1000000;
}

function isValidClientUrl(clientUrl) {
    // This is not a robust check for valid/invalid URLs. It is just a check to ensure that the provided URL is somewhat
    // reasonable for use as a client URL.
    var valid = false;
    if (typeof clientUrl === 'string') {
        clientUrl = clientUrl.trim();
        valid = (clientUrl.startsWith('http://') || clientUrl.startsWith('https://')) && !clientUrl.includes('<') &&
            !clientUrl.includes('>') && !clientUrl.includes('?') && !clientUrl.includes(' ') &&
            !clientUrl.includes('%');
    }

    return valid;
}

function sanitizeString(string) {
    if (typeof string === 'string') {
        string = string.replace(/[<>]/g, '');
    } else {
        string = '';
    }

    return string;
}

function cleanTag(tag) {
    if (typeof tag !== 'string') {
        tag = '';
    }
    return tag.replace(/[^\w_]/g, '');
}

function submitTransaction(timestamp, senderPrivateSeed, previousHashHeight, previousBlockHash, receiverIdentifier,
    micronyzosToSend, senderData, endpoint, callback) {

    // Create and sign the transaction.
    var transaction = new Transaction();
    transaction.setTimestamp(timestamp);
    transaction.setAmount(micronyzosToSend);
    transaction.setRecipientIdentifier(receiverIdentifier);
    transaction.setPreviousHashHeight(previousHashHeight);
    transaction.setPreviousBlockHash(previousBlockHash);
    transaction.setSenderData(senderData);
    transaction.sign(senderPrivateSeed);

    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function() {
        if (this.readyState == 4) {  // 4 == "DONE"
            var result = JSON.parse(this.responseText);
            var success = false;
            var messages = null;
            var warnings = null;
            var errors = null;
            if (typeof result === 'object') {
                // Store the warnings and errors.
                if (typeof result.errors === 'object') {
                    errors = result.errors;
                }
                if (typeof result.notices === 'object') {
                    warnings = result.notices;
                }

                // If the transaction was forwarded, indicate success.
                if (this.status === 200 && typeof result.result === 'object' && typeof result.result[0] == 'object') {
                    var resultFields = result.result[0];
                    if (resultFields.forwarded === true && typeof resultFields.blockHeight === 'number') {
                        success = true;
                        messages = ['The transaction was forwarded to the cycle for incorporation into block ' +
                            resultFields.blockHeight + '.'];
                    }
                }
            }

            // Ensure some feedback is provided.
            if (messages === null && warnings === null && errors === null) {
                errors = ['The tip failed to send.'];
            }
            if (messages === null) {
                messages = [];
            }
            if (warnings === null) {
                warnings = [];
            }

            callback(success, messages, warnings, errors);
        }
    };

    var transactionString = nyzoStringFromTransaction(transaction.getBytes(true));
    var fullUrl = endpoint + '?transaction=' + transactionString;
    httpRequest.open('GET', fullUrl, true);
    httpRequest.send();
}
