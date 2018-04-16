pkg('op.client.remote',() => {

	var Client = pkg('op.client'),
		config = pkg('config'),
		log = pkg('util.log'),
		net = pkg('op.net'),
		Action = pkg('op.action');
	
	var cc = pkg('charconfig');

	var RemoteClient = function(clientDescription, id){
		Client.call(this, clientDescription, id)
		this.char = null;
	};
	
	var clarr = (arr, offset) => {
		var res = [];
		for(var i = offset || 0; i < arr.length; i++){
			res.push(arr[i]);
		}
		return res;
	}
	
	var runAction = function(typename, cb, varargs){
		var args = clarr(arguments, 2),
			action = Action[typename].apply(null, args);
			
		net.routeAndRun(action, cb);
	};
	
	RemoteClient.startFor = (clientName, accountName, cb, id) => {
		var cl = new RemoteClient(cc.clients[clientName], id);
		runAction('CreateClient', () => {
			cl.closed = false;
			cl.char = cc.characters[accountName];
			log(cl.char.name + ' logged in.');
			cb && cb(cl);
		}, cl.id, clientName, accountName);
	}
	
	RemoteClient.prototype = {
		operate: function(cb, methodName, varargs){
			runAction.call(null, 'OperateClient', cb, this.id, methodName, clarr(arguments, 2));
		},
		
		// начало общего куска интерфейса
		getBarState: function(cb){ this.operate(cb, "getBarState") },
		closeWindow: function(cb){ this.operate(cb, 'closeWindow'); },
		activate: function(cb){ this.operate(cb, 'activate'); },
		unchat: function(cb){ this.operate(cb, 'unchat'); },
		relogin: function(cb){
			log('Relogging ' + this.char.name);
			this.operate(() => {
				this.closed = false;
				cb && cb();
			}, 'relogin');
		},
		reloginIfClosed: function(cb){ this.operate(cb, 'reloginIfClosed') },
		
		chat: function(str, cb){ 
			log(this.char.name + ': ' + str);
			this.operate(cb, 'chat', str);
		},
		
		acceptParty: function(cb){
			this.operate(() => {
				this.inParty = true;
				cb && cb();
			}, 'acceptParty')
		},
		
		useHotkey: function(num, cb){ this.operate(cb, 'useHotkey', num) },
		cancelCurrentAction: function(cb){ this.operate(cb, 'cancelCurrentAction') }
	};
	
	var realPrototype = new Client();
	Object.keys(RemoteClient.prototype)
		.filter(x => RemoteClient.prototype.hasOwnProperty(x))
		.forEach(x => realPrototype[x] = RemoteClient.prototype[x]);
	RemoteClient.prototype = realPrototype;
	
	return RemoteClient;

});