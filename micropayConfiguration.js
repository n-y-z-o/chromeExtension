class MicropayConfiguration {
    constructor(clientUrl, receiverId, tag, displayName, amountMicronyzos) {
        this.clientUrl = clientUrl;
        this.receiverId = receiverId;
        this.tag = tag;
        this.displayName = displayName;
        this.amountMicronyzos = amountMicronyzos;
    }
}

function isValidConfigurationForTips(configuration) {
    return configuration != null &&
        isValidClientUrl(configuration.clientUrl) &&
        isValidPublicIdentifier(configuration.receiverId) &&
        configuration.amountMicronyzos === 0;
}

function isValidConfigurationForMicropay(configuration) {
    return isValidClientUrl(configuration.clientUrl) &&
            isValidPublicIdentifier(configuration.receiverId) &&
            configuration.amountMicronyzos > 0;
}

function uniqueReferenceKeyForMicropayConfiguration(configuration) {
    // The receiver ID and tag uniquely identify a Micropay resource. The amount can change over time, and a new amount
    // should not automatically invalidate a previous transaction, especially if the new amount is less than the
    // previous amount.
    return configuration.receiverId + ':' + configuration.tag;
}
