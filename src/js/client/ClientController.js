class ClientController {
    constructor(scene, socket) {
        this.scene = scene;
        this.socket = socket;

        this.pendingInputs = [];
        this.running = false;

        this.inputHistory = new Map();
        this.sequenceNumber = -1;

        this.running = false;
        this.loopRunning = false;

        //for physics loop
        this.previousPhysics = 0;
        this.lagPhysics = 0;
        //for ping calculation
        this.pings = [];
        this.statesHistory = [];
        this.initializeNetworking();
    }

    initializeNetworking() {
        this.socket.on('packet', packet => {
            switch (packet.action) {
                case "newGame":
                    this.onNewMatch(packet);
                    break;
                case "serverUpdate":
                    this.onServerUpdate(packet);
                    break;
                case "id":
                    this.id = packet.id;
                    break;
                // case "serverStep":
                //     console.log(packet.step);
                //     this.socket.emit('packet', {
                //         action: 'clientStep',
                //         step: packet.step
                //     });
                //     break;
                // case "roundTrip":
                //     this.clientStep = Math.round(packet.roundTrip/2 + 1);
                //     console.log(this.clientStep);
                //     this.simulateGame(this.clientStep);
                //     this.render();
                //     break;
            }
        });
    }

    onServerUpdate(packet) {
        this.serverState = this.getCopy(packet.state);
        this.pings.push({
            received: Date.now(),
            delay: Date.now() - packet.sent
        });
        this.serverReconciliation();
        this.scene.setPing(this.calculatePing());
    }

    onNewMatch(packet) {
        console.log("[MATCH FOUND]");
        this.currentState = packet.state;
        this.setListeners();
        //initialize Scene
        this.scene.initialize(this.currentState, this.id);
        this.scene.displayMessage(this.scene.annoncer, 'Match Found !');
        this.socket.on('won', () => this.scene.displayMessage(this.scene.annoncer, 'You Won !'));
        this.socket.on('lost', () => this.scene.displayMessage(this.scene.annoncer, 'You Lost !'));
        this.socket.on('countdown', count => {
            switch (count) {
                case 0:
                    this.scene.displayMessage(this.scene.annoncer, 'Go !');
                    this.running = true;
                    break;
                case -1:
                    this.scene.displayMessage(this.scene.annoncer, '');
                    break;
                default:
                    this.scene.displayMessage(this.scene.annoncer, count)

            }
        });
        this.socket.on('disconnect', () => {
            console.log('user disconnected');
            this.loopRunning = false;
        });
        this.startLoop();

    }

    physicsLoop() {
        if (this.loopRunning) {
            requestAnimationFrame(this.physicsLoop.bind(this));
        }
        let now = Date.now();
        let delta = now - this.previousPhysics;
        if (delta > 1000) {
            delta = SERVER_TICK_DURATION;
        }
        this.lagPhysics += delta;
        if (this.lagPhysics >= SERVER_TICK_DURATION) {
            this.sendInputsToServer();
            if (this.running) {
                this.updatePhysics();
            }
            this.lagPhysics -= SERVER_TICK_DURATION;
        }
        this.previousPhysics = now;
    }

    startLoop() {
        this.startTime = Date.now();
        this.loopRunning = true;
        requestAnimationFrame(this.gameLoop.bind(this));
        requestAnimationFrame(this.physicsLoop.bind(this));
    }

    gameLoop(time) {
        if (this.loopRunning) {
            requestAnimationFrame(this.gameLoop.bind(this));
        }
        let delta = 0;
        let currentFrame;
        if (this.startTime === undefined) {
            this.startTime = time;
        } else {
            currentFrame = Math.round((time - this.startTime) / UPDATE_FRAME_TIME);
            delta = (currentFrame - this.lastFrame) * UPDATE_FRAME_TIME;
        }
        this.lastFrame = currentFrame;
        if (delta >= UPDATE_FRAME_TIME) {
            if (this.running) {
                this.render();
            }
        }

    }

    applyInput(state) {
        let localPlayer = state.players.find(player => player.number === this.id);
        if (this.pendingInputs.length > 0) {
            localPlayer.pig.vy = PIG_SPEED;
            console.log('[INPUT APPLIED] ->', this.currentState.step);
            this.inputHistory.set(this.sequenceNumber, this.currentState.step);
        }
    }

    getCopy(object) {
        return JSON.parse(JSON.stringify(object));
    }

    sendInputsToServer() {
        if (this.pendingInputs.length > 0) {
            this.socket.emit('packet', {
                action: 'input',
                id: this.id,
                step: this.currentState.step,
                sequenceNumber: this.sequenceNumber,
                data: this.pendingInputs
            });
            this.sequenceNumber++;
            this.pendingInputs = [];
        }
    }

    updateGame(state) {
        state.pipes.forEach(pipe => {
            pipe.x += PIPE_SPEED;
        });
        state.players.forEach(player => {
            player.pig.y += player.pig.vy;
            if (player.pig.y >= GAME_HEIGHT) {
                player.pig.y = GAME_HEIGHT
            }
            if (player.pig.vy + GRAVITY <= PIG_MAX_SPEED) {
                player.pig.vy += GRAVITY;
            }
        })
    }


    setListeners() {
        let z = new KeyListener('z');
        z.press = () => {
            if (!this.running) {
                this.socket.emit('packet', {
                    action: 'ready'
                });
            } else {
                this.pendingInputs.push('jump');
                this.applyInput(this.currentState);
            }
        };

        window.addEventListener('touchstart', () => {
            if (!this.running) {
                this.socket.emit('ready');
            } else {
                this.pendingInputs.push('jump');
                this.applyInput(this.currentState);
            }
        });
    }

    serverReconciliation() {
        this.discardProcessedInputs();
        this.checkUnprocessedInputs();
        this.checkServerBehindClient();
    }

    discardProcessedInputs() {
        let lastProcessedInputSequenceNumber = this.getPlayer(this.serverState).sequenceNumber;

        for (let sequenceNumber of this.inputHistory.keys()) {
            if (sequenceNumber <= lastProcessedInputSequenceNumber)
                this.inputHistory.delete(sequenceNumber);
        }
    }

    correctActorsPosition() {
        this.lastState = this.getCopy(this.currentState);
        this.currentState = this.getCopy(this.serverState);
        if (this.timeSinceLastServerSnapshot <= INTERPOLATION_PERIOD) {
            this.currentState.pipes.forEach(pipe => {
                let lastPipe = this.lastState.pipes.find(p => p.number === pipe.number);
                let serverPipe = this.currentState.pipes.find(p => p.number === pipe.number);
                if (lastPipe) {
                    pipe.x = this.lerp(lastPipe.x, serverPipe.x, this.timeSinceLastServerSnapshot / INTERPOLATION_PERIOD);
                } else {
                    pipe.x = serverPipe.x;
                }
            });
            /*this.currentState.players.forEach(player => {
                let lastStatePig = this.lastState.players.find(p => p.number === player.number).pig;
                let serverPig = this.currentState.players.find(p => p.number === player.number).pig;
                if (lastStatePig) {
                    player.pig.y = this.lerp(lastStatePig.y, serverPig.y, this.timeSinceLastServerSnapshot / INTERPOLATION_PERIOD);
                } else {
                    player.pig.y = serverPig.y;
                }
            })*/
        } else {
            this.currentState.pipes.forEach(pipe => {
                let serverPipe = this.currentState.pipes.find(p => p.number === pipe.number);
                pipe.x = serverPipe.x
            })
            // this.currentState.players.forEach(player => {
            //     let serverPig = this.currentState.players.find(p => p.number == player.number).pig;
            //     player.pig.y = serverPig.y;
            //
            // })
        }


    }

    lerp(start, end, time) {
        return start * (1 - time) + end * time;
    }


    render() {
        this.scene.render(this.currentState);
    }

    checkServerBehindClient() {
        //if client ahead of server, simulate
        let deltaStep = this.currentState.step - this.serverState.step;
        if (deltaStep > 0) {
            console.log(deltaStep);
            this.simulateGame(this.serverState, deltaStep);
        }
    }

    checkUnprocessedInputs() {

        //check for unprocessed input from server
        for (let sequenceNumber of this.inputHistory.keys()) {
            console.log('SEQUENCENUMBER', sequenceNumber);
            let oldStep = this.inputHistory.get(sequenceNumber);
            let deltaStep = this.currentState.step - oldStep;

            let oldState = this.statesHistory.find(state => state.step === oldStep);
            this.simulateGame(oldState, deltaStep);
        }

        console.log(this.serverState);
        console.log(this.currentState);

        this.currentState.pipes = this.serverState.pipes;
    }


    updatePhysics() {
        this.updateGame(this.currentState);
        this.currentState.step++;
        this.statesHistory.push(this.getCopy(this.currentState));
        this.statesHistory = this.statesHistory.filter(state => state.step >= this.currentState.step - 60)
    }

    calculatePing() {
        this.pings = this.pings.filter(ping => ping.received > Date.now() - 3000);
        return Math.round(this.sum(this.pings) / this.pings.length);
    }

    sum(array) {
        let counter = 0;
        for (let i = 0; i < array.length; i++) {
            counter += array[i].delay;
        }
        return counter;
    }

    getPlayer(state) {
        return state.players.find(player => player.number === this.id);
    }

    sendPacket(packet) {

    }

    simulateGame(state, nbTicks) {
        for (let i = 0; i < nbTicks; i++) {
            this.updateGame(state);
        }
    }
}
