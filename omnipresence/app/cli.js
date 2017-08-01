pkg('op.cli', () => {
	var Readline = pkg.external('readline'),
		log = pkg('util.log');
	
	var CLI = function(handlers){
		this.handlers = handlers;
		this.rl = null;
		this.prefix = Array(log.getPrefixLength() - 1).join('-') + '> ';
		this.setup();
	}
	
	CLI.prototype = {
		setup: function(handler){
			this.rl = Readline.createInterface({input: process.stdin, output: process.stdout, prompt: this.prefix});
			
			this.rl.prompt();
			
			this.rl.on('line', line => {
				var parts = line.trim().split(/\s+/).filter(x => x);
				if(parts[0]){
					if(parts[0] in this.handlers){
						this.handlers[parts[0]].apply(null, parts.slice(1));
					} else {
						log('Unrecognized console command: ' + parts[0]);
					}
				}
				
				if(this.rl){
					this.rl.prompt();
				}
			});
		},
		
		shutdown: function(){
			this.rl.close();
			this.rl = null;
		}
	}
	
	return CLI;
});