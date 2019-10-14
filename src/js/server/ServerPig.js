const {PIG_HEIGHT} = require('./Constants');
const {PIG_WIDTH} = require('./Constants');
const {GAME_HEIGHT} = require('./Constants');
const {GAME_WIDTH} = require('./Constants');

const {GRAVITY} = require('./Constants');
const {PIG_MAX_SPEED} = require('./Constants');
const {PIG_SPEED} = require('./Constants');


class ServerPig {

    constructor() {
        this.height = PIG_HEIGHT;
        this.width = PIG_WIDTH;
        this.y = GAME_HEIGHT / 2;
        this.x = GAME_WIDTH * 0.2;
        this.vy = PIG_SPEED;
    }

    update() {
        this.y += this.vy;
        if (this.y >= GAME_HEIGHT) {
            this.y = GAME_HEIGHT
        }
        if ((this.vy + GRAVITY) < PIG_MAX_SPEED){
            this.vy += GRAVITY;
        }
    }
}

module.exports = ServerPig;
