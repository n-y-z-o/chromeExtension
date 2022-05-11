'use strict';

const maximumMicropayConfigurations = 4;

document.addEventListener('DOMContentLoaded', function () {

    // Hide the body to prevent visual weirdness due to nested callbacks. Set a timeout so the body does not fail to
    // display in case of errors.
    document.body.style.display = 'none';
    setTimeout(function() { document.body.style.display = 'block'; }, 100);

    // Start by getting the configuration information for the extension.
    chrome.storage.local.get(extensionConfigurationParameters, function(extensionConfiguration) {

        // If the configuration is valid, continue to get the payment information from the tab.
        if (isValidExtensionConfiguration(extensionConfiguration)) {
            // The configuration is correct, so the configure button is not needed.
            document.getElementById('configure-button').style.display = 'none';

            chrome.tabs.query({active: true, lastFocusedWindow: true }, function(tabs) {
                if (isUndefined(tabs) || tabs.length == 0) {
                    document.getElementById('page-notice').innerHTML = 'Unable to communicate with the page. ' +
                        'Please reload.';

                    for (var i = 0; i < maximumMicropayConfigurations; i++) {
                        document.getElementById('micropay-container-' + i).style.display = 'none';
                        document.getElementById('divider-' + i).style.display = 'none';
                    }
                    document.getElementById('tip-container').style.display = 'none';

                } else {
                    chrome.tabs.sendMessage(tabs[0].id, {action: 'getNyzoParameters'}, function(pageConfiguration) {

                        // Configure the Micropay buttons.
                        var micropayButtonsActive = false;
                        var micropayConfigurations = isUndefined(pageConfiguration) ? [] :
                            pageConfiguration.micropayConfigurations;
                        for (var i = 0; i < maximumMicropayConfigurations; i++) {
                            var configuration = micropayConfigurations[i];
                            if (i < micropayConfigurations.length) {
                                var button = document.getElementById('micropay-button-' + i);
                                button.micropayConfiguration = configuration;
                                button.index = i;
                                configureMicropayButton(button);
                            } else {
                                document.getElementById('micropay-container-' + i).style.display = 'none';
                                document.getElementById('divider-' + i).style.display = 'none';
                            }
                        }

                        // If the tip information is provided, configure the tip buttons.
                        var tipConfiguration = isUndefined(pageConfiguration) ? null :
                            pageConfiguration.tipConfiguration;
                        if (isValidConfigurationForTips(tipConfiguration)) {

                            var baseTipMicronyzos = getAmountMicronyzos(extensionConfiguration.baseTip);
                            const multipliers = [1, 2, 5];
                            multipliers.forEach(function (multiplier) {
                                // Add the event listener to the button and store the payment configuration.
                                var button = document.getElementById('send-tip-' + multiplier + 'x');
                                button.addEventListener('click', function() { sendTransaction(this) });
                                button.micropayConfiguration = new MicropayConfiguration(tipConfiguration.clientUrl,
                                    tipConfiguration.receiverId, tipConfiguration.tag, tipConfiguration.displayName,
                                    baseTipMicronyzos * multiplier);

                                // Set the button text.
                                button.innerHTML = printAmount(button.micropayConfiguration.amountMicronyzos);

                                // Assign the notice div and hide.
                                button.noticeDiv = document.getElementById('tip-notice');
                                button.noticeDiv.style.display = 'none';
                            });
                        } else {
                            document.getElementById('tip-container').style.display = 'none';
                            if (micropayConfigurations.length > 0) {
                                document.getElementById('divider-' +
                                    (micropayConfigurations.length - 1)).style.display = 'none';
                            }
                        }

                        if (isValidConfigurationForTips(tipConfiguration) || micropayConfigurations.length > 0) {
                            document.getElementById('page-notice').style.display = 'none';
                        } else if (chrome.runtime.lastError) {
                            document.getElementById('page-notice').innerHTML = 'Unable to communicate with the page. ' +
                                'Please reload.';
                        }

                        document.body.style.display = 'block';
                    });
                }
            });
        } else {
            // The configuration is not valid, so the containers for sending tips and Micropay are not needed.
            document.getElementById('tip-container').style.display = 'none';
            for (var i = 0; i < 4; i++) {
                document.getElementById('micropay-container-' + i).style.display = 'none';
                document.getElementById('divider-' + i).style.display = 'none';
            }
            document.getElementById('page-notice').style.display = 'none';
            document.getElementById('configure-button').addEventListener('click', openOptionsPage);

            // Show the body.
            document.body.style.display = 'block';
        }
    });
});

