class ServerPacket {
    constructor(sequenceNumber, playerNumber, data) {
        this.sequenceNumber = sequenceNumber;
        this.playerNumber = playerNumber;
        this.data = data;
    }
}

module.exports = ServerPacket;
