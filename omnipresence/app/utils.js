pkg('op.utils', () => {
	
	var Client = pkg('op.client'),
		log = pkg('util.log');
	
	var Utils = function(clientList){
		this.cls = clientList;
		this.alreadyRelogging = false;
		this.rr = {};
		this.roleQueryCache = {};
		this.pl = null;
		this.twinks = null;
	}
	
	Utils.start = function(clientDescs, cb, useSequental){
		Client.start(clientDescs, clients => {
			var u = new Utils(clients);
			u.reloginWhileHasDead(() => {
				u.roleRoundRobins();
				cb(u, clients)
			});
		}, useSequental);
	}
	
	Utils.prototype = {
		reloginWhileHasDead: function(cb){
			log("Trying to relog.");
			var wrappedCb = result => {
				result && (this.alreadyRelogging = false);
				cb && cb(result);
			}
			
			if(this.alreadyRelogging) return wrappedCb(false);
			this.alreadyRelogging = true;
			
			let runRound = cb => {
				let hadDeadThisRound = false, i = 0;
				
				let next = () => {
					let cl = this.cls[i++];
					if(!cl)
						return cb(hadDeadThisRound);
					
					cl.reloginIfClosed(wasClosed => {
						hadDeadThisRound = hadDeadThisRound || wasClosed;
						next();
					});
				}
				
				next();
			}
			
			let nextRound = () => {
				setTimeout(() => {
					runRound(hadDead => {
						if(hadDead){
							log("Retrying relogging.");
							nextRound();
						} else {
							wrappedCb(true);
						}
					});
				}, 1000)
			}
			
			nextRound();
		},
		
		reloginAllDead: function(cb){
			var wrappedCb = result => {
				result && (this.alreadyRelogging = false);
				log('Done relogging.');
				cb && cb(result)
			}
			
			if(this.alreadyRelogging) return wrappedCb(false);
			this.alreadyRelogging = true;
			log('Relogging closed windows.');
			var i = 0;
			var next = () => {
				var cl = this.cls[i++];
				if(!cl) return wrappedCb(true);
				
				cl.reloginIfClosed(next);
			}
			
			next();
			
			return this;
		},
		
		unchatAll: function(){
			this.getTwinks().forEach(cl => cl.unchat());
		},
		
		byNick: function(name){
			return this.cls.find(x => x.char.name === name);
		},
		
		byRole: function(role){
			if(role in this.roleQueryCache){
				return this.roleQueryCache[role];
			}
			
			//log('Querying clients by role "' + role + '".');
			
			var result = this.cls.filter(x => {
				for(var i = 0; i < x.char.roles.length; i++){
					if(x.char.roles[i] === role){
						return true;
					}
				}
				return false;
			});
			
			//log("Found " + result.length + " clients by role.");
			
			return this.roleQueryCache[role] = result;
		},
		
		getPartyLeader: function(){
			if(this.pl){
				return this.pl;
			}
			
			var result = null;
			for(var i = 0; i < this.cls.length; i++){
				var cl = this.cls[i];
				if(cl.clientDescription.isMain){
					if(result){
						throw new Error("Failed to find main window: expected no more than one client with flag isMain=true started.");
					} else {
						result = cl;
					}
				}
			}
			
			if(!result){
				throw new Error("Failed to find main window: expected one client with flag isMain=true started.");
			}
			
			this.pl = result;
			return result;
		},
	
		getTwinks: function(){ 
			return this.twinks? this.twinks: (this.twinks = this.cls.filter(x => !x.clientDescription.isMain)); 
		},
		
		chatAll: function(message){ this.getTwinks().forEach(x => x.chat(message)) },
		formParty: function(partyLayout, _cb){
			typeof(partyLayout) === "function" && !_cb && ((_cb = partyLayout), (partyLayout = null));
			let cb = () => this.getPartyLeader().bringToFront(_cb)
			
			if(partyLayout){
				let headKeys = Object.keys(partyLayout);
				let i = -1;
				
				let run = () => {
					i++;
					if(i >= headKeys.length)
						return cb && cb();
					
					let headName = headKeys[i];
					let head = this.byNick(headName);
					if(head){
						log("Partying for " + headName);
						let members = partyLayout[headName].map(x => this.byNick(x)).filter(x => x && !x.inParty);
						head.partyWithMany(members, run);
					} else {
						log("Not found head char " + headName + "; skipping partying for him.");
						run();
					}
				}
				
				run();
			} else {
				this.getPartyLeader().partyWithMany(this.getTwinks().filter(x => !x.inParty), () => {
					log('Party formed.');
					cb && cb();
				});
			}
			
			return this;
		},
		
		collectAllStates: function(cb){
			log("Collecting...");
			var states = [];
			let i = this.cls.length;
			this.cls.forEach(cl => {
				cl.getBarState(state => {
					states.push({client: cl, state: state});
					i--;
					if(i === 0)
						cb(states);
				});
			});
			
			return this;
		},
		
		getMostInjuredAlive: function(cb){
			return this.collectAllStates(states => {
				let max = 0;
				states.forEach((x, i) => {
					if(max === i || x.state.hp <= 0)
						return;
					if(x.state.hp < states[max].state.hp)
						max = i;
				});
				let {client, state} = states[max];
				cb(client, state);
			});
		},
		
		buffAll: function(warriorKey, mageKey, timing, cb){
			let defaultTiming = 5500;
			
			typeof(timing) === "function" && !cb && (cb = timing, timing = defaultTiming);
			timing = timing || defaultTiming;
			
			let warriors = this.byRole("melee"),
				mages = this.byRole("nuker"),
				buffers = this.byRole("buffer");
				
			let buff = (list, hotkey, cb) => {
				let i = 0;
				let run = i => {
					if(i >= list.length)
						return cb && cb();
					let c = list[i];
					buffers.forEach(x => x.target(c.char.name));
					setTimeout(() => {
						buffers.forEach(x => x.useHotkey(hotkey));
						setTimeout(() => run(i + 1), timing);
					}, 500);
				}
				run(0);
			}
			
			buff(buffers, mageKey, () => {
				buff(mages, mageKey, () => {
					buff(warriors, warriorKey, cb)
				});
			});
		},
		
		roundRobins: function(map){
			Object.keys(map).forEach(k => this.defineRoundRobin(k, map[k]));
			
			return this;
		},
		
		roleRoundRobins: function(){
			let m = {};
			this.cls.forEach(cl => cl.char.roles.forEach(r => m[r] = true));
			Object.keys(m).forEach(role => this.defineRoundRobin(role, this.byRole(role)));
			
			return this;
		},
		
		defineRoundRobin: function(name, clients){
			if(name in this.rr){
				throw new Error("Duplicate round-robin name: \"" + name + "\".");
			}
			
			if(clients.length === 0)
				return this;
			
			this.rr[name] = { clients: clients, value: 0 };
			
			//log("Defined roundrobin \"" + name + "\" with " + clients.length + " clients.");
			
			return this;
		},
		
		hasRoundRobin: function(name){
			return !!this.rr[name];
		},
		
		getRoundRobinClient: function(name){
			var res = this.rr[name].clients[this.rr[name].value];
			//log("Getting roundrobin \"" + name + "\" client. Will return " + this.rr[name].clients[this.rr[name].value] + ". New value = " + (this.rr[name].value + 1) % this.rr[name].clients.length);
			this.rr[name].value = (this.rr[name].value + 1) % this.rr[name].clients.length;
			return res;
		}
	}
	
	return Utils;
	
});