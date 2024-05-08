
'use strict';

// Allow HTTPS communication with servers that use self signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const fetch = require('node-fetch');
var EventEmitter = require('events').EventEmitter;
var request = require('request').defaults({
  pool: {maxSockets: Infinity}
});
global.handleError = false;

var APIConnection = module.exports = function APIConnection(mconfig, mcredentials) {
    EventEmitter.call(this);
    var config = mconfig;
    var credentials = mcredentials;
    var stream;
    var filter;

    this.getBaseURL = function() {
        return config.host + ':' + config.port;
    };

    this.getCredentials = function() {
        return credentials;
    };

    this.getStream = function() {
        return stream;
    };

    this.setStream = function(pstream) {
        stream = pstream;
    };

    this.getStreamFilter = function() {
        return filter;
    };

    this.setStreamFilter = function(pfilter) {
        filter = pfilter;
    };

    return this;
};

APIConnection.prototype = Object.create(EventEmitter.prototype);
APIConnection.API_STREAM = '/devices/stream?delimited=newLine&output=singleLine';
APIConnection.API_PROFILES = 'profiles';
APIConnection.API_STATES = 'states';

APIConnection.prototype.apiHandler = function apiHandler(msg) {

    if (msg.items !== undefined) {
        // to deal with N-Requests
        var self = this;

        msg.items.forEach(function(entry) {
            var path;

            // Construct URL path
            if (msg.resource === APIConnection.API_STATES) {
                path = '/devices/' + entry + '/state';
            } else if (msg.resource === APIConnection.API_PROFILES) {
                path = '/devices/' + entry + '/profile';
            } else {
                path = '/' + msg.resource + '/' + entry;
            }

            // Check which HTTP method needs to be applied 
            if (msg.state === undefined) {
                self.doRequest(path, 'GET');
            } else {
                self.doRequest(path, 'PUT', {
                    'state': msg.state
                });
            }
        });
    } else {
        // Single request
        this.doRequest('/' + msg.resource, 'GET');
    }
};

APIConnection.prototype.doRequest = function doRequest(path, method, payload) {
    var self = this;
    var url = this.getBaseURL() + path;

    try {
        request({
                url: url,
                method: method,
                body: JSON.stringify(payload),
                headers: {
                    accept: '*/*'
                }
            },
            function(error, response, body) {
                if (!error && response.statusCode === 200) {
                    self.emit('getanswer', JSON.parse(body));
                } else if (!error && response.statusCode === 202) {
                    self.emit('sentMessageLater', JSON.parse(body));
                }  else if (!error && response.statusCode !== 200) {
                    self.emit('error', response.statusCode + ":" + body);
                } else {
                    self.emit('error', error);
                }
            }).auth(this.getCredentials().username, this.getCredentials().password, false);
    } catch (e) {
        self.emit('error', 'Unknown HTTP error: ' + e);
    }
};

APIConnection.prototype.startstream = function startstream(filter) {
    var self = this;
    self.initStage = 1;
    self.chunks = '';

    self.setStreamFilter(filter);

    var options = {
        method: 'GET',
        uri: self.getBaseURL() + APIConnection.API_STREAM + '&direction=' + filter.direction + '&duplicates=true' + '&levelOfDetail=' + filter.levelOfDetail, 
        rejectUnauthorized: false,
        headers: {
            accept: '*/*'
        }
    };
    //Wait 5 seconds to not trigger reconnect too soon on deploy.
    setTimeout(() => {
        handleError = true;
    }, 5000);  

    self.stream = request(options, function(error, response, body) {
        if (!error && response !== undefined && response.statusCode === 200) {
            // successfull connected to stream
        } else {
            if (handleError) {
                self.emit('error', "Error while establishing stream:  " + error);
            }
           
        }
    }).auth(this.getCredentials().username, this.getCredentials().password, false).on('data', function(data) {
        self.chunks += data.toString('utf8');

        // If true when packet has been received in chunks. (wait for nth packet in order to complete)
        if (self.chunks.indexOf('\r\n') === -1) {
            return;
        }

        /* Stages:
        1 - while states not finished
        0 - while telegram not finished
        */
        switch (self.initStage) {
            case 1: // Send states information
                self.initStage--;

                try {
                    self.emit('states', JSON.parse(self.chunks));
                } catch (e) {
                    self.emit('error', 'Error while parsing JSON in state transmission');
                }
                break;
            case 0: // Send telegram information (without states)

                try {
                    self.emit('telegram', JSON.parse(self.chunks));
                } catch (e) {
                    self.emit('error', 'Error while parsing JSON in telegram transmission');
                }
                break;
            default:
                break;
        }

        // get ready for next chunked transmission
        self.chunks = '';
    });

    self.stream.on('response', function(response) {
        // executed once
        self.emit('connected');

        /*
        response.on('data', function(data) {
            // Also chunks received in here ?
        });
        */
    });


    //If handleError is set to true and an error is triggered it will attempt to reconnect the stream
    self.stream.on('error', function(err) {
        if (handleError) {
            self.emit('error', 'Error during streaming: ' + err);
            self.reconnect();
        }
    });
    this.setStream(self.stream);
};


APIConnection.prototype.closeStream = function closeStream() {
    console.log("Attempting to close stream...");
    if (this.getStream()) {
        this.getStream().abort();
        console.log("Stream aborted.");
    } else {
        console.log("No stream available to abort.");
    }
};

APIConnection.prototype.reconnect = function reconnect() {
    var self = this;
    self.emit('warn', 'Reconnect stream connection in 5 seconds');
    this.closeStream();
    console.log("going through the reconnect");
    // delay reconnect by 5 seconds
    setTimeout(function() {
        self.startstream(self.getStreamFilter());
    }, 5000);
};