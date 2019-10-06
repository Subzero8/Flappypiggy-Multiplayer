class Scene {
    constructor(app, socket) {
        this.socket = socket;
        this.app = app;
        this.pigs = {};
        this.pipes = [];
        //Config .on from server
        this.socket.on('id', i => id = i)
        this.socket.on('newMatch', state => {
            console.log("[Server] -> newMatch");
            scene.state = state;
            scene.new();
            scene.setAnnoncer('Match Found !');
        })
        this.socket.on('updateState', state => scene.updateStateFromServer(state));
        this.socket.on('won', () => scene.setAnnoncer('You Won !'));
        this.socket.on('lost', () => scene.setAnnoncer('You Lost !'));
        this.socket.on('countdown', count => scene.setAnnoncer(count));

        this.setBackground();
        this.setListeners();
        this.configScore();
        this.configAnnoncer();
    }

    updateStateFromServer(state) {
        state.players.forEach(player => {
            let clientPig = this.pigs[player.id];
            clientPig.position.set(player.pig.x, player.pig.y);
            this.adjustPosition(clientPig);
        })
        state.pipes.forEach(pipe => {
            let pipeSprite = this.pipes.find(pipeSprite => pipeSprite.pipe.number == pipe.number);
            if (pipeSprite) {
                pipeSprite.position.x = pipe.x;
                this.adjustPosition(pipeSprite);
            } else {
                this.addPipeSprite(pipe)
            }
        })
    }
    addPipeSprite(pipe) {
        console.log('addPipeSprite');
        let pipeSprite = new PipeSprite(pipe);
        this.adjustPosition(pipeSprite);
        this.adjustScale(pipeSprite);
        this.pipes.push(pipeSprite);
        this.app.stage.addChild(pipeSprite);
        // this.app.stage.removeChild(this.score);
        // this.app.stage.addChild(this.score);
    }

    adjustPosition(actor) {
        actor.position.set(actor.position.x * (this.app.renderer.width / this.app.renderer.resolution) / WIDTH,
            actor.position.y * (this.app.renderer.height / this.app.renderer.resolution) / HEIGHT);
    }

    setBackground() {
        this.background = new Sprite(textures.background.texture);
        this.background.width = this.app.renderer.width / this.app.renderer.resolution;
        this.background.height = 9 / 16 * this.background.width;
        this.app.stage.addChild(this.background);
    }
    setPigs() {
        this.state.players.forEach(player => {
            let pigSprite = new PigSprite(player.pig, player.id);
            this.pigs[player.id] = pigSprite;
            this.app.stage.addChild(pigSprite);
            this.adjustPosition(pigSprite);
            this.adjustScale(pigSprite);
            if (pigSprite.id !== id) {
                pigSprite.alpha = 0.5
            }
        })
    }
    adjustScale(actor) {
        actor.width = actor.width * this.app.renderer.width / this.app.renderer.resolution / WIDTH
        actor.height = actor.height * this.app.renderer.height / this.app.renderer.resolution / HEIGHT
    }

    new() {
        for (let i = 0; i < this.pipes.length; i++) {
            let pipe = this.pipes[i];
            this.app.stage.removeChild(pipe);
        }
        this.pipes = [];
        this.pipeCounter = 0;
        this.score.text = "Score : " + this.pipeCounter;
        this.setPigs();
    }
    lose() {
        console.log('lost');
        this.setAnnoncer('You lost');
    }
    win() {
        console.log('win');
        this.setAnnoncer('You won');
    }



    configAnnoncer() {
        let style = new PIXI.TextStyle({
            fontFamily: "Futura",
            fontSize: 60,
            fill: "white",
        });
        this.annoncer = new PIXI.Text("Waiting For Opponent", style);
        this.annoncer.x = window.innerWidth / 2 - this.annoncer.width / 2;
        this.annoncer.y = window.innerHeight * 0.1;
        this.app.stage.addChild(this.annoncer);
    }

    setAnnoncer(string) {
        this.annoncer.text = string;
        this.annoncer.x = window.innerWidth / 2 - this.annoncer.width / 2;
        this.app.stage.removeChild(this.annoncer);
        this.app.stage.addChild(this.annoncer);
    }

    configScore() {
        let style = new PIXI.TextStyle({
            fontFamily: "Futura",
            fontSize: 30,
            fill: "white"
        });
        this.score = new PIXI.Text("Score : 0", style);
        this.score.x = 25;
        this.score.y = 25;
        this.app.stage.addChild(this.score);
    }

    updateScore() {
        this.pipeCounter++;
        this.score.text = "Score : " + this.pipeCounter;
    }

    setListeners() {
        let space = this.keyboard(' ');
        space.press = () => {
            this.socket.emit('spacebar');
        };
        
        window.addEventListener('touchstart', () => {
            this.socket.emit('spacebar');
        });
    }

    keyboard(value) {
        let key = {};
        key.value = value;
        key.isDown = false;
        key.isUp = true;
        key.press = undefined;
        key.release = undefined;
        //The `downHandler`
        key.downHandler = event => {
            if (event.key === key.value) {
                if (key.isUp && key.press) key.press();
                key.isDown = true;
                key.isUp = false;
                event.preventDefault();
            }
        };

        //The `upHandler`
        key.upHandler = event => {
            if (event.key === key.value) {
                if (key.isDown && key.release) key.release();
                key.isDown = false;
                key.isUp = true;
                event.preventDefault();
            }
        };


        //Attach event listeners
        const downListener = key.downHandler.bind(key);
        const upListener = key.upHandler.bind(key);

        window.addEventListener("keydown", downListener, false);
        window.addEventListener("keyup", upListener, false);

        // Detach event listeners
        key.unsubscribe = () => {
            window.removeEventListener("keydown", downListener);
            window.removeEventListener("keyup", upListener);
        };

        return key;
    }
}
