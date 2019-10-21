const {PIG_HEIGHT} = require('./Constants');
const {PIPE_HEIGHT} = require('./Constants');
const {PIPE_WIDTH} = require('./Constants');
const {GAME_WIDTH} = require('./Constants');
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

    update(){
        this.x += this.vx;
    }

    copy(){
        let copy = new ServerPipe(this.number);
        copy.x = this.x;

        copy.gap = this.gap;
        copy.gapPosition = this.gapPosition;

        copy.topY = this.topY;
        copy.bottomY = this.bottomY;
        return copy;
    }
}

module.exports = ServerPipe;
