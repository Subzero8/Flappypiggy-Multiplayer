const {CLIENT_TICK_DURATION} = require('./Constants');

class ClientUpdateLoopObserver {
    constructor(match) {
        this.match = match;
        this.lastTickTime = Date.now();
    }

    notify(currentTime, delta) {
        this.sendState(currentTime);

    }

    sendState(currentTime) {
        if (currentTime - this.lastTickTime >= CLIENT_TICK_DURATION) {
            console.log(currentTime - this.lastTickTime);
            this.match.sockets.forEach(socket => {
                socket.emit('updateState', this.match.state);
            });

            this.lastTickTime = currentTime;
        }
    }
}

module.exports = ClientUpdateLoopObserver;
