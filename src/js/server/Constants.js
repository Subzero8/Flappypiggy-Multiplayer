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
const PIG_MAX_SPEED = 10;
const PIPE_SPEED = -10;
//can't change
const SERVER_TICKRATE = 60;
const CLIENT_TICKRATE = 1;

const SERVER_TICK_DURATION = 1000 / SERVER_TICKRATE; //in ms
const CLIENT_TICK_DURATION = 1000 / CLIENT_TICKRATE; //in ms

module.exports = {
    PIG_HEIGHT,
    PIG_WIDTH,
    PIG_SPEED,
    PIPE_HEIGHT,
    PIPE_WIDTH,
    PIPE_SPEED,
    GAP_SIZE,
    GAME_HEIGHT,
    GAME_WIDTH,
    GRAVITY,
    SERVER_TICKRATE,
    CLIENT_TICKRATE,
    SERVER_TICK_DURATION,
    CLIENT_TICK_DURATION,
    PIPE_DISTANCE,
    PIG_MAX_SPEED
};
