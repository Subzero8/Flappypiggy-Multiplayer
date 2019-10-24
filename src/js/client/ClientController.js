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

        //for physics loop
        this.previousRender = 0;
        this.lagRender = 0;

        this.lastPhysicsFrame = null;

        this.lastRenderFrame = Date.now();
        //for ping calculation
        this.pings = [];
        this.statesHistory = [];
        this.initializeNetworking();

        this.countedFrames = 0;
        //state for rendering
        this.renderingState = null;
        //current game state physic wise
        this.logicState = null;
        //server state received
        this.serverState = null;

        this.positionsHistory = new Map();

        this.fpsTimestamps = [];

        this.physicsStateHistory = [];

        this.ticker = PIXI.Ticker.shared;
        this.ticker.autoStart = false;
        this.ticker.stop();
        this.ticker.add(delta => this.updateRender(delta));

        this.sent = null;

        this.pingLoop = setInterval(this.sendPing.bind(this), 1000);

        this.debugging = false;

    }

    sendPing() {
        this.sent = Date.now();
        this.socket.emit('packet', {
            action: 'ping'
        })
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
                case "pong":
                    console.log('pong');
                    let ping = Date.now() - this.sent;
                    this.scene.setPing(ping);
                    break;
                // case "roundTrip":
                //     this.ping = this.calculatePing(packet.ping);
                //     this.scene.setPing(this.ping);
                //     break;
                case 'countdown':
                    this.gameCountdown(packet.count);
                    break;

            }
        });
        // this.socket.on('won', () => this.scene.displayMessage(this.scene.annoncer, 'You Won !'));
        // this.socket.on('lost', () => this.scene.displayMessage(this.scene.annoncer, 'You Lost !'));
        this.socket.on('disconnect', () => this.stopLoops());
    }

    stopLoops() {
        console.log('user disconnected');
        this.loopRunning = false;
        clearInterval(this.pingLoop);
    }

    gameCountdown(count) {
        switch (count) {
            case 0:
                this.scene.displayMessage(this.scene.annoncer, 'Go !');
                this.nextGameTick = Date.now();
                this.running = true;
                break;
            case -1:
                this.scene.displayMessage(this.scene.annoncer, '');
                break;
            default:
                this.scene.displayMessage(this.scene.annoncer, count)

        }
    }

    onNewMatch(packet) {
        console.log("[MATCH FOUND]");
        this.logicState = this.getCopy(packet.state);
        this.renderingState = this.getCopy(this.logicState);
        this.onServerUpdate(packet);
        //initialize Scene
        this.scene.initialize(this.logicState, this.id);
        this.scene.displayMessage(this.scene.annoncer, 'Match Found !');
        this.setListeners();
        this.startLoop();

    }

    onServerUpdate(packet) {
        console.log('[SERVER UPDATE]');
        this.serverState = this.getCopy(packet.state);
        this.serverState.players.forEach(player => {
            if (player.number !== this.id) {
                if (!this.positionsHistory.get(player.number)) {
                    this.positionsHistory.set(player.number, []);
                }
                let positionHistory = this.positionsHistory.get(player.number);
                positionHistory.push({
                    step: this.serverState.step,
                    position: player.pig.y
                });
                //let extrapolatedPosition = this.simulatePig(this.getCopy(player.pig), 100 / PHYSICS_TICK_DURATION);
                //console.log(extrapolatedPosition);
            }
        });
        // console.log('[BEFORE serverReconciliation]');
        // console.log('this.serverState.step', this.serverState.step);
        // console.log('this.logicState.step', this.logicState.step);
        this.serverReconciliation();
        // console.log('[AFTER serverReconciliation]');
        // console.log('this.serverState.step', this.serverState.step);
        // console.log('this.logicState.step', this.logicState.step);

        this.logicState = this.getCopy(this.serverState);
    }

    startLoop() {
        this.loopRunning = true;
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    gameLoop() {
        if (this.loopRunning) {
            requestAnimationFrame(this.gameLoop.bind(this));
        }

        this.sendInputsToServer();
        if (this.running) {
            let loops = 0;
            // console.log('Date.now()=', Date.now(), 'this.nextGameTick=', this.nextGameTick);
            while (Date.now() > this.nextGameTick && loops < 30) {
                this.updatePhysics();
                this.nextGameTick += PHYSICS_TICK_DURATION;
                // console.log('this.nextGameTick=', this.nextGameTick);
                loops++;
                // console.log('loops=', loops);
            }
            let interpolation = (Date.now() + PHYSICS_TICK_DURATION - this.nextGameTick) / PHYSICS_TICK_DURATION;
            this.updateRender(interpolation);
        }

    }


    updatePhysics() {
        if (this.debugging) {
            console.log('');
            console.log('[ PHYSICS TICK ]');
            console.log('[ BEFORE simulatePhysics ]');
            for (let i = 0; i < this.logicState.pipes.length; i++) {
                let physicsPipe = this.logicState.pipes[i];
                console.log('physicsPipe = ', physicsPipe.x);
            }
        }
        this.logicState = this.getCopy(this.simulatePhysics(this.logicState, 1));

        if (this.debugging) {
            console.log('[ AFTER simulatePhysics ]');
            for (let i = 0; i < this.logicState.pipes.length; i++) {
                let physicsPipe = this.logicState.pipes[i];
                console.log('physicsPipe = ', physicsPipe.x);
            }
        }
        //add the state to our history for later reconciliation
        this.statesHistory.push(this.getCopy(this.logicState));
        this.statesHistory = this.statesHistory.filter(state => state.step >= this.logicState.step - 60);

        this.renderingState = this.getCopy(this.logicState);

        this.physicsStateHistory.push(this.getCopy(this.logicState));

    }

    updateRender(interpolation) {
        if (this.debugging) {
            console.log('');
            console.log('[ RENDER TICK ] (last physic=', Date.now() - this.lastPhysicsFrame, ')');
            //extrapolate it
            //this.interpolateEntities();
            console.log('[ BEFORE extrapolateState ]');
            for (let i = 0; i < this.renderingState.pipes.length; i++) {
                let renderingPipe = this.renderingState.pipes[i];
                console.log('renderingPipe.x = ', renderingPipe.x);
            }
        }
        this.renderingState = this.getCopy(this.simulatePhysics(this.logicState, interpolation));
        this.interpolateEntities();
        //render it
        if (this.debugging) {
            console.log('[ AFTER extrapolateState ]');
            for (let i = 0; i < this.renderingState.pipes.length; i++) {
                let renderingPipe = this.renderingState.pipes[i];
                console.log('renderingPipe.x = ', renderingPipe.x);
            }
        }

        this.scene.updateScene(this.renderingState);
        this.fpsTimestamps.push({
            timestamp: Date.now()
        });
        this.fpsTimestamps = this.fpsTimestamps.filter(fpsTimestamp => fpsTimestamp.timestamp >= Date.now() - 1000);
        if (this.fpsTimestamps[0].timestamp < Date.now() - 1000) {
            this.scene.setFPS(this.fpsTimestamps.length);
        }
    }

    interpolateEntities() {
        this.interpolatePigs();
    }

    interpolatePigs() {
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

    interpolatePipes() {
        while (this.physicsStateHistory.length > 2) {
            this.physicsStateHistory.shift();
        }
        if (this.physicsStateHistory.length === 2) {
            let physicsStateB = this.physicsStateHistory[0];
            let physicsStateA = this.physicsStateHistory[1];
            //console.log(physicsStateA);
            //console.log(physicsStateB);
            //console.log(this.renderingState);

            for (let i = 0; i < physicsStateA.pipes.length; i++) {

                let pipe = physicsStateA.pipes[i];
                if (!this.renderingState.pipes.some(p => p.number === pipe.number)) {
                    this.renderingState.pipes.push(this.getCopy(pipe));
                }
                let pipeToRender = this.renderingState.pipes.find(p => p.number === pipe.number);

                if (physicsStateA.pipes.some(p => p.number === pipe.number) &&
                    physicsStateB.pipes.some(p => p.number === pipe.number)) {
                    let pipeB = physicsStateB.pipes.find(p => p.number === pipe.number);
                    let pipeA = physicsStateA.pipes.find(p => p.number === pipe.number);

                    let positionB = pipeB.x;
                    let positionA = pipeA.x;
                    let now = Date.now();
                    let timeSinceLastPhysicsTick = now - this.lastPhysicsFrame;
                    let lerpFactor = timeSinceLastPhysicsTick / PHYSICS_TICK_DURATION;
                    let oldx = pipeToRender.x;
                    pipeToRender.x = this.lerp(positionB, positionA, lerpFactor);

                    // console.log('pipeNumber = ', pipe.number);
                    // console.log('NOW = ', now);
                    // console.log('lastPhysicsFrame', this.lastPhysicsFrame);
                    //console.log('timeSinceLastPhysicsTick', timeSinceLastPhysicsTick);
                    //console.log('lerpFactor', lerpFactor);
                    //console.log('positionA', positionA, 'pipeToRender.x', pipeToRender.x, 'positionB', positionB);
                    console.log('delta = ', pipeToRender.x - oldx);
                }
            }
        }

    }

    interpolatePlayer() {

    }

    lerp(x0, x1, ratio) {
        return x0 * (1 - ratio) + x1 * ratio;
    }

    applyInput(state) {
        let localPlayer = state.players.find(player => player.number === this.id);
        if (this.pendingInputs.length > 0) {
            localPlayer.pig.vy = PIG_SPEED;
            console.log('[INPUT APPLIED] ->', this.logicState.step);
            this.inputHistory.set(this.sequenceNumber, this.logicState.step);
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
                step: this.logicState.step,
                sequenceNumber: this.sequenceNumber,
                data: this.pendingInputs
            });
            this.sequenceNumber++;
            this.pendingInputs = [];
        }
    }

    simulatePhysics(state, step) {
        let simulatedState = this.getCopy(state);
        simulatedState.pipes.forEach(pipe => {
            pipe.x += PIPE_SPEED * step;
        });
        simulatedState.players.forEach(player => {
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
        simulatedState.step += step;
        return simulatedState;
    }

    handleInput() {
        if (!this.running) {
            this.socket.emit('packet', {
                action: 'ready'
            });
        } else {
            this.pendingInputs.push('jump');
            this.applyInput(this.logicState);
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
        // console.log(this.currentState);
        // console.log(this.serverState);
        this.discardProcessedInputs();
        this.checkUnprocessedInputs();
        let deltaStep = this.logicState.step - this.serverState.step;
        this.serverState = this.simulateGame(this.serverState, deltaStep);

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
        let simulatedState = this.getCopy(state);
        if (nbTicks > 0) {
            for (let i = 0; i < nbTicks; i++) {
                simulatedState = this.simulatePhysics(state, 1);
            }
        } else {
            let ticks = Math.abs(nbTicks);
            for (let i = 0; i < ticks; i++) {
                simulatedState = this.simulatePhysics(state, -1);
            }
        }
        return simulatedState;
    }
}
