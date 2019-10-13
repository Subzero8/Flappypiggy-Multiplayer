const {PIG_HEIGHT} = require('./Constants');
const {PIG_WIDTH} = require('./Constants');
const {GAME_HEIGHT} = require('./Constants');
const {GAME_WIDTH} = require('./Constants');

const {GRAVITY} = require('./Constants');
const {SERVER_TICK_DURATION} = require('./Constants');

class ServerPig {
    constructor() {
        this.height = PIG_HEIGHT;
        this.width = PIG_WIDTH;
        this.y = GAME_HEIGHT / 2;
        this.x = GAME_WIDTH * 0.2;
        this.vy = 0;
    }
    update(delta) {
        this.y += this.vy * delta;
        if (this.y >= GAME_HEIGHT) {
            this.y = GAME_HEIGHT
        }
        this.vy += GRAVITY * delta
    }
}

module.exports = ServerPig;