function configureMicropayButton(button) {
    // Set the label.
    const configuration = button.micropayConfiguration;
    document.getElementById('micropay-label-' + button.index).innerHTML =
        'Micropay: <span style="font-style: italic;">' + configuration.displayName + '</span>';

    // Add the event listener to the button.
    button.addEventListener('click', function() { sendTransaction(this) });

    const uniqueReferenceKey = uniqueReferenceKeyForMicropayConfiguration(configuration);
    chrome.storage.local.get([uniqueReferenceKey, 'maximumMicropayAmount'], function(extensionConfiguration) {
        const transaction = isUndefined(extensionConfiguration[uniqueReferenceKey]) ? null :
            extensionConfiguration[uniqueReferenceKey];

        // Set the button text. If a transaction is present, hide the button. If the amount exceeds the maximum micropay
        // amount, style the button and add a message.
        if (transaction !== null) {
            button.style.display = 'none';
        } else {
            button.parentElement.style.display = 'block';
            button.style.display = 'inline-block';
            if (configuration.amountMicronyzos <= extensionConfiguration.maximumMicropayAmount * micronyzosPerNyzo) {
                button.style.alpha = 1.0;
                button.innerHTML = printAmount(configuration.amountMicronyzos);
                button.classList.remove('notice-error');
            } else {
                button.style.alpha = 0.4;
                button.innerHTML = printAmount(configuration.amountMicronyzos) + ' (>max)';
                button.classList.add('notice-error');
            }
        }

        // Assign the notice div. If no transaction, hide the div. Otherwise, display information in the div.
        button.noticeDiv = document.getElementById('micropay-notice-' + button.index);
        if (transaction === null) {
            button.noticeDiv.style.display = 'none';
        } else {
            button.noticeDiv.style.display = 'inherit';
            button.noticeDiv.innerHTML = 'Already purchased';
            button.noticeDiv.classList.add('notice-success');
            button.noticeDiv.classList.remove('notice-warning');
            button.noticeDiv.classList.remove('notice-error');
        }

        // Assign the refresh and clear buttons. Hide if no transaction.
        button.refreshButton = document.getElementById('micropay-refresh-' + button.index);
        button.refreshButton.addEventListener('click', function() { resendTransaction(this) });
        button.refreshButton.micropayConfiguration = configuration;
        button.clearButton = document.getElementById('micropay-clear-' + button.index);
        button.clearButton.addEventListener('click', function() { clearTransaction(this) });
        button.clearButton.parentButton = button;
        if (transaction === null) {
            button.refreshButton.style.display = 'none';
            button.clearButton.style.display = 'none';
        }
    });
}

