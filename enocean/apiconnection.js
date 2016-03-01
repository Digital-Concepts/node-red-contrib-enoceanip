'use strict';

// DCGW uses self signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var EventEmitter = require('events').EventEmitter;
var request = require('request');

var APIConnection = module.exports = function APIConnection(mconfig) {
  EventEmitter.call(this);
  var config = mconfig;

  console.log("APIConnection()" + mconfig);
  console.log("APIConnection().host:" + mconfig.host);

  this.getConfig = function() {
        console.log("getConfig" + JSON.stringify(config));

        return config;
  };

  return this;
};

APIConnection.prototype = Object.create(EventEmitter.prototype);
APIConnection.API_STREAM     = '/devices/stream?delimited=newLine&output=singleLine';
APIConnection.API_SYSTEMINFO = '/systemInfo';
APIConnection.API_DEVICES    = '/devices';
APIConnection.API_PROFILES   = '/profiles';

APIConnection.prototype.doRequest = function doRequest(endpoint){
  var self = this;
  var url = this.getConfig().host + ':' + this.getConfig().port;

  switch(endpoint.toLowerCase()){
    case 'devices':
      url += APIConnection.API_DEVICES;
      break;
    case 'profiles':
      url += APIConnection.API_PROFILES;
      break;
    case 'systeminfo':
      url += APIConnection.API_SYSTEMINFO;
      break;
  }

  try {
      request({   
          url: url, 
          method: 'GET'
      },  
      function (error, response, body) {
          if (!error && response.statusCode === 200) {
              self.emit('getanswer', JSON.parse(body));
          } else {
              self.emit('error', 'EnOcean API Input Error', {'error0x01' : body});
          }
      }).auth(this.getConfig().user, this.getConfig().password, false);
  } catch (e){
     self.emit('error','HTTP error', { "error0xFF" : "unknown" });
  }
};

APIConnection.prototype.putRequest = function putRequest(msg){
    var self = this;
    try {
  
      var deviceId = msg.payload.deviceId;
      delete msg.payload.deviceId;



      request({   
          url: this.getConfig().host + ':' + this.getConfig().port + '/devices/' + deviceId + '/state', 
          method: 'PUT', 
          json: msg.payload
      },  
      function (error, response, body) {
          var msg = {};
          msg.body = body;

          if (!error && response.statusCode === 200) {
            // HOW TO HANDLE GOOD FEEDBACK ?
          } else {
              self.emit('error', 'EnOcean API Input Error', {'error0x01' : body});
          }
      }).auth(this.getConfig().user, this.getConfig().password, false);
    } catch (e){
        console.log(JSON.stringify(e));
        this.emit('error','HTTP error', { "error0xFF" : "unknown" });
    }
};

APIConnection.prototype.startstream = function startstream(filter) {
  var self = this;
  self.initStage = 1;
  self.chunks = '';

  console.log("startstream:this.getConfig().host:" + this.getConfig().host);

  var options = {
    method: 'GET',
    uri: this.getConfig().host + ':' + this.getConfig().port + APIConnection.API_STREAM + '&direction=' + filter.direction,
    rejectUnauthorized : false,
    headers: {
      accept: '*/*'
    }
  };

  console.log(JSON.stringify(options));

  //uri: 'http://172.28.28.150:8080/devices/stream?delimited=newLine&output=singleLine'
  var stream = request(options, function (error, response, body) {
      // body is the decompressed response body 
      if(!error && response !== undefined && response.statusCode === 200) {
        console.log('server encoded the data as: ' + (response.headers['content-encoding'] || 'identity'));
        console.log('the decoded data is: ' + body);
        console.log(response);
      } else {
        self.emit('error','Streaming error', { "error0x05" : error });
      }
  }).auth(this.getConfig().user, this.getConfig().password, false).on('data', function(data) {
      self.chunks += data.toString('utf8');

      // If true when packet has been received in chunks. (wait for nth packet in order to complete)
      if(self.chunks.indexOf('\r\n')===-1){
        return;
      }

      /* Stages:
      1 - while states not finished
      0 - while telegram not finished
      */
      switch(self.initStage){
          case 1: // Send states information
              self.initStage--;

              try{
                  self.emit('states', JSON.parse(self.chunks));
              }catch(e){
                  self.emit('error','Error while parsing JSON in STAGE1, state transmission');
              }
              break;
          case 0: // Send telegram information (without states)

              try{
                  self.emit('telegram', JSON.parse(self.chunks));
              }catch(e){
                  self.emit('error','Error while parsing JSON in STAGE0, telegram transmission');
              }
              break;
          default:
              break;
      }

      // get ready for next chunked transmission
      self.chunks = '';
  });

  stream.on('response', function(response) {
      // executed once
      self.emit('connected');

      /*
      response.on('data', function(data) {
          // Also chunks received in here ?
      });
      */
  });
  
  stream.on('error', function(err) {
      console.log(err);
      this.emit('error','Stream error', { "error0x06" : err });
  });


  stream.on("close", function() {
      // TODO: implement close function.
  });

  stream.on("end", function() {
      // won't happen - neverending stream
  });
};


/*//local test
var streamer = new DCStream();
streamer.start({  'password'  : 'user',
                  'user'      : 'user',
                  'host'      : 'https://172.28.28.150',
                  'port'      : '8080'
});

streamer.on('telegram', function(msg) {
  console.log("telegram:" + msg);
});



streamer.on('states', function(msg) {
  console.log("states:" + msg);
});
*/
