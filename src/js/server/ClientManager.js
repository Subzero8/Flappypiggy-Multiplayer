const {
    CLIENT_TICKRATE
} = require('./Constants');

class ClientManager {
    constructor(match) {
        this.match = match;
        this.lastTickTime = Date.now();
    }

    notify(currentTime, delta) {
        this.sendState(currentTime);

    }

    sendState(currentTime) {
        if (currentTime - this.lastTickTime >= 1000 / CLIENT_TICKRATE) {
            this.match.sockets.forEach(socket => {
                socket.emit('updateState', this.match.state);
            })
            this.lastTickTime = currentTime;
        }
    }
}
module.exports = ClientManager;
