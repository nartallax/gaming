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
	
	Utils.startMany = function(clientDescs, cb){
		Client.startMany(clientDescs, clients => {
			var u = new Utils(clients);
			cb(u, clients);
		});
	}
	
	Utils.prototype = {
		reloginAllDead: function(cb){
			var wrappedCb = result => {
				log('Done relogging.');
				cb && cb(result)
			}
			
			if(this.alreadyRelogging) return wrappedCb(false);
			this.alreadyRelogging = true;
			log('Relogging closed windows.');
			var i = 0;
			var next = () => {
				var cl = this.cls[i++];
				if(!cl) return ((this.alreadyRelogging = false), wrappedCb(true));
				
				cl.reloginIfClosed(next);
			}
			
			next();
			
			return this;
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
		formParty: function(cb){
			this.getPartyLeader().partyWithMany(this.getTwinks().filter(x => !x.inParty), () => {
				log('Party formed.');
				this.chatAll("#In party.");
				cb && cb();
			})
			
			return this;
		},
		
		defineRoundRobin: function(name, clients){
			if(name in this.rr){
				throw new Error("Duplicate round-robin name: \"" + name + "\".");
			}
			
			this.rr[name] = { clients: clients, value: 0 };
			
			//log("Defined roundrobin \"" + name + "\" with " + clients.length + " clients.");
			
			return this;
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