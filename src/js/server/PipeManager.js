const ServerPipe = require('./ServerPipe');
const PIPE_DISTANCE = require('./Constants').PIPE_DISTANCE
const WINDOW_WIDTH = require('./constants').WINDOW_WIDTH;

class PipeManager {
    constructor(match) {
        this.match = match;
        this.pipes = this.match.pipes;
        this.lastPipe;
    }

    notify(currentTime, delta) {
        this.addPipe(delta);

    }
    addPipe(delta) {
        if (this.distanceLastPipe() >= PIPE_DISTANCE) {
            let pipe = new ServerPipe(this.match.pipeCounter);
            this.match.pipeCounter++;
            this.pipes.push(pipe);
            this.lastPipe = pipe;
        }

    }
    distanceLastPipe() {
        if (this.lastPipe) {
            return WINDOW_WIDTH - this.lastPipe.x;
        }
        return WINDOW_WIDTH;
    }


}

module.exports = PipeManager;
