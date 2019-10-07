class ClientController {
    constructor(scene, socket) {
        this.scene = scene;
        this.socket = socket;
        this.state;
        this.setListeners();
        this.playerNumber;

        this.socket.on('updateState', state => this.state = state);
        this.socket.on('playerNumber', number => this.playerNumber = number)
        this.socket.on('newMatch', state => {
            console.log("[MATCH FOUND]");

            this.scene.initialize(state, this.playerNumber);
            this.scene.displayMessage(this.scene.annoncer, 'Match Found !');
            this.running = true;
            this.startLoop();
            this.socket.on('won', () => this.scene.displayMessage(this.scene.annoncer, 'You Won !'));
            this.socket.on('lost', () => this.scene.displayMessage(this.scene.annoncer, 'You Lost !'));
            this.socket.on('countdown', count => this.scene.displayMessage(this.scene.annoncer, count));
        })
        this.players = [];
        this.pigs = [];
        this.pipes = [];
        this.inputs = [];

        this.fpsInterval;
        this.startTime;
        this.now;
        this.then;
        this.elapsed;
    }

    startLoop() {
        this.fpsInterval = 1000 / UPDATE_RATE;
        this.then = Date.now();
        this.startTime = this.then;
        this.gameLoop();
    }

    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());
        // calc elapsed time since last loop
        this.now = Date.now();
        this.elapsed = this.now - this.then;
        // if enough time has elapsed, draw the next frame
        if (this.elapsed > this.fpsInterval) {
            // Get ready for next frame by setting then=now, but also adjust for your
            // specified fpsInterval not being a multiple of RAF's interval (16.7ms)
            this.then = this.now - (this.elapsed % this.fpsInterval);

            console.log('sending update');
            this.socket.emit('packet', {data: this.inputs});
            this.inputs = [];
            this.updateState(this.state)

        }
    }
    updateState(state) {
        this.scene.updateScene(state);
    }


    setListeners() {
        let space = new KeyListener(' ');
        space.press = () => {
            this.inputs.push('spacebar');
            // this.socket.emit('input', 'spacebar');
        };

        window.addEventListener('touchstart', () => {
            // this.socket.emit('input', 'spacebar');
            this.inputs.push('spacebar');
        });
    }


}
