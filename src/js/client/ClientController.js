class ClientController {
    constructor(scene, socket) {
        this.scene = scene;
        this.socket = socket;
        this.clientState;
        this.serverState
        this.playerNumber;

        this.socket.on('updateState', serverState => {
            this.serverState = serverState;
            this.clientState = serverState;
            //this.correctActorsPosition();
            this.serverReconciliation();
        });
        this.socket.on('playerNumber', number => this.playerNumber = number)
        this.socket.on('newMatch', serverState => {
            console.log("[MATCH FOUND]");

            this.clientState = serverState;
            this.setListeners();
            this.scene.initialize(serverState, this.playerNumber);
            this.scene.displayMessage(this.scene.annoncer, 'Match Found !');
            this.startLoop();
            this.socket.on('won', () => this.scene.displayMessage(this.scene.annoncer, 'You Won !'));
            this.socket.on('lost', () => this.scene.displayMessage(this.scene.annoncer, 'You Lost !'));
            this.socket.on('countdown', count => {
                switch (count) {
                    case 0:
                        this.scene.displayMessage(this.scene.annoncer, 'Go !')
                        this.running = true;
                        break;
                    case -1:
                        this.scene.displayMessage(this.scene.annoncer, '')
                        break;
                    default:
                        this.scene.displayMessage(this.scene.annoncer, count)

                }
            });
        })
        this.players = [];
        this.pigs = [];
        this.pipes = [];
        this.requestsManager = new RequestsManager(this);

        this.lag = 0;
        this.startTime;
        this.lastFrame;
        this.running = false;
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
            if (this.running) {
                this.deadReckoning(delta);
                this.scene.updateScene(this.clientState);
            }
        }

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    deadReckoning(delta) {
        //predict position of each pipes
        this.clientState.pipes.forEach(pipe => {
            pipe.x += (PIPE_SPEED * delta / UPDATE_FRAME_TIME) / UPDATE_TICK_RATE;
        })
        this.clientState.players.forEach(player => {
            player.pig.y += (player.pig.vy * delta / UPDATE_FRAME_TIME) / UPDATE_TICK_RATE;
            if (player.pig.y >= GAME_HEIGHT) {
                player.pig.y = GAME_HEIGHT
            }
            player.pig.vy += (GRAVITY * delta / UPDATE_FRAME_TIME) / UPDATE_TICK_RATE;
        })
    }


    setListeners() {
        let space = new KeyListener(' ');
        space.press = () => {
            this.clientSidePrediction('spacebar');
            this.requestsManager.addInput('spacebar');
            this.requestsManager.sendInputs();
        };

        window.addEventListener('touchstart', () => {
            this.clientSidePrediction('spacebar');
            this.requestsManager.addInput('spacebar');
            this.requestsManager.sendInputs();
        });
    }

    clientSidePrediction(input) {
        let player = this.clientState.players.find(p => p.number == this.playerNumber);
        switch (input) {
            case 'spacebar':
                player.pig.vy = PIG_SPEED;
                break;
            default:

        }
    }

    serverReconciliation() {
        let player = this.clientState.players.find(p => p.number == this.playerNumber);
        let lastSequenceNumberProcessed = player.lastSequenceNumberProcessed;
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
        let clientStatePipes = [];
        this.clientState.pipes.forEach(clientPipe => clientStatePipes.push(clientPipe));

        let clientStatePlayers = [];
        this.clientState.players.forEach(clientPlayer => clientStatePlayers.push(clientPlayer));

        this.clientState = this.serverState;

        this.clientState.pipes.forEach(clientPipe => {
            let oldClientPipe = clientStatePipes.find(p => p.number == clientPipe.number);

            if (oldClientPipe) {
                let deltaPosition = clientPipe.x - oldClientPipe.x;
                clientPipe.x = oldClientPipe.x + deltaPosition * 0.75;
            }

        })
        //same for pigs
        this.clientState.players.forEach(clientPlayer => {
            let oldClientPlayer = clientStatePlayers.find(p => p.number == clientPlayer.number);

            let deltaPosition = clientPlayer.pig.y - oldClientPlayer.pig.y;
            if (Math.abs(deltaPosition) <= PIG_DEVIATION_MARGIN) {

                clientPlayer.pig.y = oldClientPlayer.pig.y + deltaPosition * 0.75;
            }
        })
    }

}
