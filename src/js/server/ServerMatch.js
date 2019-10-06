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


class ServerMatch {
    constructor(socket1, socket2) {
        //Players
        this.player1 = new ServerPlayer(socket1)
        this.player2 = new ServerPlayer(socket2)
        this.players = [this.player1, this.player2]
        this.sockets = [socket1, socket2]
        this.sockets[socket1.id] = socket1
        this.sockets[socket2.id] = socket2
        console.log('[New Match] -> ' + this.player1.id + ' vs ' + this.player2.id);

        this.pipes = [];
        this.pipeCounter = 0;

        this.state = {
            pipes: this.pipes,
            players: this.players
        }
        //Inputs
        this.inputs = []
        this.getSocket(this.player1.id).on('input', input => {
            this.inputs.push({
                player: this.player1,
                input: input
            });
        })
        this.getSocket(this.player2.id).on('input', input => {
            this.inputs.push({
                player: this.player2,
                input: input
            });
        })
        this.loop;
        this.currentTime;
        this.observers = [];

        this.running = false;
        this.matchStarted = false;
        this.countdownStarted = false;
        this.sendNewMatchNotification()
        this.startLoop()

        // this.ended = false;
    }

    getSocket(id) {
        return this.sockets.find(socket => socket.id == id);
    }

    notifyObservers(delta) {
        this.observers.forEach(observer => observer.notify(this.currentTime, delta))
    }

    sendNewMatchNotification() {
        this.getSocket(this.player1.id).emit('newMatch', this.state);
        this.getSocket(this.player2.id).emit('newMatch', this.state);
    }

    startCountdown() {
        this.countdownStarted = true;
        this.getSocket(this.player1.id).emit('countdown', 3);
        this.getSocket(this.player2.id).emit('countdown', 3);
        setTimeout(() => {
            this.getSocket(this.player1.id).emit('countdown', 2);
            this.getSocket(this.player2.id).emit('countdown', 2);
        }, 1000)
        setTimeout(() => {
            this.getSocket(this.player1.id).emit('countdown', 1);
            this.getSocket(this.player2.id).emit('countdown', 1);
        }, 2000)
        setTimeout(() => {
            this.getSocket(this.player1.id).emit('countdown', 'Go !');
            this.getSocket(this.player2.id).emit('countdown', 'Go !');
            this.players.forEach(player => player.pig.vy = PIG_SPEED);
            this.matchStarted = true;
        }, 3000)
    }

    startLoop() {
        this.addObserver(new PipeManager(this));
        this.addObserver(new ClientManager(this));

        this.running = true;
        this.loop = gameloop.setGameLoop(delta => {
            this.currentTime = Date.now();
            if (this.running) {
                if (this.matchStarted) {
                    this.updateGame(delta);
                }
                this.handleInputs();
                this.notifyObservers(delta);
            }

        }, 1000 / SERVER_TICKRATE);
    }

    addObserver(observer) {
        this.observers.push(observer);
    }

    updateGame(delta) {
        this.updatePlayers(delta)
        this.updatePipes(delta)
        //this.checkCollision();
    }

    handleInputs() {
        if (!this.countdownStarted && this.inputs.length > 0) {
            this.startCountdown();
        } else {
            this.inputs.forEach(input => {
                let player = this.getPlayer(input.player.id);
                console.log(player.id, input.input);
                player.pig.vy = PIG_SPEED

            })
            this.inputs = [];
        }
    }
    getPlayer(id) {
        return this.players.find(player => player.id == id);
    }

    stopLoop() {
        gameloop.clearGameLoop(this.loop);
    }

    //updates pig positions
    updatePlayers(delta) {
        this.players.forEach(player => player.update(delta))
    }

    checkCollision() {
        let loser;
        this.players.forEach(player => {
            if (this.pigOutOfBounds(player) || this.checkCollisionPipes(player)) {
                loser = player;
            }
        })
        if (loser) {
            console.log('game over');
            loser.socket.emit('lost');
            this.player.socket.find(player => player.socket.id != loser.socket.id).emit('won');
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
            if (pipe.x + pipe.width < 0) {
                this.pipes.shift();
            }
        }
    }

}

module.exports = ServerMatch
