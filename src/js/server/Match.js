const ServerPlayer = require('./ServerPlayer')
const PipeManager = require('./PipeManager');
const ClientManager = require('./ClientManager');
const gameloop = require('node-gameloop');

const {
    SERVER_TICKRATE
} = require('./Constants');
const {
    PIG_SPEED
} = require('./Constants');

const {
    WINDOW_HEIGHT
} = require('./Constants');


class Match {
    constructor(socket1, socket2) {
        console.log('[New Match] -> ' + socket1.id + ' vs ' + socket2.id);
        this.socket1 = socket1
        this.socket2 = socket2
        this.sockets = [socket1, socket2];
        this.player1 = new ServerPlayer(socket1)
        this.player2 = new ServerPlayer(socket2)
        this.players = [this.player1, this.player2]
        this.pipes = [];
        this.pipeCounter = 0;

        this.state = {
            pipes: this.pipes,
            players: this.players
        }
        this.sendNewMatchNotification()
        this.socket1.on('spacebar', () => {
            this.input(this.player1);
        })
        this.socket2.on('spacebar', () => {
            this.input(this.player2);
        })
        this.loop;
        this.currentTime;
        this.observers = [];
        this.running = false;
        this.ended = false;
    }
    notifyObservers(delta) {
        this.observers.forEach(observer => observer.notify(this.currentTime, delta))
    }

    sendNewMatchNotification() {
        this.socket1.emit('newMatch', this.state);
        this.socket2.emit('newMatch', this.state);
    }

    input(player) {
        if (!this.running) {

            this.socket1.emit('countdown', 3);
            this.socket2.emit('countdown', 3);
            setTimeout(() => {
                this.socket1.emit('countdown', 2);
                this.socket2.emit('countdown', 2);
            }, 1000)
            setTimeout(() => {
                this.socket1.emit('countdown', 1);
                this.socket2.emit('countdown', 1);
            }, 2000)
            setTimeout(() => {
                this.socket1.emit('countdown', 'Go !');
                this.socket2.emit('countdown', 'Go !');
                this.startLoop();
                this.players.forEach(p => p.pig.vy = PIG_SPEED);
            }, 3000)
        }
        player.pig.vy = PIG_SPEED;
    }

    startLoop() {
        this.addObserver(new PipeManager(this));
        this.addObserver(new ClientManager(this));
        this.running = true;
        this.loop = gameloop.setGameLoop(delta => {
            this.currentTime = Date.now();
            this.updateGame(delta);
        }, 1000 / SERVER_TICKRATE);
    }

    addObserver(observer) {
        this.observers.push(observer);
    }

    updateGame(delta) {
        this.notifyObservers(delta);
        this.updatePlayers(delta)
        this.updatePipes(delta)
        //this.checkCollision();
    }

    stopLoop() {
        gameloop.clearGameLoop(this.loop);
    }

    //updates pig positions
    updatePlayers(delta) {
        this.players.forEach(player => player.pig.update(delta))
    }

    checkCollision() {
        let p;
        this.players.forEach(player => {
            if (this.pigOutOfBounds(player) || this.checkCollisionPipes(player)) {
                p = player;
            }
        })
        if (p) {
            console.log('game over');
            this.sockets.find(s => s.id == p.id).emit('lost');
            this.sockets.find(s => s.id != p.id).emit('won');
            gameloop.clearGameLoop(this.loop);
        }
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
        }
        if (this.rectanglesIntersects(pigHitbox, pipe)) {
            return true;
        }
        return false;
    }

    rectanglesIntersects(pigHitbox, pipe) {
        //top
        if (pigHitbox.x + pigHitbox.width > pipe.x &&
            pigHitbox.x < pipe.x + pipe.width &&
            pigHitbox.y + pigHitbox.height > pipe.topY &&
            pigHitbox.y < pipe.topY + pipe.height) {
            console.log('top part');
            return true;
        }
        //bottom
        if (pigHitbox.x + pigHitbox.width > pipe.x &&
            pigHitbox.x < pipe.x + pipe.width &&
            pigHitbox.y + pigHitbox.height > pipe.bottomY &&
            pigHitbox.y < pipe.bottomY + pipe.height) {
            return true;
        }
    }

    pigOutOfBounds(player) {
        let pigHitbox = {
            x: player.pig.x + 0.3 * player.pig.width / 2,
            y: player.pig.y + 0.3 * player.pig.height / 2,
            width: 0.7 * player.pig.width,
            height: 0.7 * player.pig.height
        }
        return pigHitbox.y + pigHitbox.height > WINDOW_HEIGHT
    }





    updatePipes(delta) {
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            let pipe = this.pipes[i];
            pipe.update(delta);
            // if (pipe.x + pipe.width < 0) {
            //     this.pipes = this.pipes.filter(p => p.number!= pipe.number);
            // }
        }
    }

}

module.exports = Match
