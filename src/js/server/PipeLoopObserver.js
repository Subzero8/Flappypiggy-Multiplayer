const ServerPipe = require('./ServerPipe');
const PIPE_DISTANCE = require('./Constants').PIPE_DISTANCE
const GAME_WIDTH = require('./Constants').GAME_WIDTH;

class PipeLoopObserver {
    constructor(match) {
        this.match = match;
        this.lastPipe = null;
    }

    notify(currentTime, delta) {
        if (this.distanceLastPipe() >= PIPE_DISTANCE) {
            this.addPipe(delta);
        }

    }
    addPipe(delta) {
        let pipe = new ServerPipe(this.match.pipeCounter);
        this.match.pipeCounter++;
        this.match.pipes.push(pipe);
        this.lastPipe = pipe;

    }
    distanceLastPipe() {
        if (this.lastPipe) {
            return GAME_WIDTH - this.lastPipe.x;
        }
        return GAME_WIDTH;
    }


}

module.exports = PipeLoopObserver;
