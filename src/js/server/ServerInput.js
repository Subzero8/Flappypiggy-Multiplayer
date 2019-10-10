class ServerPacket {
    constructor(playerNumber, data) {
        this.playerNumber = playerNumber;
        this.data = data;
    }
}

module.exports = ServerPacket;
