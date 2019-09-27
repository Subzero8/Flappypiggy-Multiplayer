class PipeSprite extends Container {
    constructor(pipe) {
        super();
        this.pipe = pipe
        this.topPart = new Sprite(textures.topPipe.texture);
        this.bottomPart = new Sprite(textures.bottomPipe.texture);

        //scales
        this.topPart.width = this.pipe.width;
        this.topPart.height = this.pipe.height;
        this.bottomPart.width = this.pipe.width;
        this.bottomPart.height = this.pipe.height;
        //positions
        this.topPart.y = this.pipe.topY
        this.bottomPart.y = this.pipe.bottomY
        this.x = pipe.x
        //addchild
        this.addChild(this.topPart);
        this.addChild(this.bottomPart);
    }
}
