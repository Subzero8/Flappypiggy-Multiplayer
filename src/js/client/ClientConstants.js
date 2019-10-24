const PIG_HEIGHT = 75;
const PIG_WIDTH = PIG_HEIGHT * 14 / 9;
const PIPE_HEIGHT = 500;
const PIPE_WIDTH = 200;
const PIPE_DISTANCE = 700;
const GAP_SIZE = PIG_HEIGHT * 4;

const GAME_HEIGHT = 900;
const GAME_WIDTH = 1600;

const GRAVITY = 2;
const PIG_SPEED = -20;
const PIPE_SPEED = -10;
const PIG_MAX_SPEED = 10;
//can't change
const PHYSICS_TICKRATE = 60;
const CLIENT_TICKRATE = 1;

const PHYSICS_TICK_DURATION = 1000 / PHYSICS_TICKRATE; //in ms


//client constants
const RENDER_TICK_RATE = 60;
const RENDER_FRAME_TIME = 1000 / RENDER_TICK_RATE;//in ms

const PIG_DEVIATION_MARGIN = 20;
