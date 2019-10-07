const ServerPlayer = require('./ServerPlayer')
const PipeManager = require('./PipeManager');
const ClientManager = require('./ClientManager');
const ServerPacket = require('./ServerInput');

const gameloop = require('node-gameloop');

const {
    SERVER_TICKRATE
} = require('./Constants');
const {
    PIG_SPEED
} = require('./Constants');

const {
    GAME_HEIGHT
} = require('./Constants');


class ServerMatch {
    constructor(sockets) {
        //Players
        this.players = []
        this.sockets = []
        for (var i = 0; i < sockets.length; i++) {
            let player = new ServerPlayer(i);
            this.players.push(player)
            this.sockets[player.number] = sockets[player.number]
            this.getSocket(player.number).emit('playerNumber', player.number);
        }
        console.log('[New Match] -> ' + this.sockets.length + ' players.');

        this.pipes = [];
        this.pipeCounter = 0;
        this.serverStep = 0;// for dead reckoning
        this.state = {
            pipes: this.pipes,
            players: this.players,
            serverStep: this.serverStep
        }
        //Inputs
        this.packets = []
        this.players.forEach(player => {
            this.getSocket(player.number).on('packet', packet => {
                this.packets.push(new ServerPacket(player.number, packet.data));
            })
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

    getSocket(number) {
        return this.sockets[number];
    }

    notifyObservers(delta) {
        this.observers.forEach(observer => observer.notify(this.currentTime, delta))
    }

    sendNewMatchNotification() {
        this.players.forEach(player => {
            this.getSocket(player.number).emit('newMatch', this.state);
        })
    }

    startCountdown() {
        this.countdownStarted = true;
        this.players.forEach(player => {
            this.getSocket(player.number).emit('countdown', 3);
        })
        setTimeout(() => {
            this.players.forEach(player => {
                this.getSocket(player.number).emit('countdown', 2);
            })
        }, 1000)
        setTimeout(() => {
            this.players.forEach(player => {
                this.getSocket(player.number).emit('countdown', 1);
            })
        }, 2000)
        setTimeout(() => {
            this.players.forEach(player => {
                this.getSocket(player.number).emit('countdown', 0);
            })
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
        if (!this.countdownStarted && this.packets.length > 0) {
            this.startCountdown();
        } else {
            this.packets.forEach(packet => {
                let player = this.getPlayer(packet.playerNumber);
                packet.data.forEach(d => {
                    switch (d) {
                        case 'spacebar':
                            player.pig.vy = PIG_SPEED;
                            break;
                        default:

                    }
                })
            })
            this.packets = [];
        }
    }
    getPlayer(number) {
        return this.players.find(player => player.number == number);
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
        return pigHitbox.y + pigHitbox.height > GAME_HEIGHT
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
