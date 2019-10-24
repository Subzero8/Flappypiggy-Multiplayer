class Scene {
    constructor(app) {
        this.app = app;
        this.pigSprites = [];
        this.pipeSprites = [];
        this.pipeCounter = 0;
        this.initializeBackground();
        this.initializeScore();
        this.initializeAnnoncer();
        this.initializePingDisplay();
        this.initializeFPSDisplay();
    }

    updateScene(state) {
        this.updatePigs(state);
        this.updatePipes(state);
        this.deleteUnusedPipes(state);
    }

    deleteUnusedPipes(state) {
        this.pipeSprites.forEach(pipeSprite => {
            if (!state.pipes.some(pipe => pipe.number === pipeSprite.number)) {
                this.app.stage.removeChild(pipeSprite);
            }
        });
        this.pipeSprites = this.pipeSprites.filter(pipeSprite => state.pipes.some(pipe => pipe.number === pipeSprite.number))
    }

    updatePipes(state) {
        state.pipes.forEach(pipe => {
            let pipeSprite = this.pipeSprites.find(pipeSprite => pipeSprite.number === pipe.number);
            if (pipeSprite) {
                pipeSprite.position.set(pipe.x, pipeSprite.position.y);
                this.adjustPosition(pipeSprite);
                //console.log('pipeSprite.position.x', pipeSprite.position.x);
            } else {
                this.addPipeSprite(pipe)
            }
        })
    }

    updatePigs(state) {
        state.players.forEach(player => {
            let pigSprite = this.pigSprites[player.number];
            pigSprite.position.set(player.pig.x, player.pig.y);
            this.adjustPosition(pigSprite);
        })
    }


    addPipeSprite(pipe) {
        let pipeSprite = new PipeSprite(pipe);
        this.adjustPosition(pipeSprite);
        this.adjustScale(pipeSprite);
        this.pipeSprites.push(pipeSprite);
        this.app.stage.addChild(pipeSprite);
        // this.app.stage.removeChild(this.score);
        // this.app.stage.addChild(this.score);
    }

    adjustPosition(actor) {
        actor.position.set(actor.position.x * (this.app.renderer.width / this.app.renderer.resolution) / GAME_WIDTH,
            actor.position.y * (this.app.renderer.height / this.app.renderer.resolution) / GAME_HEIGHT);
    }

    initializeBackground() {
        this.background = new Sprite(textures.background.texture);
        this.background.width = this.app.renderer.width / this.app.renderer.resolution;
        this.background.height = 9 / 16 * this.background.width;
        this.app.stage.addChild(this.background);
    }

    initialize(state, playerNumber) {
        this.initializePigs(state, playerNumber);
    }

    initializePigs(state, playerNumber) {
        state.players.forEach(player => {
            let pigSprite = new PigSprite(player.pig, player.number);
            this.pigSprites[player.number] = pigSprite;
            this.app.stage.addChild(pigSprite);
            this.adjustPosition(pigSprite);
            this.adjustScale(pigSprite);
            if (pigSprite.number !== playerNumber) {
                pigSprite.alpha = 0.2;
            }
        })
    }

    adjustScale(actor) {
        actor.width = actor.width * this.app.renderer.width / this.app.renderer.resolution / GAME_WIDTH;
        actor.height = actor.height * this.app.renderer.height / this.app.renderer.resolution / GAME_HEIGHT
    }

    lose() {
        console.log('lost');
        this.displayMessage(this.annoncer, 'You lost');
    }

    win() {
        console.log('win');
        this.displayMessage(this.annoncer, 'You won');
    }


    initializeAnnoncer() {
        let style = new PIXI.TextStyle({
            fontFamily: "Futura",
            fontSize: 75 * this.app.renderer.width / this.app.renderer.resolution / GAME_WIDTH,
            fill: "white",
        });
        this.annoncer = new PIXI.Text("Looking for opponents...", style);
        this.annoncer.anchor.set(0.5, 0.5);
        this.annoncer.x = window.innerWidth / 2;
        this.annoncer.y = window.innerHeight * 0.1;
        this.app.stage.addChild(this.annoncer);
    }

    displayMessage(element, string) {
        element.text = string;
        this.app.stage.removeChild(element);
        this.app.stage.addChild(element);
    }

    initializeScore() {
        let style = new PIXI.TextStyle({
            fontFamily: "Futura",
            fontSize: 30 * this.app.renderer.width / this.app.renderer.resolution / GAME_WIDTH,
            fill: "white"
        });
        this.score = new PIXI.Text("Score : 0", style);
        this.score.x = window.innerWidth * 0.01;
        this.score.y = window.innerHeight * 0.01;
        this.app.stage.addChild(this.score);
    }

    updateScore() {
        this.pipeCounter++;
        this.displayMessage(this.score, "Score : " + this.pipeCounter)
    }

    initializePingDisplay() {
        let style = new PIXI.TextStyle({
            fontFamily: "Futura",
            fontSize: 30 * this.app.renderer.width / this.app.renderer.resolution / GAME_WIDTH,
            fill: "white"
        });
        this.ping = new PIXI.Text("Ping : 0", style);

        this.ping.x = window.innerWidth * 0.1;
        this.ping.y = window.innerHeight * 0.01;
        this.app.stage.addChild(this.ping);
    }

    initializeFPSDisplay() {
        let style = new PIXI.TextStyle({
            fontFamily: "Futura",
            fontSize: 30 * this.app.renderer.width / this.app.renderer.resolution / GAME_WIDTH,
            fill: "white"
        });
        this.fps = new PIXI.Text("FPS : 0", style);

        this.fps.x = window.innerWidth * 0.2;
        this.fps.y = window.innerHeight * 0.01;
        this.app.stage.addChild(this.fps);
    }

    setPing(value) {
        this.ping.text = "Ping : " + value;
    }

    setFPS(value) {
        this.fps.text = "FPS : " + Math.round(value);
    }
}
