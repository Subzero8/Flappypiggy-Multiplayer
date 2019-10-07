const PIG_HEIGHT = 75;
const PIG_WIDTH = PIG_HEIGHT * 14 / 9;

const PIPE_HEIGHT = 500;
const PIPE_WIDTH = 200;
const PIPE_DISTANCE = 700;
const PIPE_SPEED = -650;
const GAP_SIZE = PIG_HEIGHT * 4;

const GAME_HEIGHT = 900;
const GAME_WIDTH = 1600;

const GRAVITY = 3000;
const PIG_SPEED = -800;
//can't change
const SERVER_TICKRATE = 60;
const CLIENT_TICKRATE = 60;

const SERVER_TICK_DURATION = 1 / SERVER_TICKRATE; //in seconds

//client constants
const UPDATE_TICK_RATE = 60;
const UPDATE_FRAME_TIME = 1000 / UPDATE_TICK_RATE;//in ms
