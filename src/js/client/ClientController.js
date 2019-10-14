class ClientController {
    constructor(scene, socket) {
        this.scene = scene;
        this.socket = socket;

        this.pendingInputs = [];
        this.running = false;

        this.inputHistory = [];
        this.sequenceNumber = 0;
        this.clientTime = 0;
        this.running = false;

        this.initializeNetworking();
    }

    initializeNetworking() {
        this.socket.on('updateState', serverState => this.onServerUpdate(serverState));
        this.socket.on('localPlayerNumber', number => this.localPlayerNumber = number);
        this.socket.on('newMatch', serverState => this.onNewMatch(serverState));
    }

    onServerUpdate(serverState) {
        this.serverState = this.getCopy(serverState);
        this.serverReconciliation();
    }

    onNewMatch(serverState) {
        console.log("[MATCH FOUND]");
        this.currentState = this.getCopy(serverState);
        this.setListeners();
        //initialize Scene
        this.scene.initialize(this.currentState, this.localPlayerNumber);
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
        this.startLoop();
    }

    startLoop() {
        this.startTime = Date.now();
        requestAnimationFrame(this.gameLoop.bind(this))
    }

    gameLoop(time) {
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
            this.sendInputsToServer();
            if (this.running) {
                this.applyInputs();
                this.updateGame(delta / 1000, this.currentState);
                this.render();
                this.clientTime += delta/1000;
            }
        }

        requestAnimationFrame(this.gameLoop.bind(this));
    }
    applyInputs() {
        let localPlayer = this.currentState.players.find(player => player.number === this.localPlayerNumber);
        this.pendingInputs.forEach(() => {
            localPlayer.pig.vy = PIG_SPEED;
        });
        this.pendingInputs = [];
    }

    getCopy(object) {
        return JSON.parse(JSON.stringify(object));
    }

    sendInputsToServer() {
        if (this.pendingInputs.length > 0) {
            this.socket.emit('packet', {
                id: this.localPlayerNumber,
                action: 'input',
                data: this.pendingInputs
            });

            this.inputHistory.push(this.clientTime);
        }
    }

    updateGame(delta, state) {
        state.pipes.forEach(pipe => {
            pipe.x += PIPE_SPEED * delta;
        });

        state.players.forEach(player => {
            player.pig.y += player.pig.vy * delta;
            if (player.pig.y >= GAME_HEIGHT) {
                player.pig.y = GAME_HEIGHT
            }
            if (player.pig.vy + GRAVITY * delta < PIG_MAX_SPEED){
                player.pig.vy += GRAVITY * delta;
            }
        })
    }


    setListeners() {
        let z = new KeyListener('z');
        z.press = () => {
            if (!this.running){
                this.socket.emit('ready');
            }
            else{
                this.pendingInputs.push('jump');
            }
        };

        window.addEventListener('touchstart', () => {
            if (!this.running){
                this.socket.emit('ready');
            }
            else{
                this.pendingInputs.push('jump');
            }
        });
    }

    serverReconciliation() {
        this.discardProcessedInputs();
        this.simulateGame()

    }

    discardProcessedInputs() {
        this.inputHistory = this.inputHistory.filter(inputTime => {
            return inputTime > this.serverState.serverTime;
        });
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

    simulateGame() {
        let state = this.getCopy(this.serverState);
        let serverStateTime = state.serverTime;
        if (this.inputHistory.length > 0){
            for (let i = 0; i < this.inputHistory.length; i++) {
                console.log('this.inputHistory', this.inputHistory);
                let nextInputTime = this.inputHistory.shift();
                this.updateGame(nextInputTime - serverStateTime, state);
            }
        }
        else{
            this.updateGame(this.clientTime - serverStateTime, state);
        }
        this.currentState = this.getCopy(state);
    }


}
