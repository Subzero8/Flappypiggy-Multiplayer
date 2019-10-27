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

    applyInput() {
        this.vy = PIG_SPEED;
    }

    updatePig() {
        this.y += this.vy + GRAVITY / 2;
        if (this.y + this.height >= GAME_HEIGHT) {
            this.y = GAME_HEIGHT - this.height
        }
        if (this.y <= 0) {
            this.y = 0;
        }
        if (this.vy + GRAVITY <= PIG_MAX_SPEED) {
            this.vy += GRAVITY;
        }
    }

    copy() {
        let copy = new ServerPig();
        copy.y = this.y;
        copy.vy = this.vy;
        return copy;
    }
}

module.exports = ServerPig;
