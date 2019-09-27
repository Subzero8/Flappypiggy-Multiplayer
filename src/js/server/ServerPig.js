const {PIG_HEIGHT} = require('./Constants');
const {PIG_WIDTH} = require('./Constants');
const {WINDOW_HEIGHT} = require('./Constants');
const {WINDOW_WIDTH} = require('./Constants');

const {GRAVITY} = require('./Constants');
const {SERVER_TICKRATE} = require('./Constants');
const {FRAME_TIME} = require('./Constants');

class Pig {
    constructor() {
        this.height = PIG_HEIGHT
        this.width = PIG_WIDTH
        this.y = WINDOW_HEIGHT / 2;
        this.x = WINDOW_WIDTH * 0.2;
        this.vy = 0;
        this.vx = 0;

    }
    update(delta) {
        this.y += this.vy * delta / FRAME_TIME;
        if (this.y >= WINDOW_HEIGHT) {
            this.y = WINDOW_HEIGHT
        }
        this.vy += GRAVITY / SERVER_TICKRATE * delta / FRAME_TIME;
    }
}

module.exports = Pig
