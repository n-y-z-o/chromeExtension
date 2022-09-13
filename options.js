document.addEventListener('DOMContentLoaded', function () {
    // Register the listener for the private key.
    var privateKeyField = document.getElementById('privateKey');
    privateKeyField.addEventListener('input', validateAndStorePrivateKey);

    // Register the listener for the base tip.
    var baseTipField = document.getElementById('baseTip');
    baseTipField.addEventListener('input', validateAndStoreBaseTip);

    // Register the listener for the maximum Micropay amount.
    var maximumMicropayAmountField = document.getElementById('maximumMicropayAmount');
    maximumMicropayAmountField.addEventListener('input', validateAndStoreMaximumMicropayAmount);

    // Register the listener for the maximum automatic amount.
    var maximumAutomaticAmountField = document.getElementById('maximumAutomaticAmount');
    maximumAutomaticAmountField.addEventListener('input', validateAndStoreMaximumAutomaticAmount);

    // Register the listener for the maximum automatic authorization.
    var maximumAutomaticAuthorizationField = document.getElementById('maximumAutomaticAuthorization');
    maximumAutomaticAuthorizationField.addEventListener('input', validateAndStoreMaximumAutomaticAuthorization);

    // Load the values.
    chrome.storage.local.get(extensionConfigurationParameters, function(items) {
        var privateKey = items.privateKey;
        if (typeof privateKey === 'string' && privateKey.length > 0) {
            privateKeyField.value = privateKey;
        } else {
            privateKeyField.value = 'key_';
        }

        var baseTip = items.baseTip;
        if (baseTip != null) {
            baseTipField.value = baseTip;
        }

        var maximumMicropayAmount = items.maximumMicropayAmount;
        if (maximumMicropayAmount != null) {
            maximumMicropayAmountField.value = maximumMicropayAmount;
        }

        var maximumAutomaticAmount = items.maximumAutomaticAmount;
        if (maximumAutomaticAmount != null) {
            maximumAutomaticAmountField.value = maximumAutomaticAmount;
        }

        var maximumAutomaticAuthorization = items.maximumAutomaticAuthorization;
        if (maximumAutomaticAuthorization != null) {
            maximumAutomaticAuthorizationField.value = maximumAutomaticAuthorization;
        }

        validateAndStorePrivateKey();
        validateAndStoreBaseTip();
        validateAndStoreMaximumMicropayAmount();
        validateAndStoreMaximumAutomaticAmount();
        validateAndStoreMaximumAutomaticAuthorization();
    });
});

function loadValue(field, name, defaultValue) {
    chrome.storage.local.get(name, function(valueObject) {
        var value = valueObject[name];
        if (typeof value === 'string' && value.length) {
            field.value = value;
        } else {
            field.value = defaultValue;
        }
    });
}

function validateAndStorePrivateKey() {
    var privateKeyField = document.getElementById('privateKey');
    var privateKeyValue = privateKeyField.value.trim();
    if (isValidPrivateKey(privateKeyValue)) {
        privateKeyField.className = 'input input-valid';
    } else {
        privateKeyField.className = 'input input-invalid';
    }
    chrome.storage.local.set({privateKey: privateKeyValue});
}

function validateAndStoreBaseTip() {
    var baseTipField = document.getElementById('baseTip');
    var baseTipValue = baseTipField.value;
    if (isValidTipAmount(baseTipValue)) {
        baseTipField.className = 'input input-valid';
    } else {
        baseTipField.className = 'input input-invalid';
    }
    chrome.storage.local.set({baseTip: baseTipValue});
}

function validateAndStoreMaximumMicropayAmount() {
    var maximumMicropayAmountField = document.getElementById('maximumMicropayAmount');
    var maximumMicropayAmountValue = maximumMicropayAmountField.value;
    if (isValidMaximumMicropayAmount(maximumMicropayAmountValue)) {
        maximumMicropayAmountField.className = 'input input-valid';
    } else {
        maximumMicropayAmountField.className = 'input input-invalid';
    }
    chrome.storage.local.set({maximumMicropayAmount: maximumMicropayAmountValue});
}

function validateAndStoreMaximumAutomaticAmount() {
    var maximumAutomaticAmountField = document.getElementById('maximumAutomaticAmount');
    var maximumAutomaticAmountValue = maximumAutomaticAmountField.value;
    if (isValidMaximumAutomaticAmount(maximumAutomaticAmountValue)) {
        maximumAutomaticAmountField.className = 'input input-valid';
    } else {
        maximumAutomaticAmountField.className = 'input input-invalid';
    }
    chrome.storage.local.set({maximumAutomaticAmount: maximumAutomaticAmountValue});
}

function validateAndStoreMaximumAutomaticAuthorization() {
    var maximumAutomaticAuthorizationField = document.getElementById('maximumAutomaticAuthorization');
    var maximumAutomaticAuthorizationValue = maximumAutomaticAuthorizationField.value;
    if (isValidMaximumAutomaticAuthorization(maximumAutomaticAuthorizationValue)) {
        maximumAutomaticAuthorizationField.className = 'input input-valid';
    } else {
        maximumAutomaticAuthorizationField.className = 'input input-invalid';
    }
    chrome.storage.local.set({maximumAutomaticAuthorization: maximumAutomaticAuthorizationValue});
}
