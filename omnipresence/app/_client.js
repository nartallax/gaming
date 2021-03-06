pkg('op.client', () => {
	
	var config = pkg('config'),
		time = pkg('util.time'),
		log = pkg('util.log'),
		Window = pkg('win.window'),
		winapi = pkg('win.api'),
		cp = pkg.external('child_process'),
		Event = pkg('util.event'),
		affinityStrategy = pkg('op.core.selection.strategy'),
		Keylogger = pkg('op.keylogger');
	
	var cc = pkg('charconfig');
	
	// клиент - это интерфейс для управления одним окном
	// набор его обязательных для имплементации методов принимает только аргументы простых типов
	// т.к. эти аргументы обязательно должны сериализоваться (для передачи по сети, например)
	
	/*
		onKey: function(line, handler, args)
		setHotkeys: function(map)
		
		setProcWin: function(proc, win)
		waitColorChange: function(x, y, cb, afterRelogCb, baseColor, expectedColor, additionalDelay, maxWaitTime, onFailure)
		normalizeWindowPos: function()
		selectAndSetAffinity: function()
		loginFor: function(ch, cb)
		
		bringToFront: function(cb)
		minimize: function()
		
		close: function()
		activate: function()
		relogin: function(cb)
		reloginIfClosed: function(cb)
		
		chat: function(str)
		acceptParty: function(cb)
		leaveParty: function(cb)
		partyWith: function(otherClient, cb)
		partyWithMany: function(clients, cb)
		useHotkey: function(num)
		cancelCurrentAction: function()
		target: function(targ)
		evaluate: function()
	*/
	
	var methods = {
		close: [],
		activate: [],
		relogin: [],
		reloginIfClosed: [],
		
		chat: ['string'],
		acceptParty: [],
		leaveParty: [],
		partyWith: ['string'],
		partyWithMany: ['string'],
		useHotkey: ['number'],
		cancelCurrentAction: [],
		target: ['string'],
		evaluate: []
	};
	
	var Client = function(proc, win, clientDescription, id){
		this.clientDescription = clientDescription;
		this.setProcWin(proc, win);
		this.width = null;
		this.height = null;
		this.char = null;
		this.id = id || Client.generateId();
		
		this.keyHandlers = {};
		Client.idMap[id] = this;
	};
	
	var clientList = {}, activationInterval;
	var addToClientList = cl => {
		clientList[cl.win.hwnd] = cl;
		//log("New window added to client list, new list size = " + Object.keys(clientList).length);
	}
	Client.idMap = {};
	Client.setupAutoActivation = () => {
		if(!activationInterval){
			activationInterval = setInterval(Client.activateAll, config.windowActivationInterval);
			
			//log("Activation interval set up.");
		}
	}
	Client.activateAll = () => Object.keys(clientList).forEach(id => clientList[id].activate())
	var removeFromClientList = cl => {
		delete clientList[cl.win.hwnd];
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
		
		kl.onKeyPress(data => {
			if(!data.line || data.direction !== 'down' || !(data.hwnd in clientList)) return;
			var cl = clientList[data.hwnd];
			
			if(!(data.line in cl.keyHandlers)) return;
			var handler = cl.keyHandlers[data.line];
			
			handler.prevent && (data.prevent = true);
			setImmediate(() => handler.call(data));
		});
		
	}
	Client.assureHasKeylogger = () => defaultKeylogger || Client.setDefaultKeylogger(new Keylogger().start());
	
	var createNewWindow = (binPath, cb) => {
		var proc = cp.spawn(binPath);
		findWin(proc.pid, win => cb(proc, win));
	}
	
	var id = 1;
	Client.generateId = () => id++;
	Client.startFor = (clientName, accountName, cb, id) => {
		Client.assureHasKeylogger();
		createNewWindow(cc.clients[clientName].binary, (proc, win) => {
			var cl = new Client(proc, win, cc.clients[clientName], id);
			cl.loginFor(cc.characters[accountName], () => cb(cl));
		});
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
		onKey: function(line, handler, args){
			if(!handler){
				delete this.keyHandlers[line];
			} else {
				this.keyHandlers[line] = {prevent: args.noPrevent? false: true, call: handler};
			}
		},
		
		setHotkeys: function(map){
			this.keyHandlers = {};
			Object.keys(map).forEach(line => {
				var v = map[line], handler, args;
				if(typeof(v) === 'function'){
					handler = v;
					args = {};
				} else {
					handler = v.handler;
					args = v;
				}
				this.onKey(line, handler, args);
			})
			
			return this;
		},
		
		close: function(){
			removeFromClientList(this);
			this.closed = true;
			this.inParty = false;
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
		
		reloginIfClosed: function(cb){ this.closed? this.relogin(cb): setImmediate(cb); },
		
		setProcWin: function(proc, win){
			this.closed = false;
			this.proc = proc;
			this.win = win;
			addToClientList(this);
			this.proc.on('close', () => {
				log('Window of ' + (this.char? this.char.name: 'not logged character') + ' is closed.');
				this.close()
			});
			this.normalizeWindowPos();
			this.processorCore = null;
			this.selectAndSetAffinity();
		},
		
		waitColorChange: function(x, y, cb, afterRelogCb, baseColor, expectedColor, additionalDelay, maxWaitTime, onFailure){
			additionalDelay = additionalDelay || config.minorInterfaceLag;
			maxWaitTime = maxWaitTime || config.loginStepDelay;
			onFailure = onFailure || (() => this.relogin(afterRelogCb));
			var startTime = time.milliseconds();
			
			var rgb = typeof(baseColor) === 'number'? baseColor: this.win.colorAt(x, y).rgb;
			var isExpectingParticularColor = typeof(expectedColor) === 'number';
			
			var complete = () => additionalDelay? setTimeout(() => cb(), additionalDelay): cb();
			
			var check = () => {
				var curCol = this.win.colorAt(x, y).rgb;
				
				//console.log('At ' + x + ',' + y + ', got color 0x' + curCol.toString(16));
				
				if((isExpectingParticularColor && curCol === expectedColor) || (!isExpectingParticularColor && curCol !== rgb)) return complete();
				
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
				this.clientDescription.affinity = [this.clientDescription.affinity];
			}
			
			if(Array.isArray(this.clientDescription.affinity)){
				selectedCore = this.clientDescription.affinity.map(x => [x, occupied[x].length]).sort((a, b) => a[1] - b[1])[0][0];
			} else {
				if(!(this.clientDescription.affinity in affinityStrategy)){
					throw new Error('Affinity selection strategy "' + this.clientDescription.affinity + '" not found.');
				}
				selectedCore = affinityStrategy[this.clientDescription.affinity](avail, occupied);
			}
			
			//log('Selected core for new client: ' + selectedCore);
			
			this.win.setAffinity([selectedCore]);
			this.processorCore = selectedCore;
		},
		
		loginFor: function(ch, cb){
			this.char = ch;
			var rect = this.win.getRect(),
				width = this.width = rect.right - rect.left,
				height = this.height = rect.bottom - rect.top;
			
			this.waitColorChange(~~(width / 2) - 30, ~~(height / 2) + 10, () => { // black screen -> login
				
				this.win.sendKeyString(this.char.login);
				setTimeout(() => {
					this.waitColorChange(~~(width / 2) - 30, ~~(height / 2) + 10, () => { // login -> rules
						this.waitColorChange(~~(width / 2) - 40, ~~(height / 2) + 170, () => { // rules -> server selection
							this.waitColorChange(~~(width / 2), ~~(height / 2) + 10, () => { // server selection -> character selection
								var clickInterval = null, clicksLeft = 3;
							
								this.waitColorChange(~~(width / 2), height - 80, () => { // character selection -> splash screen
								
									if(clickInterval){
										clearInterval(clickInterval);
									}
									clickInterval = "stop";
									
									this.waitColorChange(10, 40, () => { // splash screen -> game
										this.clientDescription.simpleGraph && this.win.sendKeyString("{home}");
										cb(this);
									}, cb, null, 0x583f31);
								}, cb);
								
								setTimeout(() => {
									this.win.sendKeyString('{enter}');
									setTimeout(() => {
										// repeated clicks at "start" button
										// that works better than just sending {enter} sometimes
										if(!clickInterval){
											clickInterval = setInterval(() => {
												if(--clicksLeft <= 0){
													clearInterval(clickInterval);
													clickInterval = 0;
												}
												
												this.win.click(width/2, height - 85, false, config.minorInterfaceLag, () => {});
											}, config.minorInterfaceLag * 2);
										}
										
									}, config.minorInterfaceLag * 10);
								}, config.minorInterfaceLag * 3);
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
			this.win.sendKeyString('{enter}{back}{back}' + str + '{enter}');
		},
		acceptParty: function(cb){
			this.bringToFront(() => {
				this.win.click(440, this.height - 50, false, config.minorInterfaceLag, () => {
					this.win.click(440, this.height - 30, false, config.minorInterfaceLag, () => {
						// sometimes we need to click twice because of strange interface bug
						this.win.click(440, this.height - 30, false, config.minorInterfaceLag, () => {
							this.inParty = true;
							cb && cb();
						});
					});
				});
			});
		},
		leaveParty: function(cb){
			this.chat('/leave');
			this.inParty = false;
		},
		partyWith: function(otherClient, cb){
			this.chat('/invite ' + otherClient.char.name);
			otherClient.acceptParty(cb);
		},
		partyWithMany: function(clients, cb){
			var i = 0;
			var next = () => {
				var cl = clients[i++];
				if(!cl) return this.bringToFront(cb);
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
		cancelCurrentAction: function(){
			this.win.sendKeyString('{escape}');
		},
		
		target: function(targ){ this.chat('/target ' + targ); },
		evaluate: function(){ this.chat('/evaluate'); }
	}
	
	return Client;

});