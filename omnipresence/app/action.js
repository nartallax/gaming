// действие - какая-либо манипуляция
pkg('op.action', () => {
	
	var cc = pkg('charconfig'),
		Client = pkg('op.client'),
		log = pkg('util.log');
	
	var Action = function(){};
	var possibleActions = {};
	
	Action.prototype = {
		run: function(cb){ throw "Not implemented." },
		getTargetHostName: function(){ throw "Not implemented." },
		getDto: function(){
			var result = {};
			for(var k in this){
				if(this.hasOwnProperty(k)){
					result[k] = this[k];
				}
			}
		
			result.action = this.action;
			return result;
		}
	}
	
	Action.createFrom = function(dto){
		var result = new possibleActions[dto.action]();
		Object.keys(dto).forEach(k => {
			if(k !== 'action'){
				var setterName = 'set' + k.charAt(0).toUpperCase() + k.substr(1);
				if(typeof(result[setterName]) === 'function'){
					result[setterName].call(result, dto[k]);
				} else {
					result[k] = dto[k];
				}
			}
		})
		return result;
	};
	
	possibleActions.CreateClient = function(id, clientName, accountName){
		this.id = id;
		this.clientName = clientName;
		this.accountName = accountName;
	}
	
	possibleActions.CreateClient.prototype = {
		run: function(cb){
			//console.log('CREATECLIENT ID = ' + this.id);
			Client.start([[this.accountName, this.clientName, this.id]], cls => cb(cls[0]));
		},
		getTargetHostName: function(){
			return cc.clients[this.clientName].host || null;
		}
	}
	
	possibleActions.OperateClient = function(id, methodName, methodArgs){
		this.id = id;
		this.methodName = methodName;
		this.methodArgs = methodArgs;
	}
	
	possibleActions.OperateClient.prototype = {
		run: function(cb){
			var cl = Client.idMap[this.id],
				method = cl[this.methodName];
			
			var realArgs = [];
			for(var i = 0; i < this.methodArgs.length; i++){
				realArgs.push(this.methodArgs[i]);
			}
			realArgs.push(cb);
			
			//console.log('RUNNING METHOD ' + this.methodName + ' on client ' + this.id + ' with args ' + realArgs.map(x => x + '').join(', '));
			
			method.apply(cl, realArgs);
		},
		getTargetHostName: function(){ 
			return Client.idMap[this.id].clientDescription.host || null;
		}
	}
	
	var constrToOrdinary = constr => {
		function F(args){
			return constr.apply(this, args);
		}
		F.prototype = new Action();
		Object.keys(constr.prototype).forEach(x => F.prototype[x] = constr.prototype[x]);

		return function(){
			return new F(arguments);
		}
	}
	
	Object.keys(possibleActions).forEach(k => {
		if(k in Action){
			throw new Error("Bad action name: " + k);
		}
		
		possibleActions[k].prototype.action = k;
		possibleActions[k] = constrToOrdinary(possibleActions[k]);
		Action[k] = possibleActions[k];
	});
	
	return Action;
	
})