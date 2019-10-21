const ServerPig = require('./ServerPig');

class ServerClient {
    constructor(number) {
        this.pig = new ServerPig();
        this.number = number;
        this.sequenceNumber = -1;
    }

    copy(){
        let copy = new ServerClient(this.number);
        copy.pig = this.pig.copy();
        copy.sequenceNumber = this.sequenceNumber;
        return copy;
    }


}

module.exports = ServerClient;
