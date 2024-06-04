# enoceanip

I/O nodes for Node-RED to communicate with EnOcean REST API. This API comes along with a certain software bundle containing neccessary translation of Enocean serial protocol, administration and learn in functionality of Enocean devices. Once configured and connected to EnOcean REST API, Node-RED is kept informed continously by receiving JSON messages including Enocean telegrams that have been occured on Enocean radio. 

Enoceanip covers two nodes that seperate incoming and outgoing communication to EnOcean REST API. A configuration node will organize several API credentials and held them safe of being exported. 

![Image of enoceanip sample](https://cloud.githubusercontent.com/assets/4750288/13598703/a02150f2-e51f-11e5-9a36-10d86632e7da.png)


### Prerequisites
* node.js v0.10.41
* npm 1.4.29
* Node-RED 0.13.1 

may run on different set up as well
* [EnOcean REST API - running on Smart EnOcean Gateway](http://enocean-gateway.eu/en/product/) - Install hardware in your local network

or
* [EnOcean REST API - DIY (coming soon)](http://enocean-gateway.eu/en/product/) - Install software and attach EnOcean adapter on your own. (e.g. USB300 or TCM310)


### How to install
This process describes how to retrieve and integrate enoceanip in Node-RED (http://npmjs.org).

- Install via Node-Red-Ui (recommended)
- Manual installation:
1. Open terminal and go to your local Node-RED folder. 
e.g. `cd ~/.node-red` 
2. Execute npm command to install node 
`npm install node-red-contrib-enoceanip-dcnext`
3. Restart Node-RED
4. Reload Node-RED Web UI
5. Find "enocean" nodes underneath categories Input and Output

### What to configure
1. Drag and drop the enocean nodes to your canvas
2. Configure API related settings. Open an enocean node edit screen and create or select an API connection. They can be managed via Node-RED `menu->view->configuration` sidebar.
3. After deploying Node-RED flow, status indicator should change
4. Configure/learn in enocean devices via software bundles Webinterface
*http://Hostname-Of-API/dcgw/enocean/newdevice*
<br>(Note: If `filtermode` (*http://Hostname-Of-API/dcgw/admin/enoceanchip*) has been turned off, you will receive any event happening on enocean radio)

### Public gateway / debug

<p>For testing purposes a gateway has been made public. Please use <i>http://dcgw.enocean-gateway.eu</i> in the host field in case you want to check out EnOcean API's behaviour. You will peek events from Stuttgart, Germany and be able to send actions as well. You need to provide default credentials:</p>
login: user

pw: user

##### Use sample flow
A sample flow is provided that includes a couple of predefined requests for enocean out and reveal its equivalent REST calls.

- Open [flows/sampleFlow.json](flows/sampleFlow.json) in any editor and copy its content while using the import function in Node-RED menu bar in the upper right corner.
- simply start Node-RED with `node-red sampleFlow.json`

### Quickstart

Once your set up is done, you need to provide API-Origin by specifying host, port and credentials. This information will be held in a configuration node and is available to other enocean nodes as well. But your credentials are saved securely and won't be part of any exports. In case you've activated JSON encryption please prepend host field by <code>https</code> protocol instead of <code>http</code> protocol.

#### node - enocean out
<p>This node facilitates flows in sending json objects to EnOcean API more easier than using HTTP modules.</p>
<p><code>enocean out</code> is preferably used when a state change on a device needs to be applied, even though information can be retrieved too (e.g. requesting device states). A state can be requested on both, bidirectional and unidirectional enocean devices. Whereas only bidirectional EnOcean devices will accept changes to their state.</p>

###### Usage, API resources
<p><code>enocean out</code> composes http requests and responds accordingly, when JSON messages are injected adequately. A json object is expected to contain a <code>payload</code> property that will address one resource out of state(s), device(s), profile(s) or API info. { payload: <code>...</code> }</p>
<ul>
    <li><code>{"resource" : "states"}</code></li>
    <li><code>{"resource" : "devices"}</code></li>
    <li><code>{"resource" : "profiles"}</code></li>
</ul>

<p>Requests can be targeted, that will include more information for each resource. Specifically setting <code>items</code> array will result in a single respond for any item given. Valid items are provided with <code>deviceId</code>, <code>friendlyId</code> or any <code>profileId</code>.</p>

<p>Sample requests:</p>
<ul>
    <li><code>{"resource" : "states", "items" : ["FFDDBBCC", "kitchenThermostat"]}</code></li>
    <li><code>{"resource" : "devices", "items" : ["kitchenThermostat"]}</code></li>
    <li><code>{"resource" : "profiles", "items" : ["FFDDBBCC", "F6-02-01"]}</code></li>
</ul>

###### Change device state
<p>The schema looks pretty much the same as requesting a state, except that you need to give a new <code>state</code>. A property identically named takes care of it.</p>

<p><code>{ "resource" : "states", "items" : ["kitchenLight"], "state": { "functions" : [{"key": "dimValue", "value" : "70"}] }}</code></p>

###### How state should look like?
<p>Request a device profile gives indication on which information (key-value pairs) is needed. Pick one functionGroup (a set of key-value pairs) containing a direction <code>to</code> and provide at least any key-value pair that is <b>not</b> stated with a <code>defaultValue</code>. A key-value will be set with its defaultValue automatically whenever not given.</p>

<p>Feel free to use native REST interface by means of http nodes instead. More documentation is available <b><a href="http://enocean-gateway.eu/images/documents/Documentation/index.html?rest-resources.html">here</a></b>.</p>

###### State and FunctionGroups
A <code>state</code> is represented by a set of key-value pairs and is encapsulated in a <code>functionGroup</code>. Each functionGroup specify the communication direction (to/from) in addition. FunctionGroups therefore represent information that can be held or had been hold by enocean telegrams. However, enocean profiles - widely used to organize EnOcean communication- sometimes specify more than one telegram or functionGroup per profile. Each device communicates by using at least one EnOcean equipment profile (EEP).

The function names with their interface specification can be retrieved anytime through HTTP requests in a syntax:<br>
<br>All profiles <a href="http://dcgw.enocean-gateway.eu:8080/profiles">&#47;profiles</a>
<br>Single profile<a href="http://dcgw.enocean-gateway.eu:8080/profiles/f6-02-01">&#47;profiles&#47;f6-02-01</a>
<br>Ask the device <a href="http://dcgw.enocean-gateway.eu:8080/devices/01844BB0/profile">&#47;devices&#47;DEVICE-ID&#47;profile</a>

#### node - enocean in
<p>Enocean device updates are being received in realtime and injected into the flow. A HTTP streaming connection will be established as soon as a flow is deployed and a valid configuration has been given.</p>
<p><b>Rather streaming than polling</b></p>
<p><code>enocean in</code> node works independant and active in comparison to polling where it is required to request regurarly. Enocean api counterpart pushes events to <code>enocean in</code> actively.</p>

###### Events
<p>Message objects will be passed and always define a <code>msg.payload</code> object in typical node-red manner. Expect any <code>payload</code> object to contain a <code>header</code> property that indicates what type of information does follow up.</p>
Information you may encounter:
<ul>
    <li><code>states</code> - last known device states, if one is available</li>
    <li><code>telegram</code> - one device state event</li>
</ul>

<p>Example message object (including a telegram):
    <code>
{ "payload": { "header": { "content": "telegram", "timestamp": "2016-03-07T08:37:13.578+0100" }, "telegram": { "deviceId": "FEFEA199", "friendlyId": "4Button", "timestamp": "2016-03-07T08:37:13.578+0100", "direction": "from", "functions": [ { "key": "buttonAI", "value": "0", "valueKey": "released", "meaning": "Button released" } ], "telegramInfo": { "data": "00", "status": "20", "dbm": -88, "rorg": "F6" } } }, "_msgid": "f3ab21cd.0c54e" }
</code></p>

###### Filter options:
<p>Assuming you want to limit events that happening, you may have a look to available filter options. Information type <code>states</code> can be omitted at all, although <code>telegram</code> events can be reduced to specific devices only. Furthermore a filter to <code>direction</code> can be set that will influence the output if the information has been received or sent by the API. That means <b>requested</b> device state changes are also events with direction <code>to</code>. Be aware that these messages have only been sent by the API not yet acknowledged by the actuator. In most of the cases you can ignore these messages and wait until a feedback (event) with direction <code>from</code> arrives.</p>

<p>More information on Enocean api you can find <b><a href="http://enocean-gateway.eu/images/documents/Documentation/index.html?enocean-api.html">here</a></b>.</p>

<p>

Copyright
(c) 2024 Digital Concepts
