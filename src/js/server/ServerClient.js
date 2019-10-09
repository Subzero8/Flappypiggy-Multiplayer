const ServerPig = require('./ServerPig')

class ServerClient {
    constructor(number) {
        this.pig = new ServerPig();
        this.number = number;
        this.lastSequenceNumberProcessed = -1;
    }
    update(delta){
        this.pig.update(delta);
    }
}
module.exports = ServerClient
