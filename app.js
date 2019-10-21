const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const ServerController = require('./src/js/server/ServerController.js');
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
    if (notEmpty(availableSockets)) {
        let opponentSocket = availableSockets.pop();
        // printAvailableSocket(opponentSocket);
        let sockets = [socket, opponentSocket];
        let match = new ServerController(sockets);
        matches[socket.id] = match;
        matches[opponentSocket.id] = match;

    } else {
        availableSockets.push(socket);
    }
    socket.on('disconnect', () => {
        if (matches[socket.id]) {
            matches[socket.id].stopLoop();
        }
        disconnectClient(socket)
    });
    //socket.on('gameOver', () => match.opponent.emit('won'))
}

http.listen(port, () => console.log(`Example app listening on port ${port}!`));

function disconnectClient(socket) {
    console.log('[Disconnected] -> ' + socket.id);
    sockets = sockets.filter(s => s != socket);
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
