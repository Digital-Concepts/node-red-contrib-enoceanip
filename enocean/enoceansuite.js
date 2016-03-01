'use strict';

var APIConnection = require('./apiconnection.js');

module.exports = function(RED) {

    function EnOceanGW(config){
        RED.nodes.createNode(this, config);     
        var node = this;

        this.host = config.host;
        this.port = config.port;
        this.user = config.user;
        this.password = config.password;
        this.direction = config.direction;

        var gwcon = new APIConnection(config);
        RED.httpAdmin.get('/devices', function(req, res){
            console.log("API CALL with");
            node.req = req;
            node.res = res;

            gwcon.doRequest('devices', res);
        });

        gwcon.on('getanswer', function(response){
            // send back HTTP result of /devices
            node.res.send(response.devices);
        });
    }
    RED.nodes.registerType("enocean gw",EnOceanGW);

    // Send state node
    function EnOceanOutNode(config){
        RED.nodes.createNode(this, config);
        var node = this;

        // Retrieve the configuration gw node
        this.gw = RED.nodes.getNode(config.gw);

        var gwcon = new APIConnection(this.gw);
        this.config = config;

        gwcon.on('error', function(e){
            node.error("Network error: " + JSON.stringify(e));
            //node.status({fill: 'red', shape: "ring", text: "disconnected"});
        });
//TODO: implement sent successfull
//        gwcon.on('successfullsent')

        /*NODE-RED events*/
        this.on('input', function(msg) {     

            // Check type and convert if neccessary
            if (typeof msg === 'string' || msg instanceof String){
                try {
                    msg = JSON.parse(msg);
                } catch(e) {
                    node.error('API Input Error: The input has no JSON format');
                    return;
                }
            }

            // simple validity check
            if( msg.payload.deviceId === undefined ||
                msg.payload.state === undefined   ||
                msg.payload.state.functions === undefined
                ){
                node.error('API Input Error', {'error0x02' : 'API Syntax: msg.payload = {  "deviceId":"01870183", "state":{  "functions":[ {   "key":"dimValue",  "value":"1.0" } ] } }'});
            } else {
                gwcon.putRequest(msg);
            }
        });
    }
    RED.nodes.registerType("enocean out",EnOceanOutNode);

    // Streaming API node
    function EnOceanInNode(config) {
        RED.nodes.createNode(this, config);

        // Retrieve the configuration gw node
        this.gw = RED.nodes.getNode(config.gw);


        var node = this;
        node.gwcon = new APIConnection(this.gw);
        node.config = config;

        node.gwcon.on('getanswer', function(answer){
            node.send(answer);
        });

        this.on('input', function(msg) {  
            if(msg.payload.get !== undefined){
                switch(msg.payload.get.toLowerCase()){
                    case 'devices':
                    case 'profiles':
                    case 'systemInfo':
                        gwcon.getRequest(msg.payload.get);
                        break;
                    default:
                        node.error('API Input Error', {'error0x03':'API Syntax: msg.payload = { "get" : "COMMAND_NAME"}'});
                        break;
                }   
            }
        });

        node.gwcon.on('connected', function(){
            node.status({fill: 'green', shape: "ring", text: "connected"});
        });

        node.gwcon.on('states', function(json){
            if(node.config.statesflag){
                var msg = {};
                msg.payload = json;
                node.send(msg);
            }
        });      

        node.gwcon.on('telegram', function(json){

            // if filter set (devices = [deviceId1, deviceId2])
            //if(node.devices.length === 0 || node.config.devices.indexOf(json.telegram.deviceId)!==-1){
                var msg = {};
                msg.payload = json;
                node.send(msg);
            //}
        }); 

        node.gwcon.on('error', function(e){
            node.error("Network error: " + e);
            node.status({fill: 'red', shape: "ring", text: "disconnected"});
        });

        node.status({fill: 'yellow', shape: "ring", text: "connecting"});

        /*NODE-RED events*/
        this.on('close', function() {
            if(node.gwcon){
                node.gwcon.closeStream();
            }
        });

        var filter = { direction: config.direction};
        node.gwcon.startstream(filter);
    }
    RED.nodes.registerType("enocean in",EnOceanInNode);

    // Function gw request state node
    function EnOceanGWRequest(config){
        RED.nodes.createNode(this, config);
        var node = this;

        // Retrieve the configuration gw node
        this.gw = RED.nodes.getNode(config.gw);

        var gwcon = new APIConnection(this.gw);
        this.config = config;

        gwcon.on('error', function(e){
            node.error("Network error: " + JSON.stringify(e));
        });

        /*NODE-RED events*/
        this.on('input', function(msg) {     

            // Check type and convert if neccessary
            if (typeof msg === 'string' || msg instanceof String){
                try {
                    msg = JSON.parse(msg);
                } catch(e) {
                    node.error('API Input Error: The input has no JSON format');
                    return;
                }
            }

            // simple validity check
            if( msg.payload.deviceId === undefined ||
                msg.payload.state === undefined   ||
                msg.payload.state.functions === undefined
                ){
                node.error('API Input Error', {'error0x02' : 'API Syntax: msg.payload = {  "deviceId":"01870183", "state":{  "functions":[ {   "key":"dimValue",  "value":"1.0" } ] } }'});
            } else {
                gwcon.putRequest(msg);
            }
        });
    }
    RED.nodes.registerType("enocean gwrequest",EnOceanGWRequest);
};