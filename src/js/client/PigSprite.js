class PigSprite extends Container {
    constructor(pig, id) {
        super();
        this.pig = pig;
        this.id = id;
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
        this.playerId = new PIXI.Text(this.id, style);
        this.playerId.y = -50

        this.addChild(this.texture);
        this.addChild(this.playerId);

    }



}
