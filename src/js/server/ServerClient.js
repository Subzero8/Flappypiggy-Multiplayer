const ServerPig = require('./ServerPig');

class ServerClient {
    constructor(number) {
        this.pig = new ServerPig();
        this.number = number;
        this.sequenceNumber = -1;
    }
}
module.exports = ServerClient;
