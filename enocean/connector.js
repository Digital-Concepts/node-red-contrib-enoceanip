'use strict';

var request = require('request');
var chunkstream = require('./chunkstream.js');

module.exports = function(RED) {
    function ConnectorNode(config) {
        RED.nodes.createNode(this, config);

        var node = this;
        var stream = new chunkstream();
        this.config = config;

        stream.on('connected', function(){
            node.status({fill: 'green', shape: "ring", text: "connected"});
        });

        stream.on('states', function(json){
            var msg = {};
            msg.payload = json;
            node.send(msg);
        });      

        stream.on('telegram', function(json){
            var msg = {};
            msg.payload = json;
            node.send(msg);
        }); 

        stream.on('error', function(e){
            node.error("Network error: " + e);
            node.status({fill: 'red', shape: "ring", text: "disconnected"});
        });

        node.status({fill: 'yellow', shape: "ring", text: "connecting"});

        

        /*NODE-RED*/
        this.on('close', function() {
            // TODO: implement close function
        });

        this.on('input', function(msg) {     
            /*msg.payload should like:
            {
              "state" : {
                "functions" : [ 
                {
                  "key" : "",
                  "value" : "0"
                }
               ]
              } 
            }*/
            try {

                // simple validity check
                if( msg.payload.deviceId === undefined ||
                    msg.payload.state === undefined   ||
                    msg.payload.state.functions === undefined
                  ){
                        node.error('API Input Error', {'error0x02' : 'API Syntax: msg.payload = {  "deviceId":"FFFFFFFF", "state":{  "functions":[ {   "key":"NAME",  "value":"VALUE" } ] } }'});
                    return;
                }

                var deviceId = msg.payload.deviceId;
                delete msg.payload.deviceId;

                request({   
                        url: config.host + ':' + config.port + '/devices/' + deviceId + '/state', 
                        method: 'PUT', 
                        json: msg.payload
                    },  
                    function (error, response, body) {
                        var msg = {};
                        msg.error = error;
                        msg.response = response;
                        msg.body = body;
                        
                        console.log(body);
                        if (!error && response.statusCode === 200) {
                            // HOW TO HANDLE GOOD FEEDBACK ?
                        } else {
                            node.error('EnOcean API Input Error', {'error0x01' : body});
                        }
                }).auth(config.user, config.password, false);
            } catch (e){
                 node.error('HTTP error', { "error0xFF" : "unknown" });
            }
        });

        stream.start(config);
    }

    RED.nodes.registerType("EnOcean-IP",ConnectorNode);
};
