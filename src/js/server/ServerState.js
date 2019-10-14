class ServerState {
    constructor(pipes, players, serverTime) {
        this.pipes = pipes;
        this.players = players;
        this.serverTime = serverTime;
    }
}

module.exports = ServerState;
