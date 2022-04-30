'use strict';

function initializeExtension() {

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

initializeExtension();
