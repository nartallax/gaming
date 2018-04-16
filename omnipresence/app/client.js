pkg('op.client', () => {
	
	var cc = pkg('charconfig'),
		os = pkg.external('os'),
		fs = pkg.external('fs');
	
	var Client = function(clientDescription, id){
		this.clientDescription = clientDescription;
		this.id = id || Client.generateId();
		clientDescription && (Client.idMap[this.id] = this);
	}
	
	Client.prototype = {
		close: function(cb){
			this.closed = true;
			this.inParty = false;
			this.closeWindow(cb);
		},
		// вспомогательные методы
		partyWithMany: function(clients, cb){
			var i = 0;
			var next = () => {
				var cl = clients[i++];
				if(!cl) return cb && cb();
				this.inviteToParty(cl.char.name, () => cl.acceptParty(next));
			}
			
			next();
		},
		
		// куски интерфейса поверх других частей интерфейса
		inviteToParty: function(charName, cb){
			this.chat('/invite ' + charName, cb);
		},
		leaveParty: function(cb){
			this.chat('/leave', () => {
				this.inParty = false;
				cb && setImmediate(cb);
			});
		},
		
		target: function(targ, cb){ this.chat('/target ' + targ, cb); },
		assist: function(cb){ this.chat('/assist', cb); },
		attack: function(cb){ this.chat('/attack', cb); },
		evaluate: function(cb){ this.chat('/evaluate', cb); },
		sitstand: function(cb){ this.chat('/sitstand', cb); },
		unstuck: function(cb){ this.chat('/unstuck', cb); }
	}
	
	Client.idMap = {};
	Client.activateAll = () => Object.keys(Client.idMap).forEach(k => Client.idMap[k].activate())
	Client.setupAutoActivation = () => {
		(!activationInterval) && (activationInterval = setInterval(Client.activateAll, config.windowActivationInterval));
	}
	
	var id = 1;
	Client.generateId = () => id++;

	Client.remoteClientClass = null;
	Client.localClientClass = null;
	
	// [[accName, clName], ...] => {hostName: [[accName, clName], ...], ...}
	var groupByHost = names => {
		var result = {};
		names.forEach(n => {
			var hostname = cc.clients[n[1]].host || Client.getLocalHostname();
				
			(hostname in result) || (result[hostname] = []);
			result[hostname].push(n);
		});
		
		return result;
	}
	
	var startAllForHost = (hostname, names, cb) => {
		var cls = (hostname === Client.getLocalHostname())? Client.localClientClass: Client.remoteClientClass,
			result = [],
			i = 0;
		
		var next = () => {
			var n = names[i++];
			if(!n){
				return cb(result);
			}
			
			cls.startFor(n[1], n[0], cl => {
				result.push(cl);
				next();
			}, n[2])
		}
		
		next();
	}
	
	// следует использовать эту функцию для логина любого числа клиентов
	Client.start = (arr, cb, useSequental) => {
		var i = 0,
			defaultClientName = Object.keys(cc.clients).filter(x => cc.clients[x].isDefault)[0],
			result = [];
			
		for(var i = 0; i < arr.length; i++){
			Array.isArray(arr[i]) || (arr[i] = [arr[i], defaultClientName]);
		}
		
		var grouped = groupByHost(arr);
		
		if(useSequental){
			var hosts = Object.keys(grouped), i = 0,
				next = () => {
					var h = hosts[i++];
					if(!h) return cb && cb(result);
					
					startAllForHost(h, grouped[h], cls => {
						result = result.concat(cls);
						next();
					});
				}
				
			next();
		} else {
			var countdown = Object.keys(grouped).length;
			Object.keys(grouped).forEach(hostname => startAllForHost(hostname, grouped[hostname], resultForHost => {
				result = result.concat(resultForHost);
				((--countdown === 0) && cb && cb(result));
			}));
		}
		(countdown === 0) && cb && setImmediate(cb(result));
	}
	
	// по логике, эта функция должна быть в op.net
	// но тогда получалась циклическая зависимость, поэтому она лежит здесь, а в net всего лишь алиас
	Client.getLocalHostname = () => {
		if(Client.localHostname){
			return Client.localHostname;
		}
		
		var systemHostname = null,
			filename = 'hostname.txt';
		
		try {
			systemHostname = fs.readFileSync(filename, 'utf8');
		} catch(e){
			systemHostname = os.hostname();
		}
		
		
		var matching = Object.keys(cc.hosts).filter(x => cc.hosts[x].hostname === systemHostname);
		
		if(matching.length !== 1){
			throw new Error('Expected for host with hostname = "' + systemHostname + '" to be described exactly once.');
		}
		
		return Client.localHostname = matching[0];
	}
	
	return Client;
	
});