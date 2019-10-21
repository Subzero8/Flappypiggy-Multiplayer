class ServerState {
    constructor(pipes, players, step) {
        this.pipes = pipes;
        this.players = players;
        this.step = step;
    }
    copy(){
        let pipes = [];
        for (let i = 0; i < this.pipes.length; i++) {
            pipes.push(this.pipes[i].copy())
        }
        let players = [];
        for (let i = 0; i < this.players.length; i++) {
            players.push(this.players[i].copy())
        }
        let step = this.step;
        return new ServerState(pipes, players, step);
    }
}

module.exports = ServerState;
