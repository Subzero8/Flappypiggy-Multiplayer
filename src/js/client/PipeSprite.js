class PipeSprite extends Container {
    constructor(pipe) {
        super();
        this.number = pipe.number;
        this.topPart = new Sprite(textures.topPipe.texture);
        this.bottomPart = new Sprite(textures.bottomPipe.texture);

        //scales
        this.topPart.width = pipe.width;
        this.topPart.height = pipe.height;
        this.bottomPart.width = pipe.width;
        this.bottomPart.height = pipe.height;
        //positions
        this.topPart.y = pipe.topY;
        this.bottomPart.y = pipe.bottomY;
        this.x = pipe.x;
        //addchild
        this.addChild(this.topPart);
        this.addChild(this.bottomPart);
    }
}