function sendTransaction(button) {
    // The tip buttons are already displayed, so all information should be correct. However, all parameters should still
    // be checked.
    chrome.storage.local.get(extensionConfigurationParameters, function(extensionConfiguration) {
        // If the configurations are valid, continue. This would previously fetch information from the tab. Now, it
        // takes information directly from the buttons to eliminate possible manipulation by the page changing its
        // information after popup loading.
        var micropayConfiguration = button.micropayConfiguration;
        if (isValidExtensionConfiguration(extensionConfiguration) &&
            isValidConfigurationForMicropay(micropayConfiguration) &&
            micropayConfiguration.amountMicronyzos <= extensionConfiguration.maximumMicropayAmount * 1000000) {

            // Display the notice div.
            var notice = button.noticeDiv;
            notice.style.display = 'inherit';
            notice.innerHTML = "Sending...";

            // Display the refresh and clear buttons.
            if (!isUndefined(button.refreshButton)) {
                button.refreshButton.style.display = 'inline-block';
            }
            if (!isUndefined(button.clearButton)) {
                button.clearButton.style.display = 'inline-block';
            }

            // Hide the button.
            button.parentElement.style.display = 'none';

            // Gather the information and submit the transaction.
            var timestamp = Date.now() + 10000;
            var privateKey = decode(extensionConfiguration.privateKey).getSeed();
            var receiverIdentifierArray = decode(micropayConfiguration.receiverId).getIdentifier();
            var amountMicronyzos = micropayConfiguration.amountMicronyzos;
            var senderData = micropayConfiguration.tag;
            var clientUrl = micropayConfiguration.clientUrl;
            submitTransaction(timestamp, privateKey, receiverIdentifierArray, amountMicronyzos,
                stringAsUint8Array(senderData), clientUrl,
                function(success, messages, warnings, errors, transaction) {

                    // Style the notice div.
                    var warningString = stringForArray(warnings);
                    if (!success) {
                        notice.classList.remove('notice-success');
                        notice.classList.remove('notice-warning');
                        notice.classList.add('notice-error');
                    } else if (warningString.length > 0) {
                        notice.classList.remove('notice-success');
                        notice.classList.add('notice-warning');
                        notice.classList.remove('notice-error');
                    } else {
                        notice.classList.add('notice-success');
                        notice.classList.remove('notice-warning');
                        notice.classList.remove('notice-error');
                    }

                    var errorString = stringForArray(errors);
                    var messageString = stringForArray(messages);
                    if (errorString.length > 0) {
                        notice.innerHTML = errorString;
                    } else if (warningString.length > 0) {
                        notice.innerHTML = warningString;
                    } else if (messageString.length > 0) {
                        notice.innerHTML = messageString;
                    }

                    // If successful, store the transaction and send a message to the tab.
                    chrome.tabs.query({active: true, lastFocusedWindow: true }, function(tabs) {
                        // Store the transaction in local storage.
                        var uniqueReferenceKey = uniqueReferenceKeyForMicropayConfiguration(micropayConfiguration);
                        var objectToStore = new Object();
                        objectToStore[uniqueReferenceKey] = transaction;
                        chrome.storage.local.set(objectToStore);

                        // Notify the content script that the transaction is available.
                        chrome.tabs.sendMessage(tabs[0].id, {action: 'micropayTransactionAvailable',
                            uniqueReferenceKey: uniqueReferenceKey, tag: micropayConfiguration.tag}, null);
                    });
                }
            );
        }
    });
}

function resendTransaction(button) {
    var micropayConfiguration = button.micropayConfiguration;
    if (isValidConfigurationForMicropay(micropayConfiguration)) {

        // Send a message to the tab.
        chrome.tabs.query({active: true, lastFocusedWindow: true }, function(tabs) {
            // Store the transaction in local storage.
            var uniqueReferenceKey = uniqueReferenceKeyForMicropayConfiguration(micropayConfiguration);

            // Notify the content script that the transaction is available.
            chrome.tabs.sendMessage(tabs[0].id, {action: 'micropayTransactionAvailable',
                uniqueReferenceKey: uniqueReferenceKey, tag: micropayConfiguration.tag}, null);
        });
    }
}

function clearTransaction(button) {
    var micropayConfiguration = button.parentButton.micropayConfiguration;
    if (isValidConfigurationForMicropay(micropayConfiguration)) {
        var uniqueReferenceKey = uniqueReferenceKeyForMicropayConfiguration(micropayConfiguration);
        chrome.storage.local.remove(uniqueReferenceKey, function() {
            configureMicropayButton(button.parentButton);
        });
    }
}

function stringForArray(array) {
    var result = '';
    if (typeof array === 'object' && array.length > 0) {
        var separator = '';
        array.forEach(function(value) {
            if (typeof value === 'string') {
                result += separator + value.replace('<', '').replace('>', '');
                separator = '<br>';
            }
        });
    }

    return result.trim();
}

function isValidExtensionConfiguration(extensionConfiguration) {
    // Verify the private key, tip amount, maximum Micropay amount, and maximum automatic amount.
    return isValidPrivateKey(extensionConfiguration.privateKey) && isValidTipAmount(extensionConfiguration.baseTip) &&
        isValidMaximumMicropayAmount(extensionConfiguration.maximumMicropayAmount) &&
        isValidMaximumAutomaticAmount(extensionConfiguration.maximumAutomaticAmount);
}

function openOptionsPage() {
    var optionsUrl = chrome.runtime.getURL('options.html');
    chrome.tabs.query({url: optionsUrl}, function(tabs) {
        if (tabs.length) {
            chrome.tabs.update(tabs[0].id, {active: true});
        } else {
            chrome.tabs.create({url: optionsUrl});
        }
    });
    window.close();
}
