class Scene {
    constructor(app) {
        this.app = app;
        this.pigSprites = [];
        this.pipeSprites = [];
        this.pipeCounter = 0;

        this.initializeBackground();
        this.initializeScore();
        this.initializeAnnoncer();
    }

    updateScene(state) {
        this.updatePigs(state);
        this.updatePipes(state);
        this.deleteUnusedPipes(state);

    }

    deleteUnusedPipes(state) {
        this.pipeSprites.forEach(pipeSprite => {
            if (!state.pipes.some(pipe => pipe.number == pipeSprite.number)) {
                this.app.stage.removeChild(pipeSprite);
            }
        })
        this.pipeSprites = this.pipeSprites.filter(pipeSprite => state.pipes.some(pipe => pipe.number == pipeSprite.number))
    }

    updatePipes(state) {
        state.pipes.forEach(pipe => {
            let pipeSprite = this.pipeSprites.find(pipeSprite => pipeSprite.number == pipe.number);
            if (pipeSprite) {
                pipeSprite.position.x = pipe.x;
                this.adjustPosition(pipeSprite);
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
                pigSprite.alpha = 0.5
            }
        })
    }

    adjustScale(actor) {
        actor.width = actor.width * this.app.renderer.width / this.app.renderer.resolution / GAME_WIDTH
        actor.height = actor.height * this.app.renderer.height / this.app.renderer.resolution / GAME_HEIGHT
    }

    lose() {
        console.log('lost');
        this.setAnnoncer('You lost');
    }
    win() {
        console.log('win');
        this.setAnnoncer('You won');
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
        this.score.position.set(25,25);
        this.app.stage.addChild(this.score);
    }

    updateScore() {
        this.pipeCounter++;
        this.displayMessage(this.score, "Score : " + this.pipeCounter)
    }
}
