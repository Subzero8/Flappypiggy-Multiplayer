class ClientController {
    constructor(scene, socket) {
        this.scene = scene;
        this.socket = socket;

        this.pendingInputs = [];
        this.running = false;

        //local id
        this.id = null;
        this.inputHistory = new Map();
        this.sequenceNumber = -1;

        this.running = false;
        this.loopRunning = false;

        //for physics loop
        this.previousPhysics = 0;
        this.lagPhysics = 0;

        this.lastRenderFrame = Date.now();
        //for ping calculation
        this.pings = [];
        this.statesHistory = [];
        this.initializeNetworking();

        this.countedFrames = 0;
        //state for rendering
        this.renderingState = null;
        //current game state physic wise
        this.currentState = null;
        //server state received
        this.serverState = null;

        this.positionsHistory = new Map();

        this.ping = null;

        this.lastSendingPacketTimestamp = null;

        this.fpsTimestamps = [];
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
                // case "ping":
                //     console.log('ping');
                //     this.socket.emit('packet', {
                //         action: 'ping',
                //     });
                //     break;
                // case "roundTrip":
                //     this.ping = this.calculatePing(packet.ping);
                //     this.scene.setPing(this.ping);
                //     break;
            }
        });
    }

    onServerUpdate(packet) {
        console.log('[SERVER UPDATE]');
        this.serverState = this.getCopy(packet.state);
        this.serverState.players.forEach(player => {
            if (player.number !== this.id) {
                //If no buffer exist, create it
                if (!this.positionsHistory.get(player.number)) {
                    this.positionsHistory.set(player.number, []);
                }
                let positionHistory = this.positionsHistory.get(player.number);
                // Add it to the position buffer.
                positionHistory.push({
                    step: this.serverState.step,
                    position: player.pig.y
                });
            }
        });
        this.serverReconciliation();
        this.pings.push({
            received: Date.now(),
            delay: Date.now() - packet.sent
        });
        this.scene.setPing(this.calculatePing());
    }

    onNewMatch(packet) {
        console.log("[MATCH FOUND]");
        this.currentState = this.getCopy(packet.state);
        this.renderingState = this.getCopy(packet.state);
        this.onServerUpdate(packet);
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
        this.setListeners();
        this.startLoop();

    }

    physicsLoop() {
        if (this.loopRunning) {
            requestAnimationFrame(this.physicsLoop.bind(this));
        }
        let now = Date.now();
        let delta = now - this.previousPhysics;
        if (delta > 1000) {
            delta = PHYSICS_TICK_DURATION;
        }
        this.lagPhysics += delta;
        if (this.lagPhysics >= PHYSICS_TICK_DURATION) {
            this.sendInputsToServer();
            if (this.running) {
                this.updatePhysics();
            }
            this.lagPhysics -= PHYSICS_TICK_DURATION;
        }
        this.previousPhysics = now;
    }

    startLoop() {
        this.loopRunning = true;
        this.startTime = Date.now();
        requestAnimationFrame(this.renderingLoop.bind(this));
        requestAnimationFrame(this.physicsLoop.bind(this));
    }

    renderingLoop() {
        if (this.loopRunning) {
            requestAnimationFrame(this.renderingLoop.bind(this));
        }
        if (this.running) {
            this.updateRender();
        }
    }

    interpolateEntities() {
        let render_step = this.renderingState.step - PHYSICS_TICKRATE / CLIENT_TICKRATE;
        //console.log(this.renderingState.step);
        this.renderingState.players.forEach(player => {
            if (player.number !== this.id) {
                let positionHistory = this.positionsHistory.get(player.number);
                // Drop older positions.

                while (positionHistory.length >= 2 && positionHistory[1].step <= render_step) {
                    positionHistory.shift();
                }
                let positionHistoryA = positionHistory[0];
                let positionHistoryB = positionHistory[1];

                // Interpolate between the two surrounding authoritative positions.
                if (positionHistory.length >= 2 && positionHistoryA.step <= render_step && render_step <= positionHistoryB.step) {
                    let y0 = positionHistoryA.position;
                    let y1 = positionHistoryB.position;
                    let t0 = positionHistoryA.step;
                    let t1 = positionHistoryB.step;

                    player.pig.y = y0 + (y1 - y0) * (render_step - t0) / (t1 - t0);
                }
            }

        });
    }

    updateRender() {
        let now = Date.now();
        //time since last render
        let deltaTime = now - this.lastRenderFrame;
        //extrapolate it
        this.interpolateEntities();
        this.extrapolateState(this.renderingState, deltaTime);
        //render it
        this.scene.render(this.renderingState);

        this.fpsTimestamps.push({
            timestamp: Date.now()
        });
        this.fpsTimestamps = this.fpsTimestamps.filter(fpsTimestamp => fpsTimestamp.timestamp >= Date.now() - 1000);
        this.scene.setFPS(this.fpsTimestamps.length);
        this.lastRenderFrame = Date.now();
    }

    extrapolateState(state, deltaTime) {
        //of how much do we want to update the game ?
        let stepsToExtrapolate = deltaTime / PHYSICS_TICK_DURATION;
        return this.simulatePhysics(state, stepsToExtrapolate);
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

    simulatePhysics(state, step) {
        state.pipes.forEach(pipe => {
            pipe.x += PIPE_SPEED * step;
        });
        state.players.forEach(player => {
            if (player.number === this.id) {
                player.pig.y += player.pig.vy * step;
                if (player.pig.y >= GAME_HEIGHT) {
                    player.pig.y = GAME_HEIGHT
                }
                if (player.pig.vy + GRAVITY <= PIG_MAX_SPEED) {
                    player.pig.vy += GRAVITY * step;
                }
            }
        });
        state.step += step;
    }

    handleInput() {
        if (!this.running) {
            this.socket.emit('packet', {
                action: 'ready'
            });
            this.lastSendingPacketTimestamp = Date.now();
        } else {
            this.pendingInputs.push('jump');
            this.applyInput(this.currentState);
        }
    }

    setListeners() {
        let z = new KeyListener('z');
        z.press = this.handleInput.bind(this);
        let Z = new KeyListener('Z');
        Z.press = this.handleInput.bind(this);

        window.addEventListener('touchstart', this.handleInput.bind(this));
    }

    serverReconciliation() {
        console.log(this.currentState);
        console.log(this.serverState);
        this.discardProcessedInputs();
        this.checkUnprocessedInputs();
        this.checkServerBehindClient();

        this.currentState.pipes = this.serverState.pipes;
        // for (let i = 0; i < this.currentState.players.length; i++) {
        //         //     if (this.currentState.players[i].number !== this.id) {
        //         //         this.currentState.players[i] = this.serverState.players[i];
        //         //     }
        //         // }
    }

    discardProcessedInputs() {
        let lastProcessedInputSequenceNumber = this.getPlayer(this.serverState).sequenceNumber;

        for (let sequenceNumber of this.inputHistory.keys()) {
            if (sequenceNumber <= lastProcessedInputSequenceNumber) {
                this.inputHistory.delete(sequenceNumber);
            }
        }
    }

    checkServerBehindClient() {
        //if client ahead of server, simulate
        let deltaStep = this.currentState.step - this.serverState.step;
        if (deltaStep > 0) {
            this.simulateGame(this.serverState, deltaStep);
        }
    }

    checkUnprocessedInputs() {
        let oldState = null;
        //check for unprocessed input from server
        for (let sequenceNumber of this.inputHistory.keys()) {
            console.log('SEQUENCENUMBER', sequenceNumber);
            let oldStep = this.inputHistory.get(sequenceNumber);
            let deltaStep = this.serverState.step - oldStep;

            oldState = this.getCopy(this.statesHistory.find(state => state.step === oldStep));
            this.simulateGame(oldState, deltaStep);
            this.applyInput(oldState);
        }
        if (oldState) {
            console.log(oldState);
            this.serverState = this.getCopy(oldState)
        }
    }


    updatePhysics() {
        this.simulatePhysics(this.currentState, 1);
        //add the state to our history for later reconciliation
        this.statesHistory.push(this.getCopy(this.currentState));
        this.statesHistory = this.statesHistory.filter(state => state.step >= this.currentState.step - 60);

        this.renderingState.players.find(player => player.number === this.id).pig = this.getCopy(this.currentState).players.find(player => player.number === this.id).pig;
        this.renderingState.pipes = this.getCopy(this.currentState).pipes;
        this.renderingState.step = this.currentState.step;
    }

    calculatePing() {
        this.pings = this.pings.filter(ping => ping.received > Date.now() - 500);
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


    simulateGame(state, nbTicks) {
        for (let i = 0; i < nbTicks; i++) {
            this.simulatePhysics(state, 1);
        }
    }
}
