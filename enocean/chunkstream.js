'use strict';

// DCGW uses self signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var EventEmitter = require('events').EventEmitter;

var DCStream = module.exports = function DCStream() {
  EventEmitter.call(this);
  return this;
};

DCStream.prototype = Object.create(EventEmitter.prototype);
DCStream.API_ENDPOINT = '/devices/stream?delimited=newLine&output=singleLine';

DCStream.prototype.start = function start(config) {
  var self = this;
  self.config = config;
  self.initStage = 1;
  self.chunks = '';

  var options = {
    method: 'GET',
    uri: config.host + ':' + config.port + DCStream.API_ENDPOINT,
    rejectUnauthorized : false,
    headers: {
      accept: '*/*'
    }
  };

  var request = require('request');
  //uri: 'http://172.28.28.150:8080/devices/stream?delimited=newLine&output=singleLine'
  var stream = request(options, function (error, response, body) {
      // body is the decompressed response body 
      if(!error && response !== undefined && response.statusCode == 200) {
        console.log('server encoded the data as: ' + (response.headers['content-encoding'] || 'identity'));
        console.log('the decoded data is: ' + body);
        console.log(response);
      } else {
        self.emit('error', '');
      }
  }).auth(config.user, config.password, false).on('data', function(data) {
      var CRLF_index = -1; 

      self.chunks += data.toString('utf8');

      // If true when packet has been received in chunks. (wait for nth packet in order to complete)
      if(CRLF_index = self.chunks.indexOf('\r\n')==-1)
        return;

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

      response.on('data', function(data) {
          // Also chunks received in here ?
      });
  });
  
  stream.on('error', function(err) {
      console.log(err);
      this.emit('error', err);
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
