const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const ServerController = require('./src/js/server/ServerController.js');
const port = process.env.PORT || 3000;
const PLAYERS_REQUIRED = 2;
let connectedSockets = [];
let lobbies = [];
let newLobby;
let clientLobbies = new Map();
let matches = new Map();

app.get('/', (req, res) => res.sendFile(__dirname + '/src/index.html'));

app.use(express.static('src'));

io.on('connection', connectionHandler);

function connectionHandler(socket) {
    console.log('[Connected] -> ' + socket.id);
    connectedSockets.push(socket);
    console.log('clientLobbies.size', clientLobbies.size);
    console.log('lobbies.length', lobbies.length);
    //No match created, creating one
    if (!lobbies.some(match => match.started === false)) {
        newLobby = {
            started: false,
            sockets: [],
            countdown: null
        };
        lobbies.push(newLobby);
    }

    newLobby.sockets.push(socket);
    console.log('newLobby.sockets.length', newLobby.sockets.length);
    clientLobbies.set(socket, newLobby);
    if (!newLobby.countdown) {
        for (let i = 0; i < newLobby.sockets.length; i++) {
            newLobby.sockets[i].emit('packet', {
                action: 'foundOpponent',
                nbPlayers: newLobby.sockets.length
            });
        }
    }

    if (newLobby.sockets.length === PLAYERS_REQUIRED) {
        startMatch(newLobby);
    }
    socket.on('disconnect', () => disconnectClient(socket));
}

http.listen(port, () => console.log(`Example app listening on port ${port}!`));

function startMatch(lobby) {
    let count = 5;
    lobby.countdown = setInterval(() => {
        console.log(count);
        if (count > 0) {
            for (let i = 0; i < lobby.sockets.length; i++) {
                lobby.sockets[i].emit('packet', {
                    action: 'starting',
                    count: count,
                    playersCount: lobby.sockets.length
                });
            }
        } else {
            console.log(lobby.sockets.length);
            let match = new ServerController(lobby.sockets);
            for (let i = 0; i < lobby.sockets.length; i++) {
                matches.set(lobby.sockets[i], match);
            }
            lobby.started = true;
            clearInterval(lobby.countdown);
        }
        count--;
    }, 1000)
}
function disconnectClient(socket) {
    console.log('[Disconnected] -> ' + socket.id);
    connectedSockets = connectedSockets.filter(s => s !== socket);

    let lobby = clientLobbies.get(socket);
    if (lobby) {
        lobby.sockets = lobby.sockets.filter(s => s !== socket);
        console.log(lobby.sockets.length);
        if (lobby.sockets.length < PLAYERS_REQUIRED) {
            clearInterval(lobby.countdown);
        }
    }
    let match = matches.get(socket);
    if (match) {
        match.stopLoops();
    }

    clientLobbies.delete(socket);
}

function printAllSockets() {
    console.log('Current connected sockets : ');
    connectedSockets.forEach((value, i) => console.log("    %d. %s", i, value.id))
}

function printAvailableSockets() {
    //console.log('[Available] -> ' + socket.id);
    availableSockets.forEach((value, i) => console.log("    %d. %s", i, value.id))
}


io.on('close', function () {
    console.log('CLOSED');
});
