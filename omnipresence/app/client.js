pkg('op.client', () => {
	
	var config = pkg('config'),
		time = pkg('util.time'),
		log = pkg('util.log'),
		Window = pkg('win.window'),
		winapi = pkg('win.api'),
		cp = pkg.external('child_process'),
		Event = pkg('util.event'),
		affinityStrategy = pkg('op.core.selection.strategy');
	
	var cc = pkg('charconfig');
	
	var Client = function(proc, win, clientDescription){
		this.clientDescription = clientDescription;
		this.setProcWin(proc, win);
		this.width = null;
		this.height = null;
		this.char = null;
		
		this.onKey = new Event();
	};
	
	var clientList = {}, activationInterval;
	var addToClientList = (k, v) => {
		clientList[k] = v;
		activationInterval || 
			(activationInterval = setInterval(() => Object.keys(clientList).forEach(id => clientList[id].activate()), config.windowActivationInterval));
	}
	var removeFromClientList = k => {
		delete clientList[k];
		(Object.keys(clientList).length === 0 && activationInterval) && clearInterval(activationInterval);
	}
	var getOccupiedCores = (procCount) => {
		var result = {};
		for(var i = 0; i < procCount; i++) result[i] = [];
		
		Object.keys(clientList)
			.map(x => clientList[x])
			.filter(cl => cl.processorCore !== null)
			.forEach(cl => result[cl.processorCore].push(cl.clientDescription.affinity));

		return result;
	}
	
	var findWin = (() => {
		
		var findOnce = pid => {
			var hwnds = Window.hwndsByPID(pid);
			for(var i in hwnds){
				var win = new Window(hwnds[i], {sendPreferChars: true, sendDownOnly: true});
				if(win.getCaption() === config.expectedWindowCaption){
					return win;
				}
			}
			return null;
		}
		
		return (pid, cb) => {
		
			var search = () => {
				var win = findOnce(pid);
				if(win) return cb(win);
				setTimeout(search, config.windowSearchInterval);
			}
			
			search();
		}
		
	})();
	
	var defaultKeylogger = null;
	Client.getDefaultKeylogger = () => defaultKeylogger;
	Client.setDefaultKeylogger = kl => {
		defaultKeylogger = kl;
		kl.onForegroundWindow(w => {
			clientList[w.from.pid] && setTimeout(() => clientList[w.from.pid] && clientList[w.from.pid].activate(), config.windowActivationLag);
		});
		
		kl.onKey(k => {
			k.direction === 'down' && k.window && k.window.pid in clientList && clientList[k.window.pid].onKey.fire(k);
		});
	}
	
	var createNewWindow = (binPath, cb) => {
		var proc = cp.spawn(binPath);
		findWin(proc.pid, win => cb(proc, win));
	}
	Client.startFor = (clientName, accountName, cb) => {
		createNewWindow(cc.clients[clientName].binary, (proc, win) => {
			var cl = new Client(proc, win, cc.clients[clientName]);
			cl.loginFor(cc.characters[accountName], () => cb(cl));
		})
	}
	
	Client.startMany = (arr, cb) => {
		var i = 0,
			defaultClientName = Object.keys(cc.clients).filter(x => cc.clients[x].isDefault)[0],
			result = [];
		var next = () => {
			var item = arr[i++];
			if(!item) return cb(result);
			
			Array.isArray(item) || (item = [item, defaultClientName]);
			
			Client.startFor(item[1], item[0], client => {
				log(client.char.name + ' logged in.');
				result.push(client);
				next();
			});
		}
		
		next();
	}
	
	Client.prototype = {
		close: function(){
			removeFromClientList(this.proc.pid);
			this.proc.kill();
		},
		
		activate: function(){
			this.win.postMessage('WM_ACTIVATE', 1, 0);
		},
		
		relogin: function(cb){
			log('Relogging ' + this.char.name);
			this.close();
			createNewWindow(this.clientDescription.binary, (proc, win) => {
				this.setProcWin(proc, win);
				this.loginFor(this.char, cb);
			});
		},
		
		setProcWin: function(proc, win){
			this.proc = proc;
			this.win = win;
			addToClientList(this.proc.pid, this);
			this.proc.on('close', () => this.close());
			this.normalizeWindowPos();
			this.processorCore = null;
			this.selectAndSetAffinity();
		},
		
		waitColorChange: function(x, y, cb, afterRelogCb, baseColor, additionalDelay, maxWaitTime, onFailure){
			additionalDelay = additionalDelay || config.minorInterfaceLag;
			maxWaitTime = maxWaitTime || config.loginStepDelay;
			onFailure = onFailure || (() => this.relogin(afterRelogCb));
			var startTime = time.milliseconds();
			
			var rgb = typeof(baseColor) === 'number'? baseColor: this.win.colorAt(x, y).rgb;
			
			var check = () => {
				var curCol = this.win.colorAt(x, y).rgb;
				if(curCol !== rgb) return additionalDelay? setTimeout(() => cb(curCol), additionalDelay): cb(curCol);
				
				if(time.milliseconds() - startTime > maxWaitTime){
					return onFailure();
				}
				
				setTimeout(check, config.colorCheckInterval);
			}
			
			check();
		},
		
		normalizeWindowPos: function(){
			var rect = this.win.getRect();
			if(rect.top > 50){
				this.win.moveTo(rect.left, 50);
			}
		},
		
		selectAndSetAffinity: function(){
			var avail = winapi.getAvailableProcessorCores();
			var max = 0;
			avail.forEach(x => (x > max) && (max = x))
			var occupied = getOccupiedCores(max + 1);
			
			var selectedCore;
			if(typeof(this.clientDescription.affinity) === 'number'){
				selectedCore = this.clientDescription.affinity;
			} else {
				if(!(this.clientDescription.affinity in affinityStrategy)){
					throw new Error('Affinity selection strategy "' + this.clientDescription.affinity + '" not found.');
				}
				selectedCore = affinityStrategy[this.clientDescription.affinity](avail, occupied);
			}
			
			this.win.setAffinity([selectedCore]);
			this.processorCore = selectedCore;
		},
		
		loginFor: function(ch, cb){
			this.char = ch;
			var rect = this.win.getRect(),
				width = this.width = rect.right - rect.left,
				height = this.height = rect.bottom - rect.top;
			
			this.waitColorChange(~~(width / 2) - 30, ~~(height / 2) + 10, color => { // black screen -> login
				
				this.win.sendKeyString(this.char.login);
				setTimeout(() => {
					this.waitColorChange(~~(width / 2) - 30, ~~(height / 2) + 10, color => { // login -> rules
						this.waitColorChange(~~(width / 2) - 40, ~~(height / 2) + 170, color => { // rules -> server selection
							this.waitColorChange(~~(width / 2), ~~(height / 2) + 10, color => { // server selection -> character selection
								this.waitColorChange(~~(width / 2), height - 80, color => { // character selection -> splash screen
									this.waitColorChange(~~(width / 2), height - 80, color => { // splash screen -> game
										this.clientDescription.simpleGraph && this.win.sendKeyString("{home}");
										cb(this);
									}, cb);
								}, cb);
								this.win.sendKeyString('{enter}');
							}, cb);
							this.win.sendKeyString('{enter}');
						}, cb);
						this.win.sendKeyString('{enter}');
					}, cb);
					this.win.sendKeyString('{tab}' + this.char.password + '{enter}');
				}, config.minorInterfaceLag);
				
			}, cb, 0);
		},
	
		bringToFront: function(cb){ 
			this.win.forceBringToFront();
			this.activate();
			cb && setTimeout(cb, config.windowSwitchLag);
		},	
		minimize: function(){ this.win.minimize(); },
	
		chat: function(str){ 
			log(this.char.name + ': ' + str);
			this.win.sendKeyString('{enter}' + str + '{enter}');
		},
		acceptParty: function(cb){
			this.bringToFront(() => {
				this.win.click(440, this.height - 50, false, config.minorInterfaceLag, () => {
					this.win.click(440, this.height - 30, false, config.minorInterfaceLag, cb);
				});
				
			});
		},
		partyWith: function(otherClient, cb){
			this.chat('/invite ' + otherClient.char.name);
			otherClient.acceptParty(cb);
		},
		partyWithMany: function(clients, cb){
			var i = 0;
			var next = () => {
				var cl = clients[i++];
				if(!cl) return cb();
				this.partyWith(cl, next);
			}
			
			next();
		},
		useHotkey: function(num){
			var vk;
			switch(num){
				case 10: vk = 48; break;
				case 11: vk = 189; break;
				case 12: vk = 187; break;
				default: vk = 48 + num; break;
			}
			
			this.win.sendKeyPress(vk, true); this.win.sendKeyPress(vk, false);
		},
		
		target: function(targ){ this.chat('/target ' + targ); },
		evaluate: function(){ this.chat('/evaluate'); }
	}
	
	return Client;

});