const {PIG_HEIGHT} = require('./Constants');
const {PIPE_HEIGHT} = require('./Constants');
const {PIPE_WIDTH} = require('./Constants');
const {WINDOW_HEIGHT} = require('./Constants');
const {WINDOW_WIDTH} = require('./Constants');
const {FRAME_TIME} = require('./Constants');
const {GAP_SIZE} = require('./Constants');

class ServerPipe {
    constructor(pipeNumber) {
        this.vx = -10;
        this.x = WINDOW_WIDTH;
        this.width = PIPE_WIDTH;
        this.height = PIPE_HEIGHT;

        //Unique id
        this.number = pipeNumber;
        pipeNumber++;

        this.gap = GAP_SIZE + Math.random() * PIG_HEIGHT;
        this.gapPosition = PIPE_HEIGHT/5 + Math.random() * PIPE_HEIGHT*4/5;

        this.topY = this.gapPosition - PIPE_HEIGHT;
        this.bottomY = this.gapPosition + this.gap;
    }

    update(delta){
        let adjustedVelocity = this.vx * (delta / FRAME_TIME);
        this.x += adjustedVelocity;
    }
}

module.exports = ServerPipe
