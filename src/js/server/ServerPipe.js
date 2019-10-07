const {PIG_HEIGHT} = require('./Constants');
const {PIPE_HEIGHT} = require('./Constants');
const {PIPE_WIDTH} = require('./Constants');
const {GAME_HEIGHT} = require('./Constants');
const {GAME_WIDTH} = require('./Constants');
const {SERVER_TICK_DURATION} = require('./Constants');
const {SERVER_TICKRATE} = require('./Constants');
const {GAP_SIZE} = require('./Constants');
const {PIPE_SPEED} = require('./Constants');

class ServerPipe {
    constructor(pipeNumber) {
        this.vx = PIPE_SPEED;
        this.x = GAME_WIDTH;
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
        let adjustedVelocity = this.vx * (delta / SERVER_TICK_DURATION) / SERVER_TICKRATE;
        this.x += adjustedVelocity;
    }
}

module.exports = ServerPipe
