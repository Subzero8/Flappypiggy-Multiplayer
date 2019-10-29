class State {
    constructor(state) {
        this.pipes = [];
        for (let i = 0; i < state.pipes.length; i++) {
            this.pipes.push(new Pipe(state.pipes[i]))
        }
        this.players = [];
        for (let i = 0; i < state.players.length; i++) {
            this.players.push(new Player(state.players[i]))
        }
        this.step = state.step;
    }

    copy() {
        return new State(this);
    }

    updatePhysics(step) {
        this.updatePlayers(step);
        this.updatePipes(step);
        this.step += step;
    }

    updatePlayers(step) {
        this.players.forEach(player => player.pig.update(step))
    }

    updatePipes(step) {
        this.pipes.forEach(pipe => pipe.update(step))
    }


    checkCollisionPipes(player) {
        for (let i = 0; i < this.pipes.length; i++) {
            if (this.checkCollisionPipe(player.pig, this.pipes[i])) {
                return true;
            }
        }
        return false;
    }

    checkCollisionPipe(pig, pipe) {
        let pigHitbox = {
            x: pig.x + 0.3 * pig.width / 2,
            y: pig.y + 0.3 * pig.height / 2,
            width: 0.7 * pig.width,
            height: 0.7 * pig.height
        };
        return this.rectanglesIntersects(pigHitbox, pipe)
    }

    rectanglesIntersects(pigHitbox, pipe) {
        //top

        if (pigHitbox.x + pigHitbox.width > pipe.x &&
            pigHitbox.x < pipe.x + pipe.width &&
            pigHitbox.y + pigHitbox.height > pipe.topY &&
            pigHitbox.y < pipe.topY + pipe.height) {
            return true;
        }
        //bottom
        return pigHitbox.x + pigHitbox.width > pipe.x &&
            pigHitbox.x < pipe.x + pipe.width &&
            pigHitbox.y + pigHitbox.height > pipe.bottomY &&
            pigHitbox.y < pipe.bottomY + pipe.height;

    }

    pigOutOfBounds(player) {
        let pigHitbox = {
            x: player.pig.x + 0.3 * player.pig.width / 2,
            y: player.pig.y + 0.3 * player.pig.height / 2,
            width: 0.7 * player.pig.width,
            height: 0.7 * player.pig.height
        };
        return pigHitbox.y + pigHitbox.height >= GAME_HEIGHT
    }
}
