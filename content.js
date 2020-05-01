function initializeExtension() {
    // Process all tip buttons.
    var clientUrl = '';
    var receiverId = '';
    var tag = '';
    var buttons = document.getElementsByClassName('nyzo-tip-button');
    for (var i = 0; i < buttons.length; i++) {
        var button = buttons[i];

        // Modify the classes to show that the extension was installed.
        button.classList.add('nyzo-extension-installed');
        button.classList.remove('nyzo-extension-not-installed');

        // If valid, store the client URL, receiver ID, and tag.
        clientUrl = button.dataset.clientUrl;
        receiverId = button.dataset.receiverId;
        tag = cleanTag(button.dataset.tag);
    }

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        sendResponse({clientUrl: clientUrl, receiverId: receiverId, tag: tag});
    });
}

initializeExtension();
