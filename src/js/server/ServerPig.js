const {PIG_HEIGHT} = require('./Constants');
const {PIG_WIDTH} = require('./Constants');
const {GAME_HEIGHT} = require('./Constants');
const {GAME_WIDTH} = require('./Constants');

const {GRAVITY} = require('./Constants');
const {SERVER_TICKRATE} = require('./Constants');
const {FRAME_TIME} = require('./Constants');

class Pig {
    constructor() {
        this.height = PIG_HEIGHT
        this.width = PIG_WIDTH
        this.y = GAME_HEIGHT / 2;
        this.x = GAME_WIDTH * 0.2;
        this.vy = 0;
        this.vx = 0;

    }
    update(delta) {
        this.y += this.vy * delta / FRAME_TIME;
        if (this.y >= GAME_HEIGHT) {
            this.y = GAME_HEIGHT
        }
        this.vy += GRAVITY / SERVER_TICKRATE * delta / FRAME_TIME;
    }
}

module.exports = Pig
