const ServerPig = require('./ServerPig');

class ServerClient {
    constructor(number) {
        this.pig = new ServerPig();
        this.number = number;

        this.pings = [];
        this.ping = null;
    }


}

module.exports = ServerClient;
