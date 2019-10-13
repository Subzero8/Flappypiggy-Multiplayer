class ClientController {
    constructor(scene, socket) {
        this.scene = scene;
        this.socket = socket;
        this.localPlayerNumber;

        this.pendingInputs = [];

        this.startTime;
        this.lastFrame;
        this.running = false;

        this.statesHistory = [];
        this.lastState;
        this.currentState;
        this.serverState;
        this.statesHistory = [];
        this.timeSinceLastServerSnapshot = 0;

        this.initializeNetworking();
    }

    initializeNetworking() {
        this.socket.on('updateState', serverState => {
            this.serverState = serverState;
            this.correctActorsPosition();
            //this.statesHistory.push(serverState);
            this.timeSinceLastServerSnapshot = 0;
            //this.serverReconciliation();
        });
        this.socket.on('localPlayerNumber', number => {
            this.localPlayerNumber = number;

            console.log(number);
        });
        this.socket.on('newMatch', serverState => {
            console.log("[MATCH FOUND]");
            this.currentState = serverState;
            this.setListeners();
            //initialize Scene
            this.scene.initialize(serverState, this.localPlayerNumber);
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
        })
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
            console.log(delta);
            this.processInput();
            if (this.running) {
                this.update(delta / 1000);
                this.render();
                this.lastState = this.getCopy(this.currentState);
            }
            this.timeSinceLastServerSnapshot += delta;
        }

        requestAnimationFrame(this.gameLoop.bind(this));
    }
    applyInputs() {
        let localPlayer = this.currentState.players.find(player => player.number === this.localPlayerNumber);
        this.pendingInputs.forEach(() => {
            localPlayer.pig.vy = PIG_SPEED;
        })
    }

    getCopy(object) {
        return JSON.parse(JSON.stringify(object));
    }

    sendInputsToServer() {
        this.sendInputs(this.pendingInputs);
        this.pendingInputs = [];
    }

    update(delta) {
        //predict position of each pipes
        this.currentState.pipes.forEach(pipe => {
            pipe.x += PIPE_SPEED * delta;
        });

        this.currentState.players.forEach(player => {
            player.pig.y += player.pig.vy * delta;
            if (player.pig.y >= GAME_HEIGHT) {
                player.pig.y = GAME_HEIGHT
            }
            player.pig.vy += GRAVITY * delta;
        })
    }


    setListeners() {
        let space = new KeyListener(' ');
        space.press = () => {
            this.pendingInputs.push('jump');
        };

        window.addEventListener('touchstart', () => {
            this.pendingInputs.push('jump');
        });
    }

    serverReconciliation() {
        let localPlayer = this.currentState.players.find(p => p.number === this.localPlayerNumber);

        this.discardCopy(lastSequenceNumberProcessed);
        this.requestsManager.packetsHistory.forEach(packet => {
            packet.data.forEach(input => clientSidePrediction(input));
        })

    }

    discardCopy(lastSequenceNumberProcessed) {
        this.requestsManager.packetsHistory = this.requestsManager.packetsHistory.filter(packet => {
            packet.sequenceNumber > lastSequenceNumberProcessed;
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

    sendInputs(inputs) {
        if (inputs.length > 0) {
            let packet = {
                action: 'input',
                data: inputs
            };
            this.socket.emit('packet', packet);
        }
    }

    lerp(start, end, time) {
        return start * (1 - time) + end * time;
    }

    processInput() {
        this.sendInputsToServer();
        this.applyInputs();
    }

    render() {
        this.scene.render(this.currentState);
    }
}
