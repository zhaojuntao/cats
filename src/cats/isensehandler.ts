// Load the TSWorker and handles the communication with the ISense web worker
// This implementation uses a JSON-RPC message format for the communication.

module Cats {

export class ISenseHandler {

    private worker;
    private messageId = 0;
    private registry = {};

    constructor() {
        // Lets create a new worker
        this.worker = new Worker("../lib/tsworker.js");
        this.init();
    }

    // Invoke a method on the Worker 
    perform(method:string, ...data:any[]) {
        var handler = data.pop();
        this.messageId++;
        var message = {
            id: this.messageId,
            method: method,
            params: data
        }
        this.worker.postMessage(message);
        // console.log("Send message " + message.method + ":"  + message.id + " to worker");
        if (handler) this.registry[this.messageId] = handler;
    }

    // Clear pending handlers.
    clear() {
        this.registry = {};
    }

    private init() {
        // Setup the message handler
        this.worker.onmessage = (e) => {
            var msg = e.data;
            // console.log("Received message " + JSON.stringify(msg) + " from worker");
            // console.log("Received message reply " + msg.id + " from worker.");
            if (msg.error) {
                console.error("Got error back !!! ");
                console.error(msg.error.stack);
            }
            var id = msg.id;
            if (id) {
                var handler = this.registry[id];
                if (handler) {
                    delete this.registry[id];
                    handler(msg.error, msg.result);
                }
            } else {
                console.log(msg);
            }
        };
    }

}

}