class Player {
    constructor(serverPlayer) {
        this.pig = new Pig(serverPlayer.pig);
        this.number = serverPlayer.number;
        this.sequenceNumber = serverPlayer.sequenceNumber;
    }

    copy() {
        return new Player(this);
    }
}
