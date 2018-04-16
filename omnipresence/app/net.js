// функции, относящиеся к работе с сетью
// тут же задается протокол общения (поверх TCP)
pkg('op.net', () => {

	var net = pkg.external('net'),
		log = pkg('util.log'),
		Event = pkg('util.event'),
		cc = pkg('charconfig'),
		config = pkg('config'),
		Action = pkg('op.action'),
		Client = pkg('op.client');

	var readJson = (socket, onJson) => {
		var received = [], 
			tmpData = null,	// невостребованный кусок данных, содержащий неполные 4 байта длины
			waitingLength = 0; // длина сообщения, который мы ждем
			
		var processData = data => {
			if(tmpData){
				data = Buffer.concat([tmpData, data]);
				tmpData = null;
			}
			if(waitingLength < 1){
				// значит, это начало сообщения
				if(data.length < 4){
					//log('received partial package: ' + data.length + ' of 4 bytes.');
					tmpData = data; // пока что невозможно сказать, какой длины будет сообщение. просто ждем следующего пакета
					return;
				}
				
				waitingLength = data.readInt32LE() + 4;
				//log('received package header: ' + waitingLength + ' long.');
			}
			
			// значит, это середина сообщения
			if(data.length >= waitingLength){
				//log('received package end!');
				received.push(data.slice(0, waitingLength));
				var remains = data.slice(waitingLength);
				waitingLength = 0;
				
				var totalBuffer = Buffer.concat(received);
				received = [];
				
				var json = totalBuffer.slice(4).toString('utf8');
				//log('parsing ' + (totalBuffer.length - 4) + ' bytes, ' + json.length + ' characters');
				try {
					json = JSON.parse(json);
				} catch(e){
					log('Failed to parse JSON from server: ' + json);
					
					throw e;
				}
				onJson(json);
				
				if(remains.length > 0) processData(remains);
			} else {
				received.push(data);
				waitingLength -= data.length;
				//log('received package part; ' + waitingLength + ' remaining.');
			}
		}
		
		socket.on('data', processData);
	}
	
	var writeJson = (socket, json) => {
		(typeof(json) !== 'string') && (json = JSON.stringify(json));
		var len = Buffer.byteLength(json, 'utf8'),
			data = Buffer.allocUnsafe(len + 4);
			
		data.writeInt32LE(len, 0);
		data.write(json, 4, len, 'utf8');
		socket.write(data);
	}
	
	var createSendBuffer = (bulkSend, timeout) => {
		timeout = timeout || 1;
		var messages = [], handle = null;
		
		return msg => {
			if(!handle){
				handle = setTimeout(() => bulkSend(messages), timeout)
			}
			messages.push(msg);
		}
	}
	
	var JsonServer = function(host, port){
		this.host = host;
		this.port = port;
		this.onMessage = new Event();
		this.onDisconnect = new Event();
		this.server = null;
		this.socket = null;
	}
	
	JsonServer.prototype = {
		start: function(cb){
			this.server = net.createServer(socket => {
				if(this.socket){
					throw new Error('Could not accept one more connection before previous one dies!');
				}
				log('Master connected.');
				
				this.socket = socket;
				
				socket.on('close',() => {
					this.socket = null;
					this.onDisconnect.fire({host: this.host, port: this.port});
				});
				readJson(socket, json => this.onMessage.fire(json));
			});
			
			this.server.listen(this.port, this.host);
			
			cb && setImmediate(cb);
		},
		
		stop: function(cb){
			this.server.close(() => cb && cb());
		},
		
		reconnect: function(cb){
			throw new Error('Reconnect must not be called on server!');
		},
		
		send: function(json){ writeJson(this.socket, json) }
	}
	
	var JsonClient = function(host, port){
		this.host = host;
		this.port = port;
		this.socket = null;
		this.onMessage = new Event();
		this.onDisconnect = new Event();		
	}
	
	JsonClient.prototype = {
		start: function(cb){
			var socket = new net.Socket();
			
			socket.on('close', () => {
				this.onDisconnect.fire({host: host, port: port});
				this.socket = null;
			});
			
			socket.connect(this.port, this.host, () => {
				readJson(socket, json => this.onMessage.fire(json));
				this.socket = socket;
				cb && cb();
			});
		},
		
		disconnect: function(host, port){
			this.socket && this.socket.destroy();
			delete this.socket();
		},
		
		send: function(json){ writeJson(this.socket, json) },
		
		reconnect: function(cb){ this.socket? cb && setImmediate(cb()): this.start(cb) }
	}
	
	
	// otherNodes: [{ onMessage, onDisconnect, hostName, send }]
	var ActionNode = function(){
		this.ids = {}; 
		this.nodes = {};
		this.pendingActions = {}; // hostname -> (id -> resultHandler)
	}
	
	ActionNode.prototype = {
		addNode: function(hostName, node){ 
			this.nodes[hostName] = node;
			this.pendingActions[hostName] = {};
			node.onMessage(msg => this.processIncomingMessage(msg, hostName));
			node.onDisconnect(host => this.processDisconnect(hostName));
		},
		
		getIdForHostname: function(hostname){
			if(!(hostname in this.ids) || Object.keys(this.pendingActions[hostname]).length === 0){
				//console.log("RESET", hostname, this.ids[hostname], this.pendingActions)
				this.ids[hostname] = 1;
			}
			
			return this.ids[hostname]++;
		},
		
		processIncomingMessage: function(msg, hostname){
			//console.log("Received message with id = " + msg.id + " (" + ('action' in msg? "request": "response") + ")");
			
			if('action' in msg){
				this.routeAndRun(Action.createFrom(msg.action), result => {
					try {
						JSON.stringify(result)
					} catch(e){ 
						result = null
					}
					
					this.getNode(hostname, node => node.send({id: msg.id, timestamp: msg.timestamp, result: result}));
				});
			} else {
				//log('RESPID = ' + msg.id);
				//log('HOSTNAME = ' + hostname);
				//log('HANDLER = ' + this.pendingActions[hostname][msg.id]);
				var waiting = this.pendingActions[hostname][msg.id];
				waiting && waiting(msg.result);
				delete this.pendingActions[hostname][msg.id];
			}
		},
		routeAndRun: function(action, cb){
			var targetHost = action.getTargetHostName() || this.getLocalHostname();
			
			if(targetHost === this.getLocalHostname()){
				return action.run(cb);
			}
			
			this.getNode(targetHost, node => {
				var id = this.getIdForHostname(targetHost),
					message = { action: action.getDto(), id: id, timestamp: Date.now()};
				this.pendingActions[targetHost][id] = cb;
				//console.log("Sending message with id = " + message.id + " (" + ('action' in message? "request": "response") + ")");
				node.send(message)
			});
		},
		
		processDisconnect: function(hostname){
			log('Host ' + hostname + ' disconnected.');
			var pending = this.pendingAction[hostname];
			Object.keys(pending).forEach(k => pending[k]({status: 'error', reason: 'disconnect'}));
		},
		reconnect: function(cb){ 
			var remaining = 1;
			
			Object.keys(this.nodes).forEach(hostname => {
				this.nodes[hostname].reconnect(() => (--remaining === 0) && cb && cb())
			});
			
			(--remaining === 0) && cb && cb();
		},
		setup: function(cb){
			if(!this.isMaster()){
				var server = new JsonServer(cc.hosts[this.getLocalHostname()].ip, config.netPort);
				server.start(() => {
					this.addNode(Object.keys(cc.hosts).filter(x => cc.hosts[x].role === 'master')[0], server);
					cb && cb();
				});
			}
		},
		getNode: function(hostname, cb){
			if(this.nodes[hostname]){
				return setImmediate(() => cb(this.nodes[hostname]));
			}
			
			var client = new JsonClient(cc.hosts[hostname].ip, config.netPort);
			client.start(() => {
				this.addNode(hostname, client);
				log('Connected to slave on ' + hostname);
				cb(client);
			});
		},
		
		getLocalHostname: function(){ return Client.getLocalHostname(); },
		isMaster: function(){ return cc.hosts[this.getLocalHostname()].role === 'master' }
		
		
	}

	var localNode = new ActionNode();
	localNode.setup();
	return localNode;
	
});