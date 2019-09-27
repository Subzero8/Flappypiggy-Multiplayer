const {PIG_HEIGHT} = require('./constants');
const {PIG_WIDTH} = require('./constants');
const {WINDOW_HEIGHT} = require('./constants');
const {WINDOW_WIDTH} = require('./constants');

const {GRAVITY} = require('./constants');
const {SERVER_TICKRATE} = require('./constants');
const {FRAME_TIME} = require('./constants');

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
