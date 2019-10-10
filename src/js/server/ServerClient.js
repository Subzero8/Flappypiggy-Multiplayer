const ServerPig = require('./ServerPig')

class ServerClient {
    constructor(number) {
        this.pig = new ServerPig();
        this.number = number;
    }
    update(delta){
        this.pig.update(delta);
    }
}
module.exports = ServerClient
