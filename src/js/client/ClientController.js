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
        this.upsTimestamps = [];

        this.physicsStateHistory = [];

        this.sent = null;

        this.pingLoop = setInterval(this.sendPing.bind(this), 1000);

        this.debugging = false;

        this.scene.displayMessage(this.scene.annoncer, 'Looking for opponents...');
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
                case 'foundOpponent':
                    this.scene.displayMessage(this.scene.annoncer,
                        +packet.nbPlayers + (packet.nbPlayers > 1 ? ' players' : ' player') + ' In Lobby');
                    break;
                case 'starting':
                    this.scene.displayMessage(this.scene.annoncer, packet.playersCount + (packet.playersCount > 1 ? ' players' : ' player') + ' In Lobby' + '\n' +
                        'Match starting in ' + packet.count);
                    break;
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
                case "won":
                    this.scene.displayMessage(this.scene.annoncer, 'You Won !');
                    this.stopLoops();
                    break;

            }
        });
        this.socket.on('disconnect', () => this.stopLoops());
    }

    stopLoops() {
        console.log('user disconnected');
        this.loopRunning = false;
        this.running = false;
        clearInterval(this.pingLoop);
    }

    gameCountdown(count) {
        switch (count) {
            case 0:
                this.scene.displayMessage(this.scene.annoncer, 'Go !');
                this.running = true;
                this.nextGameTick = Date.now();
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
        this.logicState = new State(packet.state);
        this.renderingState = new State(packet.state);
        this.onServerUpdate(packet);
        //initialize Scene
        this.scene.initialize(this.logicState, this.id);
        this.scene.displayMessage(this.scene.annoncer, 'Press a key to start the game !');
        this.setListeners();
        this.startLoop();

    }

    onServerUpdate(packet) {
        //console.log('[SERVER UPDATE]');
        this.serverState = new State(packet.state);
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
                let extrapolatedPosition = this.simulatePig(player.pig, 100 / PHYSICS_TICK_DURATION);
                //console.log(extrapolatedPosition);
            }
        });
        // console.log(this.statesHistory);
        // console.log('[BEFORE serverReconciliation]');
        // console.log('this.serverState.step', this.serverState.step);
        // console.log('this.logicState.step', this.logicState.step);
        this.serverReconciliation();
        // console.log('[AFTER serverReconciliation]');
        // console.log('this.serverState.step', this.serverState.step);
        // console.log('this.logicState.step', this.logicState.step);
        // console.log(this.logicState);
        this.logicState = this.serverState.copy();
    }

    simulatePig() {

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
            while (Date.now() > this.nextGameTick && loops < 5) {
                this.updatePhysics();
                this.checkCollision();
                this.nextGameTick += PHYSICS_TICK_DURATION;
                // console.log('this.nextGameTick=', this.nextGameTick);
                loops++;
                // console.log('loops=', loops);
            }
            let interpolation = (Date.now() + PHYSICS_TICK_DURATION - this.nextGameTick) / PHYSICS_TICK_DURATION;
            let t1 = Date.now();
            this.updateRender(interpolation);
            //console.log('TIME TO EXECUTE =', Date.now() - t1);
        }

    }


    checkCollision() {
        let localPlayer = this.logicState.players.find(p => p.number === this.id);
        if (this.logicState.pigOutOfBounds(localPlayer) || this.logicState.checkCollisionPipes(localPlayer)) {
            this.socket.emit('packet', {
                action: 'lost'
            });
            this.scene.displayMessage(this.scene.annoncer, 'You Lost !');
            this.stopLoops();
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
        this.logicState.updatePhysics(1);

        if (this.debugging) {
            console.log('[ AFTER simulatePhysics ]');
            for (let i = 0; i < this.logicState.pipes.length; i++) {
                let physicsPipe = this.logicState.pipes[i];
                console.log('physicsPipe = ', physicsPipe.x);
            }
        }
        //add the state to our history for later reconciliation
        this.statesHistory.push(this.logicState.copy());
        this.statesHistory = this.statesHistory.filter(state => state.step >= this.logicState.step - 60);

        this.renderingState = this.logicState.copy();

        this.physicsStateHistory.push(this.logicState.copy());

        //calculate ups
        this.upsTimestamps.push({
            timestamp: Date.now()
        });
        this.upsTimestamps = this.upsTimestamps.filter(upsTimestamp => upsTimestamp.timestamp > Date.now() - 1000);
        this.scene.setUPS(this.upsTimestamps.length);
    }

    updateRender(interpolation) {
        if (this.debugging) {
            console.log('');
            console.log('[ RENDER TICK ] (interpolation=', interpolation, ')');
            console.log('[ BEFORE extrapolateState ]');
            for (let i = 0; i < this.renderingState.pipes.length; i++) {
                let renderingPipe = this.renderingState.pipes[i];
                console.log('renderingPipe.x = ', renderingPipe.x);
            }
        }
        this.renderingState = this.logicState.copy();
        this.renderingState.updatePhysics(interpolation);
        this.interpolateEntities();
        //render it
        if (this.debugging) {
            console.log('[ AFTER extrapolateState ]');
            for (let i = 0; i < this.renderingState.pipes.length; i++) {
                let renderingPipe = this.renderingState.pipes[i];
                console.log('renderingPipe.x = ', renderingPipe.x);
            }
        }

        this.scene.render(this.renderingState);
        this.fpsTimestamps.push({
            timestamp: Date.now()
        });
        this.fpsTimestamps = this.fpsTimestamps.filter(fpsTimestamp => fpsTimestamp.timestamp > Date.now() - 1000);
        this.scene.setFPS(this.fpsTimestamps.length);
    }

    interpolateEntities() {
        this.interpolatePigs();
    }

    interpolatePigs() {
        console.log(this.logicState.step);
        let render_step = this.renderingState.step - (PHYSICS_TICKRATE / CLIENT_TICKRATE) * 2;
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
                for (let i = 0; i < positionHistory.length; i++) {
                    console.log(positionHistory[i]);
                }
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

    lerp(x0, x1, ratio) {
        return x0 * (1 - ratio) + x1 * ratio;
    }

    applyInput(state) {
        let localPlayer = state.players.find(player => player.number === this.id);
        localPlayer.pig.applyInput();
        console.log('[INPUT APPLIED] ->', state.step);
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

    handleInput() {
        if (!this.running) {
            this.socket.emit('packet', {
                action: 'ready'
            });
        } else {
            this.pendingInputs.push('jump');
            this.applyInput(this.logicState);
            this.inputHistory.set(this.sequenceNumber, this.logicState.step);
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
        //console.log(this.inputHistory);
        this.discardProcessedInputs();
        this.checkUnprocessedInputs();
        let deltaStep = this.logicState.step - this.serverState.step;
        this.serverState.updatePhysics(deltaStep);
    }

    discardProcessedInputs() {
        let lastProcessedInputSequenceNumber = this.getPlayer(this.serverState).sequenceNumber;

        for (let sequenceNumber of this.inputHistory.keys()) {
            if (sequenceNumber <= lastProcessedInputSequenceNumber) {
                this.inputHistory.delete(sequenceNumber);
            }
        }
    }

    checkUnprocessedInputs() {
        //check for unprocessed input from server
        //console.log('this.serverState', this.serverState);
        for (let sequenceNumber of this.inputHistory.keys()) {
            //console.log('sequenceNumber=', sequenceNumber);
            let oldStep = this.inputHistory.get(sequenceNumber);
            //console.log('Old step =', oldStep);
            let deltaStep = oldStep - this.serverState.step;
            //console.log('deltaStep =', deltaStep);
            this.serverState.updatePhysics(deltaStep);
            this.applyInput(this.serverState);

        }
        //console.log('this.serverState', this.serverState);
    }


    getPlayer(state) {
        return state.players.find(player => player.number === this.id);
    }


}
