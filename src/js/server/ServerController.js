const ServerClient = require('./ServerClient');
const PipeLoopObserver = require('./PipeLoopObserver');
const ServerState = require('./ServerState');

const {PHYSICS_TICK_DURATION} = require("./Constants");

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
            this.getSocket(player.number).emit('packet', {
                action: 'id',
                id: player.number
            });

        }

        this.pipes = [];
        this.pipeCounter = 0;

        this.serverStep = 0;
        this.state = new ServerState(this.pipes, this.players, this.serverStep);

        //Inputs
        this.packets = [];

        this.observers = [];
        this.running = false;
        this.loopRunning = false;
        this.countdownStarted = false;

        this.previousPhysics = 0;
        this.lagPhysics = 0;

        this.lagUpdate = 0;
        this.previousUpdate = 0;
        this.inputBuffer = new Map();

        this.initializeNetworking();
        this.sendNewMatchNotification();

        this.stateHistory = new Map();

        this.startLoop();
    }

    initializeNetworking() {
        this.players.forEach(player => {
            let socket = this.getSocket(player.number);
            socket.on('packet', packet => {
                switch (packet.action) {
                    case "input":
                        this.packets.push(packet);
                        console.log('[RECEIVED] ->', this.state.step);
                        break;
                    case "ready":
                        if (!this.countdownStarted) {
                            this.startCountdown();
                        }
                        break;
                    case 'ping':
                        socket.emit('packet', {
                            action: 'pong'
                        });
                        break;
                }
            });
        });
    }

    getSocket(number) {
        return this.sockets[number];
    }

    notifyObservers(delta) {
        this.currentTime = Date.now();
        this.observers.forEach(observer => observer.notify(this.currentTime, delta))
    }

    sendNewMatchNotification() {
        console.log('[New Match] -> ' + this.sockets.length + ' players.');
        this.players.forEach(player => {
            this.getSocket(player.number).emit('packet', {
                action: 'newGame',
                state: this.state
            });
        });
    }

    startCountdown() {
        this.countdownStarted = true;
        this.players.forEach(player => {
            this.getSocket(player.number).emit('packet', {
                action: 'countdown',
                count: 3
            });
        });
        setTimeout(() => {
            this.players.forEach(player => {
                this.getSocket(player.number).emit('packet', {
                    action: 'countdown',
                    count: 2
                });
            })
        }, 1000);
        setTimeout(() => {
            this.players.forEach(player => {
                this.getSocket(player.number).emit('packet', {
                    action: 'countdown',
                    count: 1
                });
            })
        }, 2000);
        setTimeout(() => {
            this.players.forEach(player => {
                this.getSocket(player.number).emit('packet', {
                    action: 'countdown',
                    count: 0
                });
                this.running = true;
            });
        }, 3000);
        setTimeout(() => {
            this.players.forEach(player => {
                this.getSocket(player.number).emit('packet', {
                    action: 'countdown',
                    count: -1
                });
            })
        }, 4000)
    }

    startLoop() {
        this.addObserver(new PipeLoopObserver(this));
        //this.addObserver(new ClientUpdateLoopObserver(this));

        this.loopRunning = true;
        this.updateClientLoop();
        this.physicsLoop();
    }

    sendUpdates() {
        console.log('[SERVER STEP] ->', this.state.step, '(', Date.now(), ')');

        this.sockets.forEach(socket => {
            socket.emit('packet', {
                action: 'serverUpdate',
                state: this.state,
                sent: Date.now()
            });
        });
    }

    updateClientLoop() {
        if (this.loopRunning) {
            setImmediate(this.updateClientLoop.bind(this));
        }
        let now = Date.now();
        let delta = now - this.previousUpdate;
        if (delta > 1000) {
            delta = CLIENT_TICK_DURATION;
        }
        this.lagUpdate += delta;
        if (this.lagUpdate >= CLIENT_TICK_DURATION) {
            if (this.running) {
                this.sendUpdates();
            }
            this.lagUpdate -= CLIENT_TICK_DURATION;
        }
        this.previousUpdate = now;
    }

    physicsLoop() {
        if (this.loopRunning) {
            setImmediate(this.physicsLoop.bind(this));
        }
        let now = Date.now();
        let delta = now - this.previousPhysics;
        if (delta > 1000) {
            delta = PHYSICS_TICK_DURATION;
        }
        this.lagPhysics += delta;
        if (this.lagPhysics >= PHYSICS_TICK_DURATION) {
            if (this.running) {
                this.handleInputs();
                this.updatePhysics(this.state);
                this.notifyObservers(delta);
                this.stateHistory.set(this.state.step, this.state.copy());
            }
            this.lagPhysics -= PHYSICS_TICK_DURATION;
        }
        this.previousPhysics = now;
    }

    addObserver(observer) {
        this.observers.push(observer);
    }

    updatePhysics(state) {
        this.updatePlayers(state);
        this.updatePipes(state);
        state.step++;
        //this.checkCollision();
    }

    handleInputs() {
        this.packets.forEach(packet => {
            console.log('[INPUT APPLIED] ->', this.state.step);
            let deltaStep = this.state.step - packet.step;
            console.log('[REWINDING] ->', deltaStep, 'steps');

            let oldState = this.state.copy();
            if (deltaStep > 0) {
                oldState = this.stateHistory.get(packet.step).copy();
            }
            let player = oldState.players.find(player => player.number === packet.id);
            player.pig.applyInput();

            for (let i = 0; i < deltaStep; i++) {
                player.pig.updatePig();
            }
            let updatedPlayer = this.state.players.find(player => player.number === packet.id);
            updatedPlayer.pig = player.pig;
            updatedPlayer.sequenceNumber = packet.sequenceNumber;
        });
        this.packets = [];
    }

    getPlayer(number) {
        return this.players.find(player => player.number === number);
    }

    stopLoop() {
        this.loopRunning = false;
    }

    //updates pig positions
    updatePlayers(state) {
        state.players.forEach(player => player.pig.updatePig())
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


    updatePipes(state) {
        for (let i = state.pipes.length - 1; i >= 0; i--) {
            let pipe = state.pipes[i];
            pipe.update();
            if (pipe.x + pipe.width < 0) {
                state.pipes.shift();
            }
        }
    }

}

module.exports = ServerController;
