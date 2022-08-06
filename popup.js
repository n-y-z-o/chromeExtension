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

                    // Hide the micropay containers, the automatic container, and the tip container.
                    for (var i = 0; i < maximumMicropayConfigurations; i++) {
                        document.getElementById('micropay-container-' + i).style.display = 'none';
                        document.getElementById('divider-' + i).style.display = 'none';
                    }
                    document.getElementById('automatic-container').style.display = 'none';
                    document.getElementById('divider-' + maximumMicropayConfigurations).style.display = 'none';
                    document.getElementById('tip-container').style.display = 'none';

                } else {
                    chrome.tabs.sendMessage(tabs[0].id, {action: 'getNyzoParameters'}, function(pageConfiguration) {

                        // Configure the Micropay buttons.
                        let micropayConfigurations = isUndefined(pageConfiguration) ? [] :
                            pageConfiguration.micropayConfigurations;
                        for (let i = 0; i < maximumMicropayConfigurations; i++) {
                            let configuration = micropayConfigurations[i];
                            if (i < micropayConfigurations.length) {
                                let button = document.getElementById('micropay-button-' + i);
                                button.micropayConfiguration = configuration;
                                button.index = i;
                                configureMicropayButton(button);
                            } else {
                                document.getElementById('micropay-container-' + i).style.display = 'none';
                                document.getElementById('divider-' + i).style.display = 'none';
                            }
                        }

                        // If an automatic authorization is provided, configure the section.
                        let automaticConfiguration = isUndefined(pageConfiguration) ? null :
                            pageConfiguration.automaticConfiguration;
                        if (isValidAutomaticConfiguration(automaticConfiguration)) {
                            configureAutomaticSection(automaticConfiguration);
                        } else {
                            document.getElementById('automatic-container').style.display = 'none';
                            document.getElementById('divider-4').style.display = 'none';
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
                                if (!button.listenerAdded) {
                                    button.addEventListener('click', function() { sendTransaction(this) });
                                    button.listenerAdded = true;
                                }
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

                            // The tip container is the last container on the page. When it is not displayed, the last
                            // visible divider should be hidden.
                            let lastVisibleDivider = null;
                            for (let i = 0; i < 5; i++) {
                                let divider = document.getElementById('divider-' + i);
                                if (divider.style.display != 'none') {
                                    lastVisibleDivider = divider;
                                }
                            }
                            if (lastVisibleDivider != null) {
                                lastVisibleDivider.style.display = 'none';
                            }
                        }

                        if (isValidConfigurationForTips(tipConfiguration) || micropayConfigurations.length > 0 ||
                            isValidAutomaticConfiguration(automaticConfiguration)) {
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
            // The configuration is not valid, none of the Micropay elements are needed.
            document.getElementById('tip-container').style.display = 'none';
            document.getElementById('automatic-container').style.display = 'none';
            for (var i = 0; i < 4; i++) {
                document.getElementById('micropay-container-' + i).style.display = 'none';
                document.getElementById('divider-' + i).style.display = 'none';
            }
            document.getElementById('divider-4').style.display = 'none';
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
    if (!button.listenerAdded) {
        button.addEventListener('click', function() { sendTransaction(this) });
        button.listenerAdded = true;
    }

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
        if (!button.refreshButton.listenerAdded) {
            button.refreshButton.addEventListener('click', function() { resendTransaction(this) });
            button.refreshButton.listenerAdded = true;
        }
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

function configureAutomaticSection(configuration) {
    // Check the authorization amount. If the current authorization is below the minimum amount, display the
    // authorization button.
    const key = 'authorizedAutomaticAmount_' + configuration.receiverId;
    chrome.storage.local.get([key, 'maximumAutomaticAuthorization'], function(result) {
        let currentAmount = Number.parseFloat(result[key]);
        if (!(currentAmount > 0.0)) {  // handles both NaN and negative numbers
            currentAmount = 0.0;
        }

        const automaticButton = document.getElementById('automatic-button');
        const minimumAmount = configuration.minimumAmount * micronyzosPerNyzo;
        if (currentAmount < minimumAmount) {
            // When the current authorization is less than the minimum required, additional authorization should be
            // requested. Limit the recommended amount by the maximum automatic authorization..
            const requestAmount = Math.min(configuration.recommendedAmount, result.maximumAutomaticAuthorization) *
                micronyzosPerNyzo;

            if (requestAmount < minimumAmount) {
                // If the request amount is less than the minimum, display a notice.
                automaticButton.style.display = 'none';
                document.getElementById('automatic-notice').innerHTML = 'Your configured maximum automatic ' +
                    'authorization of ' + printAmount(result.maximumAutomaticAuthorization * micronyzosPerNyzo) +
                    ' is less than this page\'s minimum authorization of ' + printAmount(minimumAmount) +
                    '. Please increase your maximum automatic authorization if you wish to use this page.';
            } else {
                // Otherwise, configure the authorization button.
                automaticButton.dataset.requestAmount = requestAmount;
                automaticButton.dataset.receiverId = configuration.receiverId;
                automaticButton.innerHTML = 'Click to authorize ' + printAmount(requestAmount) +
                    ' in automatic transactions to account <span class="public-identifier">' +
                    configuration.receiverId + '</span>';
                automaticButton.addEventListener('click', function() { automaticButtonClicked(this) });

                // The notice is unnecessary when the button is displayed.
                document.getElementById('automatic-notice').style.display = 'none';
            }
        } else {
            // When the current authorization is at or above the minimum, display a message showing the amount.
            automaticButton.style.display = 'none';
            document.getElementById('automatic-notice').innerHTML = 'The current Micropay authorization of ' +
                printAmount(currentAmount) + ' to account <span class="public-identifier">' +
                configuration.receiverId + '</span> is sufficient for this page';
        }
    });
}

function automaticButtonClicked(button) {
    chrome.storage.local.get('maximumAutomaticAuthorization', function(result) {
        // Apply another check to ensure the authorization amount does not exceed the maximum. This is redundant but
        // prudent.
        const authorizationAmount = Math.min(result.maximumAutomaticAuthorization * micronyzosPerNyzo,
            button.dataset.requestAmount);

        if (isValidPublicIdentifier(button.dataset.receiverId)) {
            // If the receiver identifier is valid, store the new authorization.
            const key = 'authorizedAutomaticAmount_' + button.dataset.receiverId;
            chrome.storage.local.set({[key]: authorizationAmount});

            // Hide the button and display a success message in the notice div.
            button.style.display = 'none';
            const automaticNotice = document.getElementById('automatic-notice');
            automaticNotice.innerHTML = 'Authorized ' + printAmount(authorizationAmount) +
                ' in automatic transactions to account <span class="public-identifier">' + button.dataset.receiverId +
                '</span>';
            automaticNotice.style.display = 'block';
        } else {
            // Otherwise, display an error.
            button.style.display = 'none';
            automaticNotice.innerHTML = 'An unexpected error occurred';
            automaticNotice.style.display = 'block';
        }
    });
}

function sendTransaction(button) {
    // The buttons are already displayed, so all information should be correct. However, all parameters should still be
    // checked.
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
                senderDataAsUint8Array(senderData), clientUrl,
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

                    // Store the transaction in local storage.
                    var uniqueReferenceKey = uniqueReferenceKeyForMicropayConfiguration(micropayConfiguration);
                    var objectToStore = new Object();
                    objectToStore[uniqueReferenceKey] = transaction;
                    chrome.storage.local.set(objectToStore);

                    // Send the transaction to the tab.
                    chrome.tabs.query({active: true, lastFocusedWindow: true }, function(tabs) {
                        if (tabs.length > 0) {
                            chrome.tabs.sendMessage(tabs[0].id, {action: 'micropayTransactionAvailable',
                                uniqueReferenceKey: uniqueReferenceKey, tag: micropayConfiguration.tag}, null);
                        }
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
            if (tabs.length > 0) {
                // Get the reference key for the transaction.
                var uniqueReferenceKey = uniqueReferenceKeyForMicropayConfiguration(micropayConfiguration);

                // Notify the content script that the transaction is available.
                chrome.tabs.sendMessage(tabs[0].id, {action: 'micropayTransactionAvailable',
                    uniqueReferenceKey: uniqueReferenceKey, tag: micropayConfiguration.tag}, null);
            }
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

function isValidAutomaticConfiguration(automaticConfiguration) {
    // This function only indicates whether the automatic configuration is valid in isolation. It does not indicate
    // whether the automatic configuration is compatible with the current extension settings.
    return automaticConfiguration != null && isValidPublicIdentifier(automaticConfiguration.receiverId) &&
        automaticConfiguration.minimumAmount > 0 &&
        automaticConfiguration.recommendedAmount >= automaticConfiguration.minimumAmount;
}

function isValidExtensionConfiguration(extensionConfiguration) {
    // Verify the private key, tip amount, maximum Micropay amount, maximum automatic amount, and maximum automatic
    // authorization amount.
    return isValidPrivateKey(extensionConfiguration.privateKey) && isValidTipAmount(extensionConfiguration.baseTip) &&
        isValidMaximumMicropayAmount(extensionConfiguration.maximumMicropayAmount) &&
        isValidMaximumAutomaticAmount(extensionConfiguration.maximumAutomaticAmount) &&
        isValidMaximumAutomaticAuthorization(extensionConfiguration.maximumAutomaticAuthorization);
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
