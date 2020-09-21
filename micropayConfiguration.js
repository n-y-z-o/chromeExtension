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
