var net = require('net');

module.exports = function(RED) {
    function SimpleApiNode(config) {
        RED.nodes.createNode(this, config);
        

        var mip = config.ip;
        var mport = config.port;
        var mpassword = config.password;
        var mconnected = false;
        var client = new net.Socket();

        var node = this;

        node.mpassword = config.password;
        
        client.connect(config.port, config.ip, function() {              
            node.status({fill: 'green', shape: "ring", text: "connected"});

            // send login phrase to DCGW
            client.write('login;password=' + node.mpassword + '\r\n');
        });

        client.on('data', function(data) {
            var msg = {}; 
            msg.payload = data.toString('utf8');

            node.send(msg);
        });

        client.on('close', function() {
            node.connected = false;
        	node.status({fill: 'red', shape: "ring", text: "disconnected"});
        });
        
        client.on('error', function(e) {
            node.connected = false;

            node.log("tcp client error: " + e.message);
            node.status({fill: 'red', shape: "ring", text: "disconnected"});
        });

        this.on('close', function() {
            node.connected = false;
            client.destroy();
        });

        this.on('input', function(msg) {
            client.write(msg.payload + '\r\n');
        });

    }
    RED.nodes.registerType("EnOcean-IP",SimpleApiNode);
}
