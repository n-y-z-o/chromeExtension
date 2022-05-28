'use strict';

function initializeExtension() {

    // Send the public identifier whenever the private key changes.
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (!isUndefined(changes.privateKey)) {
            sendPublicIdentifierToPage();
        }
    });

    // Send an initial update of the public identifier.
    sendPublicIdentifierToPage();

    document.addEventListener('nyzo-transaction-generated', function(event) {

        // If the amount is not defined, set it to μ1.
        var micropayConfiguration = event.detail;
        if (isUndefined(micropayConfiguration.amountMicronyzos)) {
            micropayConfiguration = {
                clientUrl: micropayConfiguration.clientUrl,
                receiverId: micropayConfiguration.receiverId,
                tag: micropayConfiguration.tag,
                amountMicronyzos: 1
            };
        }

        sendTransaction(micropayConfiguration);
    });

    // Get the tip configuration, if present.
    var tipClientUrl = '';
    var tipReceiverId = '';
    var tipTag = '';
    var tipButtons = document.getElementsByClassName('nyzo-tip-button');
    for (var i = 0; i < tipButtons.length; i++) {
        var button = tipButtons[i];

        // Modify the classes to show that the extension was installed.
        button.classList.add('nyzo-extension-installed');
        button.classList.remove('nyzo-extension-not-installed');

        // If valid, store the client URL, receiver ID, and tag.
        tipClientUrl = button.dataset.clientUrl;
        tipReceiverId = button.dataset.receiverId;
        tipTag = cleanTag(button.dataset.tag);
    }
    var tipConfiguration = new MicropayConfiguration(tipClientUrl, tipReceiverId, tipTag, '', 0);

    // Get Micropay configurations, if present.
    var micropayConfigurations = [];
    var micropayButtons = document.getElementsByClassName('nyzo-micropay-button');
    for (var i = 0; i < micropayButtons.length; i++) {
        var button = micropayButtons[i];

        // Modify the classes to show that the extension was installed.
        button.classList.add('nyzo-extension-installed');
        button.classList.remove('nyzo-extension-not-installed');

        // If valid, store the client URL, receiver ID, and tag.
        const clientUrl = button.dataset.clientUrl;
        const receiverId = button.dataset.receiverId;
        const tag = cleanTag(button.dataset.tag);
        const displayName = cleanDisplayName(button.dataset.displayName);
        const amountMicronyzos = getAmountMicronyzos(button.dataset.amount);
        const configuration = new MicropayConfiguration(clientUrl, receiverId, tag, displayName, amountMicronyzos);
        if (isValidConfigurationForMicropay(configuration)) {
            micropayConfigurations.push(configuration);
        }
    }

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'getNyzoParameters') {
            sendResponse({tipConfiguration: tipConfiguration, micropayConfigurations: micropayConfigurations});
        } else if (request.action === 'micropayTransactionAvailable') {
            const uniqueReferenceKey = request.uniqueReferenceKey;
            const tag = request.tag;

            chrome.storage.local.get([uniqueReferenceKey, 'privateKey'], function(extensionConfiguration) {
                const privateKey = decode(extensionConfiguration.privateKey).getSeed();

                const transaction = extensionConfiguration[uniqueReferenceKey];
                const supplementalTransaction = createSupplementalTransaction(decode(transaction), privateKey);
                const detailObject = {transaction: transaction,
                    supplementalTransaction: nyzoStringFromTransaction(supplementalTransaction.getBytes(true)),
                    tag: tag};
                const event = new CustomEvent('micropayTransactionAvailable', { detail: detailObject });
                document.dispatchEvent(event);
            });
        }
    });
}

function sendTransaction(micropayConfiguration) {

    chrome.storage.local.get(['privateKey', 'maximumAutomaticAmount'], function(extensionConfiguration) {

        // Only continue if extension and micropay configuration parameters are correct. Also, ensure that the amount is
        // less than the maximum allowed for automatic transactions.
        const maximumAutomaticAmountMicronyzos = extensionConfiguration.maximumAutomaticAmount * micronyzosPerNyzo;
        if (isValidPrivateKey(extensionConfiguration.privateKey) &&
            isValidMaximumAutomaticAmount(extensionConfiguration.maximumAutomaticAmount) &&
            micropayConfiguration.amountMicronyzos <= maximumAutomaticAmountMicronyzos &&
            isValidClientUrl(micropayConfiguration.clientUrl) &&
            isValidPublicIdentifier(micropayConfiguration.receiverId) &&
            micropayConfiguration.tag != null && micropayConfiguration.tag.length > 0) {

            // Gather the information and submit the transaction.
            const timestamp = Date.now() + 10000;
            const privateKey = decode(extensionConfiguration.privateKey).getSeed();
            const receiverIdentifierArray = decode(micropayConfiguration.receiverId).getIdentifier();
            const amountMicronyzos = micropayConfiguration.amountMicronyzos;
            const senderData = stringAsUint8Array(micropayConfiguration.tag);
            const clientUrl = micropayConfiguration.clientUrl;
            submitTransaction(timestamp, privateKey, receiverIdentifierArray, amountMicronyzos, senderData, clientUrl,
                function(success, messages, warnings, errors, transaction) {

                    // Let the page know whether the transaction was accepted.
                    if (success) {
                        // Store the transaction in local storage.
                        const uniqueReferenceKey = uniqueReferenceKeyForMicropayConfiguration(micropayConfiguration);
                        const objectToStore = new Object();
                        objectToStore[uniqueReferenceKey] = transaction;
                        chrome.storage.local.set(objectToStore);

                        // Send an 'accepted' notification.
                        const detailObject = {
                            tag: micropayConfiguration.tag,
                            clientUrl: micropayConfiguration.clientUrl,
                            amountMicronyzos: micropayConfiguration.amountMicronyzos,
                            receiverId: micropayConfiguration.receiverId,
                            transaction: transaction
                        };
                        const event = new CustomEvent('nyzo-transaction-accepted', { detail: detailObject });
                        document.dispatchEvent(event);
                    } else {
                        // Send a 'failed' notification.
                        const event = new CustomEvent('nyzo-transaction-failed', { detail: micropayConfiguration });
                        document.dispatchEvent(event);
                    }
                }
            );
        } else {
            // Send a 'failed' notification.
            const event = new CustomEvent('nyzo-transaction-failed', { detail: micropayConfiguration });
            document.dispatchEvent(event);
        }
    });
}

function sendPublicIdentifierToPage() {
    chrome.storage.local.get(['privateKey'], function(extensionConfiguration) {
        let publicIdentifier = publicIdentifierForPrivateKey(extensionConfiguration.privateKey);
        const event = new CustomEvent('nyzo-public-identifier-configured', { detail: publicIdentifier });
        document.dispatchEvent(event);
    });
}

initializeExtension();
