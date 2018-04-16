pkg('op.client.local',() => {

	var Client = pkg('op.client'),
		config = pkg('config'),
		time = pkg('util.time'),
		log = pkg('util.log'),
		Window = pkg('win.window'),
		winapi = pkg('win.api'),
		cp = pkg.external('child_process'),
		affinityStrategy = pkg('op.core.selection.strategy'),
		Keylogger = pkg('op.keylogger'),
		Snitch = pkg("op.snitch");
	
	var cc = pkg('charconfig');

	var LocalClient = function(proc, win, clientDescription, id){
		Client.call(this, clientDescription, id);
		this.setProcWin(proc, win);
		this.width = null;
		this.height = null;
		this.char = null;
		
		this.keyHandlers = {};
	};
	
	var clientList = {}, activationInterval;
	var addToClientList = cl => clientList[cl.win.hwnd] = cl;
	var removeFromClientList = cl => { delete clientList[cl.win.hwnd] };
	
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
				//log("Found window with caption: " + win.getCaption());
				var caption = win.getCaption()
				if(caption === config.expectedWindowCaption){
					return win;
				} else if(caption === "Warning"){
					win.sendKeyString('{enter}');
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
	var getDefaultKeylogger = () => defaultKeylogger;
	var setDefaultKeylogger = kl => {
		defaultKeylogger = kl;
		
		kl.onKeyPress(data => {
			if(!data.line || data.direction !== 'down' || !(data.hwnd in clientList)) return;
			var cl = clientList[data.hwnd];
			
			//console.log("KEYPRESS:", data.line)
			if(!(data.line in cl.keyHandlers)) return;
			var handler = cl.keyHandlers[data.line];
			
			handler.prevent && (data.prevent = true);
			setImmediate(() => handler.call(data));
		});
		
	}
	var assureHasKeylogger = () => defaultKeylogger || setDefaultKeylogger(new Keylogger().start());
	
	var createNewWindow = (binPath, cb) => {
		var proc = cp.spawn(binPath);
		findWin(proc.pid, win => cb(proc, win));
	}
	
	LocalClient.startFor = (clientName, accountName, cb, id) => {
		createNewWindow(cc.clients[clientName].binary, (proc, win) => {
			var cl = new LocalClient(proc, win, cc.clients[clientName], id);
			cl.loginFor(cc.characters[accountName], () => {
				log(cl.char.name + ' logged in.');
				cb(cl);
			});
		});
	}
	
	var abs = x => x > 0? x: -x;
	
	var checkColorWithMargin = (base, margin) => {
		var x = (base & 0xff0000) >> 16,
			y = (base & 0x00ff00) >> 8,
			z = (base & 0x0000ff) >> 0;
			
		return clr => {
			var _x = (clr & 0xff0000) >> 16,
				_y = (clr & 0x00ff00) >> 8,
				_z = (clr & 0x0000ff) >> 0;
			
			return abs(_x - x) <= margin && abs(_y - y) <= margin && abs(_z - z) <= margin;
		}
	}
	
	LocalClient.prototype = {
		
		// работа с горячими клавишами
		onKey: function(line, handler, args){
			if(!handler){
				delete this.keyHandlers[line];
			} else {
				assureHasKeylogger();
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
		
		// работа с локальными окнами
		// не имеет аналогов в RemoteClient
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
			var isExpectingParticularColor = true;
			var expectedColorCheck = 
				typeof(expectedColor) === 'number'? clr => clr === expectedColor:
				typeof(expectedColor) === 'function'? expectedColor: 
				((isExpectingParticularColor = false), (() => false));
			
			var complete = () => additionalDelay? setTimeout(() => cb(), additionalDelay): cb();
			
			var check = () => {
				var curCol = this.win.colorAt(x, y).rgb;
				
				//console.log('At ' + x + ',' + y + ', got color 0x' + curCol.toString(16));
				
				if(expectedColorCheck(curCol) || (!isExpectingParticularColor && curCol !== rgb)) return complete();
				
				if(time.milliseconds() - startTime > maxWaitTime){
					return onFailure();
				}
				
				setTimeout(check, config.colorCheckInterval);
			}
			
			check();
		},
		normalizeWindowPos: function(){
			/*
			var rect = this.win.getRect();
			if(rect.top > 50){
				this.win.moveTo(rect.left, 50);
			}
			*/
			this.win.moveTo(0, 0);
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
						setTimeout(() => {
							this.win.sendKeyString('{enter}');
						}, 1500);
						this.waitColorChange(~~(width / 2) - 40, ~~(height / 2) + 170, () => { // rules -> server selection
							setTimeout(() => {
								this.win.sendKeyString('{enter}');
							}, 3000);
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
									}, cb, null, checkColorWithMargin(0x583f31, 8));
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
						}, cb);
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
		
		// начало общего куска интерфейса
		getBarState: function(cb){ cb(Snitch.getBarState(this.win.hwnd)) },
		closeWindow: function(cb){		
			this.proc.kill();
			removeFromClientList(this);
			cb && setImmediate(cb);
		},
		activate: function(cb){
			this.win.postMessage('WM_ACTIVATE', 1, 0);
			
			cb && setImmediate(cb);
		},
		relogin: function(cb){
			log('Relogging ' + this.char.name);
			this.close(() => {
				createNewWindow(this.clientDescription.binary, (proc, win) => {
					this.setProcWin(proc, win);
					this.loginFor(this.char, cb);
				});
			});
		},
		reloginIfClosed: function(cb){ this.closed? this.relogin(() => cb(true)): setImmediate(() => cb(false)); },
		
		chat: function(str, cb){
			log(this.char.name + ': ' + str);
			this.win.sendKeyString('{end}{shift down}{home}{shift up}{delete}{enter}{end}{shift down}{home}{shift up}{delete}' + str + '{enter}');
			cb && setImmediate(cb);
		},
		
		unchat: function(cb){
			this.win.sendKeyString("{end}{shift down}{home}{shift up}{delete}{tab}{tab}");
			cb && setImmediate(cb);
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
		
		useHotkey: function(num, cb){
			var vk;
			switch(num){
				case 10: vk = 48; break;
				case 11: vk = 189; break;
				case 12: vk = 187; break;
				default: vk = 48 + num; break;
			}
			
			this.win.sendKeyPress(vk, true); 
			this.win.sendKeyPress(vk, false);
			cb && setImmediate(cb);
		},
		cancelCurrentAction: function(cb){
			this.win.sendKeyString('{escape}');
			cb && setImmediate(cb);
		},
		
	};
	
	var realPrototype = new Client();
	Object.keys(LocalClient.prototype)
		.filter(x => LocalClient.prototype.hasOwnProperty(x))
		.forEach(x => realPrototype[x] = LocalClient.prototype[x]);
	LocalClient.prototype = realPrototype;
	
	return LocalClient;

});