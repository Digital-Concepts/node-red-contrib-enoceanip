enoceanip
==============
A connection to Digital Concept's EnOcean Gateway will be accomplished. The Node-Red(r) module outputs events that occur on EnOcean radio. When edit screen is prompted, the node can be configured to connect on remote -or localhost either. For testing purposes a gateway has been made public. Please use dcgw.enocean-gateway.eu in the IP field in case you do not have any alternative.


#### Prerequisites
* node.js v0.10.41
* npm 1.4.29
* node-red 0.13.1

may run on other configurations as well.

* [Smart EnOcean Gateway](http://enocean-gateway.de/index.php/en)

#### How to install
Retrieve nod-red module through (http://npmjs.org).

1. Open terminal and go to your local Node-Red folder. 
    cd ~/.node-red 
2. Execute npm command to install node 
    npm install node-red-contrib-enoceanip
3. Restart Node-Red
4. Reload Node-Red Web UI
5. The node can be found in category "bridge" named EnOcean-IP

#### How to use
1. Drag and drop the EnOcean-IP node to your canvas
2. Configure connection settings to the Gateway's IP Address
3. After you deployed the node-red flow, the connection indicator should change to green - the connection has been established successfully.
4. Set up enocean devices via Gateway Webinterface
*http://<IP-Address-Of-Gateway>/dcgw/enocean/newdevice*
	(Note: If filter mode (*http://<IP-Address-Of-Gateway>/dcgw/admin/enoceanchip*) has been turned off, you will receive any event happening on enocean radio)
5. EnOcean-IP node can also send enocean telegrams. The payload you need to inject needs a syntax:

- send action to a device   
    send;deviceId=ABCDEF12;functionName1=functionValue1;functionName2=functionValue2
- get a list of devices
    devices
- get a system sytemInfo
    sytemInfo
- get a system version
    version

The function names with their interface specification can be retrieved through HTTP requests in a syntax:
*http://IP-ADDRESS-OF-GATEWAY:8080/devices/DEVICE-ID/profile*

Please visit the landing page for more detailed information about the JSON API.
*http://IP-ADDRESS-OF-GATEWAY:8080*


#### Author
Dominic Böhler | Digital Concepts | @boehlefeld