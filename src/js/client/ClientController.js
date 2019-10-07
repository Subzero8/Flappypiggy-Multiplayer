class ClientController {
    constructor(scene, socket) {
        this.scene = scene;
        this.socket = socket;
        this.state;
        this.setListeners();
        this.playerNumber;

        this.socket.on('updateState', state => {
            this.state = state;
        });
        this.socket.on('playerNumber', number => this.playerNumber = number)
        this.socket.on('newMatch', state => {
            console.log("[MATCH FOUND]");

            this.scene.initialize(state, this.playerNumber);
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
                    default:
                        this.scene.displayMessage(this.scene.annoncer, count)

                }
            });
        })
        this.players = [];
        this.pigs = [];
        this.pipes = [];
        this.inputs = [];

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
            this.sendInputs();
            if (this.running) {
                this.scene.updateScene(this.state);
                this.deadReckoning(delta);
            }
        }

        requestAnimationFrame(this.gameLoop.bind(this));
    }
    sendInputs(){
        this.socket.emit('packet', {
            data: this.inputs
        });
        this.inputs = [];
    }

    deadReckoning(delta) {
        this.pipes = this.state.pipes;
        //predict position of each pipes
        this.pipes.forEach(pipe => {
            pipe.x += PIPE_SPEED / UPDATE_TICK_RATE;
        })
        this.players = this.state.players;
        this.players.forEach(player => {
            player.pig.y += player.pig.vy / SERVER_TICKRATE;
            if (player.pig.y >= GAME_HEIGHT) {
                player.pig.y = GAME_HEIGHT
            }
            player.pig.vy += GRAVITY / SERVER_TICKRATE;
        })
        this.scene.updateScene(this.state);
    }


    setListeners() {
        let space = new KeyListener(' ');
        space.press = () => {
            this.inputs.push('spacebar');
        };

        window.addEventListener('touchstart', () => {
            this.inputs.push('spacebar');
        });
    }


}
