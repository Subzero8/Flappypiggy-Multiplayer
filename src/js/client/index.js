let textures;
//Aliases
let Application = PIXI.Application,
    Container = PIXI.Container,
    Sprite = PIXI.Sprite;

let app = new Application({
    antialias: true,
    transparent: false,
    resolution: 2,
    backgroundColor: 0x3B7A57
});
document.body.appendChild(app.view);
app.renderer.view.style.position = "absolute";
app.renderer.view.style.display = "block";
app.renderer.autoDensity = true;
app.renderer.resize(window.innerWidth, 9/16*window.innerWidth);

const loader = new PIXI.Loader();
loader.add('pig', '/images/pig.png')
    .add('topPipe', '/images/topPipeTexture.png')
    .add('bottomPipe', '/images/bottomPipeTexture.png')
    .add('background', '/images/background.png');

loader.load((loader, resources) => {
    textures = resources;
});

loader.onComplete.add(() => {
    console.log('[Loader] -> Complete');
    let socket = io();
    let scene = new Scene(app);
    let match = new ClientController(scene, socket);

});
