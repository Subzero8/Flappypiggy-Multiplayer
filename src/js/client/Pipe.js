class Pipe {
    constructor(serverPipe) {
        this.vx = PIPE_SPEED;
        this.width = PIPE_WIDTH;
        this.height = PIPE_HEIGHT;

        //Unique id
        this.number = serverPipe.number;

        this.gap = serverPipe.gap;
        this.gapPosition = serverPipe.gapPosition;

        this.topY = serverPipe.topY;
        this.bottomY = serverPipe.bottomY;

        this.x = serverPipe.x;
    }

    update(step) {
        this.x += this.vx * step;
    }

    copy() {
        return new Pipe(this)
    }
}
