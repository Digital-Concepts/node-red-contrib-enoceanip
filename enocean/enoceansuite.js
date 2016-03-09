
'use strict';

var createSchema = require('json-gate').createSchema;
var APIConnection = require('./apiconnection.js');
var apiSchema = createSchema(require('./resources/apischema.json'));


module.exports = function(RED) {

    // Configuration node
    function EnOceanGW(n) {
        RED.nodes.createNode(this, n);
        var self = this;
        var gwcon = new APIConnection(n, this.credentials);
        this.config = n;

        // This endpoint is needed for same origin policy (cross domain protection)
        RED.httpAdmin.get('/devices', function(req, res) {
            self.req = req;
            self.res = res;

            gwcon.apiHandler({
                'resource': 'devices'
            });
        });

        gwcon.on('getanswer', function(response) {
            self.res.send(response.devices);
        });
    }
    RED.nodes.registerType("enocean gw", EnOceanGW, {
        credentials: {
            username: {
                type: "text"
            },
            password: {
                type: "password"
            }
        }
    });

    // Input / Output node
    function EnOceanOutNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
        this.config = n;

        // Retrieve the configuration gw node
        this.gw = RED.nodes.getNode(n.gw);

        // check whether a configuration (EnOceanGW()) was set
        if (!this.gw || this.gw === null) {
            node.status({
                fill: 'yellow',
                shape: "ring",
                text: "No API-Conf set"
            });
            return;
        }

        var gwcon = new APIConnection(this.gw.config, this.gw.credentials);

        var errorFunction = function(e) {
            node.error("Error: " + e);
            node.status({
                fill: 'red',
                shape: "ring",
                text: "message not sent"
            });
        };

        gwcon.on('error', errorFunction);

        gwcon.on('getanswer', function(response) {
            if (node.config.outputs === 1) {
                var msg = {
                    payload: response
                };
                node.send(msg);
            }
            node.status({
                fill: 'green',
                shape: "ring",
                text: "message sent"
            });
        });

        /*NODE-RED events*/
        this.on('input', function(msg) {

            // Check type and convert if neccessary
            if (typeof msg === 'string' || msg instanceof String) {
                try {
                    msg = JSON.parse(msg);
                } catch (e) {
                    node.error('API Input Error: The input has no JSON format');
                    return;
                }
            }

            try {
                // validate against predefined schema (in resources/apischema.json)
                apiSchema.validate(msg.payload);
                gwcon.apiHandler(msg.payload);
            } catch (err) {
                console.log("Schema check failed: " + err.message);
                errorFunction(err.message);
            }
        });

    }
    RED.nodes.registerType("enocean out", EnOceanOutNode);

    // Input node (Streaming)
    function EnOceanInNode(n) {
        RED.nodes.createNode(this, n);

        var node = this;

        // Retrieve the configuration gw node
        this.gw = RED.nodes.getNode(n.gw);

        // check whether a configuration (EnOceanGW()) was set
        if (!this.gw || this.gw === null) {
            node.status({
                fill: 'yellow',
                shape: "ring",
                text: "No API-Conf set"
            });
            return;
        }

        node.gwcon = new APIConnection(this.gw.config, this.gw.credentials);
        node.config = n;

        node.gwcon.on('getanswer', function(answer) {
            node.send(answer);
        });

        node.gwcon.on('connected', function() {
            node.status({
                fill: 'green',
                shape: "ring",
                text: "connected"
            });
        });

        node.gwcon.on('states', function(json) {
            if (node.config.statesflag) {
                var msg = {};
                msg.payload = json;
                node.send(msg);
            }
        });

        node.gwcon.on('telegram', function(json) {

            // if filter set (devices = [deviceId1, deviceId2])
            if (!node.config.devices || node.config.device === null || node.config.devices.indexOf(json.telegram.deviceId) !== -1) {
                var msg = {};
                msg.payload = json;
                node.send(msg);
            }
        });

        node.gwcon.on('error', function(e) {
            node.error("Network error: " + e);
            node.status({
                fill: 'red',
                shape: "ring",
                text: "disconnected"
            });
        });

        node.status({
            fill: 'yellow',
            shape: "ring",
            text: "connecting"
        });

        /*NODE-RED events*/
        this.on('close', function() {
            node.gwcon.closeStream();
        });

        var filter = {
            direction: n.direction
        };
        node.gwcon.startstream(filter);
    }
    RED.nodes.registerType("enocean in", EnOceanInNode);

};