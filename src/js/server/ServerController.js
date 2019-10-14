const ServerClient = require('./ServerClient');
const PipeLoopObserver = require('./PipeLoopObserver');
const ServerState = require('./ServerState');

const {SERVER_TICK_DURATION} = require("./Constants");

const {CLIENT_TICK_DURATION} = require('./Constants');

const {PIG_SPEED} = require('./Constants');

const {GAME_HEIGHT} = require('./Constants');


class ServerController {
    constructor(sockets) {
        //Players
        this.players = [];
        this.sockets = [];
        for (let i = 0; i < sockets.length; i++) {
            let player = new ServerClient(i);
            this.players.push(player);
            this.sockets[player.number] = sockets[player.number];
            this.getSocket(player.number).emit('localPlayerNumber', player.number);
        }
        console.log('[New Match] -> ' + this.sockets.length + ' players.');

        this.pipes = [];
        this.pipeCounter = 0;

        this.serverStep = 0;
        this.state = new ServerState(this.pipes, this.players, this.serverStep);

        //Inputs
        this.packets = [];
        this.players.forEach(player => {
            this.getSocket(player.number).on('packet', packet => {
                this.packets.push(packet);
            });
            this.getSocket(player.number).on('ready', () => {
                if (!this.countdownStarted) {
                    this.startCountdown();
                }
            });
        });
        this.observers = [];
        this.matchStarted = false;
        this.countdownStarted = false;
        this.sendNewMatchNotification();
        this.startLoop();

        this.previousUpdateClientLoopTick = Date.now();

        this.previousPhysics = 0;
        this.lagPhysics = 0;

    }

    getSocket(number) {
        return this.sockets[number];
    }

    notifyObservers(delta) {
        this.currentTime = Date.now();
        this.observers.forEach(observer => observer.notify(this.currentTime, delta))
    }

    sendNewMatchNotification() {

        this.players.forEach(player => {
            this.getSocket(player.number).emit('newMatch', {
                state: this.state,
                sent: Date.now()
            });
        });
    }

    startCountdown() {
        this.countdownStarted = true;
        this.players.forEach(player => {
            this.getSocket(player.number).emit('countdown', 3);
        });
        setTimeout(() => {
            this.players.forEach(player => {
                this.getSocket(player.number).emit('countdown', 2);
            })
        }, 1000);
        setTimeout(() => {
            this.players.forEach(player => {
                this.getSocket(player.number).emit('countdown', 1);
            })
        }, 2000);
        setTimeout(() => {
            this.players.forEach(player => {
                this.getSocket(player.number).emit('countdown', 0);
            });
            this.matchStarted = true;
        }, 3000);
        setTimeout(() => {
            this.players.forEach(player => {
                this.getSocket(player.number).emit('countdown', -1);
            })
        }, 4000)
    }

    startLoop() {
        this.addObserver(new PipeLoopObserver(this));
        //this.addObserver(new ClientUpdateLoopObserver(this));
        this.updateClientLoop();
        this.physicsLoop();
    }

    sendUpdates() {
        this.sockets.forEach(socket => {
            socket.emit('updateState', {
                state: this.state,
                sent: Date.now()
            });
        });
    }

    updateClientLoop() {
        let now = Date.now();
        if (this.previousUpdateClientLoopTick + CLIENT_TICK_DURATION <= now) {
            this.previousUpdateClientLoopTick = now;
            this.sendUpdates();
        }
        if (Date.now() - this.previousUpdateClientLoopTick < CLIENT_TICK_DURATION - 16) {
            setTimeout(() => this.updateClientLoop());
        } else {
            setImmediate(() => this.updateClientLoop());
        }
    }

    physicsLoop() {
        setImmediate(this.physicsLoop.bind(this));
        let now = Date.now();
        let delta = now - this.previousPhysics;
        if (delta > 1000) {
            delta = SERVER_TICK_DURATION;
        }
        this.lagPhysics += delta;
        if (this.lagPhysics >= SERVER_TICK_DURATION) {
            if (this.matchStarted) {
                this.updatePhysics();
                this.handleInputs();
                this.notifyObservers(delta);
            }
            this.lagPhysics -= SERVER_TICK_DURATION;
        }
        this.previousPhysics = now;
    }

    addObserver(observer) {
        this.observers.push(observer);
    }

    updatePhysics() {
        this.updatePlayers();
        this.updatePipes();
        //this.checkCollision();
        this.state.serverStep++;
    }

    handleInputs() {
        this.packets.forEach(packet => {
            let player = this.getPlayer(packet.id);
            console.log(packet);
            packet.data.forEach(() => player.pig.vy = PIG_SPEED);
        });
        this.packets = [];
    }

    getPlayer(number) {
        return this.players.find(player => player.number === number);
    }

    stopLoop() {
        clearInterval(this.updateClientLoop);
        //gameloop.clearGameLoop(this.loop);
    }

    //updates pig positions
    updatePlayers(delta) {
        this.players.forEach(player => player.pig.update(delta))
    }

    checkCollision() {
        let loser;
        this.players.forEach(player => {
            if (this.pigOutOfBounds(player) || this.checkCollisionPipes(player)) {
                loser = player;
            }
        });
        if (loser) {
            console.log('game over');
            loser.socket.emit('lost');
            this.player.socket.find(player => player.socket.id !== loser.socket.id).emit('won');
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
        };
        return pigHitbox.y + pigHitbox.height > GAME_HEIGHT
    }


    updatePipes() {
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            let pipe = this.pipes[i];
            pipe.update();
            if (pipe.x + pipe.width < 0) {
                this.pipes.shift();
            }
        }
    }

}

module.exports = ServerController;
