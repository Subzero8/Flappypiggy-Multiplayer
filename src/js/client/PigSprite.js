class PigSprite extends Container {
    constructor(pig, number) {
        super();
        this.pig = pig;
        this.number = number;
        this.x = pig.x;
        this.y = pig.y;
        this.texture = new Sprite(textures.pig.texture);
        this.texture.width = this.pig.width;
        this.texture.height = this.pig.height;

        let style = new PIXI.TextStyle({
            fontFamily: "Futura",
            fontSize: 20,
            fill: "white",
        });
        this.playerNumber = new PIXI.Text('PLAYER ' + (this.number + 1), style);
        this.playerNumber.y = -50
        this.playerNumber.x = (this.pig.width - this.playerNumber.width)/2
        this.addChild(this.texture);
        this.addChild(this.playerNumber);

    }



}
