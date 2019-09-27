const ServerPig = require('./ServerPig')

class ServerPlayer {
    constructor(socket) {
        this.pig = new ServerPig();
        this.id = socket.id;
    }
}
module.exports = ServerPlayer
