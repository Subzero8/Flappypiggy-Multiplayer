class PigSprite extends Container {
    constructor(clientPig, number) {
        super();
        this.number = number;
        this.x = clientPig.x;
        this.y = clientPig.y;

        this.texture = new Sprite(textures.pig.texture);
        this.texture.width = clientPig.width;
        this.texture.height = clientPig.height;

        let style = new PIXI.TextStyle({
            fontFamily: "Futura",
            fontSize: 20,
            fill: "white",
        });
        this.playerNumber = new PIXI.Text('PLAYER ' + (this.number + 1), style);
        this.playerNumber.y = -50;
        this.playerNumber.x = (clientPig.width - this.playerNumber.width) / 2;
        this.addChild(this.texture);
        this.addChild(this.playerNumber);
    }
}
