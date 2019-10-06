const ServerPig = require('./ServerPig')

class ServerPlayer {
    constructor(socket) {
        this.pig = new ServerPig();
        this.id = socket.id;
    }
    update(delta){
        this.pig.update(delta);
    }
}
module.exports = ServerPlayer
