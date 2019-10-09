class RequestsManager {
    constructor(clientController) {
        this.inputs = [];
        this.packetsHistory = [];
        this.sequenceNumber = 0;
        this.clientController = clientController;
    }

    sendInputs(){
        if (this.inputs.length > 0) {
            let packet = {
                sequenceNumber: this.sequenceNumber,
                action: 'input',
                data: this.inputs
            }
            this.packetsHistory.push(packet);
            this.clientController.socket.emit('packet', packet);
            this.inputs = [];
            this.sequenceNumber++;
        }
    }

    addInput(input){
        this.inputs.push(input);
    }
}
