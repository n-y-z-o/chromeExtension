'use strict';

document.addEventListener('DOMContentLoaded', function () {

    // Start by getting the configuration information for the extension.
    chrome.storage.local.get(null, function(items) {
        // If the configuration is valid, continue to get the payment information from the tab.
        if (configurationValid(items)) {
            // The configuration is correct, so the configure notice is not needed.
            document.getElementById('configure-notice').style.display = 'none';

            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.sendMessage(tab.id, {action: 'getNyzoParameters'}, function(response) {
                    var clientUrl = '';
                    var receiverId = '';
                    if (!chrome.runtime.lastError) {
                        clientUrl = response.clientUrl;
                        receiverId = response.receiverId;
                    }

                    // If the payment information is correct, configure the tip buttons.
                    if (isValidClientUrl(clientUrl) && isValidPublicIdentifier(receiverId)) {
                        document.getElementById('page-no-tips-notice').style.display = 'none';

                        var tipAmountMicronyzos = getTipAmountMicronyzos(items['baseTip']);
                        const multipliers = [1, 2, 5];
                        multipliers.forEach(function (multiplier) {
                            var button = document.getElementById('send-tip-' + multiplier + 'x');
                            button.addEventListener('click', function() { sendTip(multiplier) });
                            button.innerHTML = 'send ' + printAmount(tipAmountMicronyzos * multiplier);
                        });

                        document.getElementById('client-url').innerHTML = 'client URL: ' + (clientUrl.length > 60 ?
                            clientUrl.substring(0, 60) + '...' : clientUrl);
                        document.getElementById('receiver-id').innerHTML = 'receiver ID: ' + receiverId;
                    } else {
                        document.getElementById('send-tip-container').style.display = 'none';
                    }
                });
            });
        } else {
            // The configuration is not valid, so the containers for sending tips and display that the page does not
            // accept tips are not needed.
            document.getElementById('send-tip-container').style.display = 'none';
            document.getElementById('page-no-tips-notice').style.display = 'none';
            document.getElementById('configure-notice').addEventListener('click', openOptionsPage);
        }
    });
});

function sendTip(multiplier) {
    // The tip buttons are already displayed, so all information should be correct. However, all parameters should still
    // be checked.
    chrome.storage.local.get(null, function(items) {
        // If the configuration is valid, continue to get the payment information from the tab.
        if (configurationValid(items)) {
            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.sendMessage(tab.id, {action: 'getNyzoParameters'}, function(response) {
                    var clientUrl = '';
                    var receiverId = '';
                    var tag = '';
                    if (!chrome.runtime.lastError) {
                        clientUrl = response.clientUrl;
                        receiverId = response.receiverId;
                        tag = response.tag;
                    }

                    // If the payment information is correct, send the tip.
                    if (isValidClientUrl(clientUrl) && isValidPublicIdentifier(receiverId)) {
                        // Hide the tip container and show the result container.
                        document.getElementById('send-tip-container').style.display = 'none';
                        document.getElementById('result-container').style.display = 'inherit';

                        var tipAmountMicronyzos = getTipAmountMicronyzos(items['baseTip']) * multiplier;

                        var timestamp = Date.now() + 10000;
                        var privateKey = decode(items['privateKey']).getSeed();
                        var previousHashHeight = 0;
                        var previousBlockHash = hexStringAsUint8Array('bc4cca2a2a50a229-256ae3f5b2b5cd49-' +
                            'aa1df1e2d0192726-c4bb41cdcea15364');
                        var receiverIdentifierArray = decode(receiverId).getIdentifier();
                        var senderData = 'tip from Nyzo extension';
                        if (tag.length > 0) {
                            senderData += ': ' + tag;
                            senderData = senderData.substring(0, 32);
                        }
                        submitTransaction(timestamp, privateKey, previousHashHeight, previousBlockHash,
                            receiverIdentifierArray, tipAmountMicronyzos, stringAsUint8Array(senderData), clientUrl,
                            function(success, messages, warnings, errors) {
                                // Change the icon in case of failure and adjust to full opacity.
                                var resultIcon = document.getElementById('result-icon');
                                if (!success) {
                                    resultIcon.src = 'images/result-fail-256.png';
                                }
                                resultIcon.style.opacity = 1.0;

                                var errorString = stringForArray(errors);
                                if (errorString.length > 0) {
                                    document.getElementById('result-errors').innerHTML = errorString;
                                    document.getElementById('result-errors').style.display = 'inherit';
                                }

                                var warningString = stringForArray(warnings);
                                if (warningString.length > 0) {
                                    document.getElementById('result-warnings').innerHTML = errorString;
                                    document.getElementById('result-warnings').style.display = 'inherit';
                                }

                                var messageString = stringForArray(messages);
                                if (messageString.length > 0) {
                                    document.getElementById('result-messages').innerHTML = messageString;
                                } else {
                                    document.getElementById('result-messages').style.display = 'none';
                                }
                            });
                    }
                });
            });
        }
    });
}

function stringForArray(array) {
    var result = '';
    if (typeof array === 'object' && array.length > 0) {
        var separator = '';
        array.forEach(function(value) {
            if (typeof value === 'string') {
                result += separator + value;
                separator = '<br>';
            }
        });
    }

    return result.trim();
}

function configurationValid(items) {

    // Get the key and base tip from the configuration.
    var key = items['privateKey'];
    var baseTip = items['baseTip'];

    return isValidPrivateKey(key) && isValidTipAmount(baseTip);
}

function openOptionsPage() {
    var optionsUrl = chrome.extension.getURL('options.html');
    chrome.tabs.query({url: optionsUrl}, function(tabs) {
        if (tabs.length) {
            chrome.tabs.update(tabs[0].id, {active: true});
        } else {
            chrome.tabs.create({url: optionsUrl});
        }
    });
    window.close();
}
