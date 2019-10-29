class Pig {

    constructor(pig) {
        this.height = PIG_HEIGHT;
        this.width = PIG_WIDTH;
        this.x = GAME_WIDTH * 0.2;

        this.y = pig.y;
        this.vy = pig.vy;
    }

    applyInput() {
        this.vy = PIG_SPEED;
    }

    update(step) {
        this.y += this.vy * step + (GRAVITY * step * step) / 2;
        // if (this.y + this.height >= GAME_HEIGHT) {
        //     this.y = GAME_HEIGHT - this.height;
        // }
        if (this.y <= 0) {
            this.y = 0;
        }
        if (this.vy + GRAVITY * step <= PIG_MAX_SPEED) {
            this.vy += GRAVITY * step;
        }
    }

    copy() {
        return new Pig(this);
    }
}
