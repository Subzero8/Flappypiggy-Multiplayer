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
        this.inputBuffer = [];

        this.initializeNetworking();
        this.sendNewMatchNotification();

        this.stateHistory = new Map();
        this.lostPlayers = [];
        this.startLoop();
    }

    initializeNetworking() {
        this.players.forEach(player => {
            let socket = this.getSocket(player.number);
            socket.on('packet', packet => {
                switch (packet.action) {
                    case "input":
                        console.log('[RECEIVED] ->', this.state.step);
                        this.inputBuffer.push(packet);
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
                    case "lost":
                        this.lostPlayers.push(player);
                        if (this.lostPlayers.length === this.players.length - 1) {
                            this.endGame();
                            this.stopLoop();
                        }
                        break;
                }
            });
        });
    }

    endGame() {
        for (let i = 0; i < this.players.length; i++) {
            if (!this.lostPlayers.some(player => player.number === this.players[i].number)) {
                this.getSocket(this.players[i].number).emit('packet', {
                    action: 'won'
                })
            }
        }
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
                this.state.updatePhysics();
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

    handleInputs() {
        this.inputBuffer.forEach(packet => {
            console.log(this.inputBuffer);
            console.log('[INPUT APPLIED] ->', this.state.step);
            let deltaStep = this.state.step - packet.step;

            if (deltaStep >= 0) {
                console.log('[REWINDING] ->', deltaStep, 'steps');
                let oldState = this.stateHistory.get(packet.step).copy();
                let player = oldState.players.find(player => player.number === packet.id);
                player.pig.applyInput();

                for (let i = 0; i < deltaStep; i++) {
                    player.pig.updatePig();
                }
                let updatedPlayer = this.state.players.find(player => player.number === packet.id);
                updatedPlayer.pig = player.pig;
                updatedPlayer.sequenceNumber = packet.sequenceNumber;
                this.inputBuffer = this.inputBuffer.filter(p => p.step !== packet.step);
            }
        });
    }

    getPlayer(number) {
        return this.players.find(player => player.number === number);
    }

    stopLoop() {
        this.loopRunning = false;
    }
}

module.exports = ServerController;
