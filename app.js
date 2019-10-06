const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const Match = require('./src/js/server/ServerMatch.js');
const port = process.env.PORT || 3000;

let sockets = [];
let availableSockets = [];
let matches = [];

app.get('/', (req, res) => res.sendFile(__dirname + '/src/index.html'));

app.use(express.static('src'));


io.on('connection', connectionHandler);

function connectionHandler(socket) {
    console.log('[Connected] -> ' + socket.id);
    sockets.push(socket);
    socket.emit('id', socket.id)
    if (notEmpty(availableSockets)) {
        let opponent = availableSockets.pop();
        printAvailableSocket(opponent);
        let match = new Match(socket, opponent)
        matches[socket.id] = match;
        matches[opponent.id] = match;

    } else {
        availableSockets.push(socket);
    }
    socket.on('disconnect', () => {
        if (matches[socket.id]) {
            matches[socket.id].stopLoop();
        }
        disconnectClient(socket)
    })

    socket.on('ready', () => {
        console.log('[Match Ready]')
        match.socket.emit('startMatch')
        match.opponent.emit('startMatch')
    })
    socket.on('gameOver', () => match.opponent.emit('won'))
}

http.listen(port, () => console.log(`Example app listening on port ${port}!`))

function disconnectClient(socket) {
    console.log('[Disconnected] -> ' + socket.id)
    sockets = sockets.filter(s => s != socket)
    availableSockets = availableSockets.filter(s => s != socket)
}

function printAllSockets() {
    console.log('Current connected sockets : ');
    sockets.forEach((value, i) => console.log("    %d. %s", i, value.id))
}

function printAvailableSocket(socket) {
    console.log('[Available] -> ' + socket.id);
    // availableSockets.forEach((value, i) => console.log("    %d. %s", i, value.id))
}

function notEmpty(array) {
    return array.length > 0;
}
