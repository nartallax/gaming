// omnipresense - a tool to simplify multi-window gaming for Lineage II
require('../../javascript-common/meta/addict.js')
	.resolvers(['node', {'../../javascript-common': '', './app': 'op', './': ''}])
	.main(() => {
		
		var log = pkg('util.log'),
			CLI = pkg('util.cli'),
			winapi = pkg('win.api'),
			config = pkg('config'),
			Keylogger = pkg('op.keylogger'),
			Window = pkg('win.window'),
			Client = pkg('op.client');
		
		var cli = new CLI({
			scenario: { alias: 's', description: 'Determines the scenario package name to execute.', type: 'string'},
			help: { alias: 'h', description: 'Print usage information and exit.', type: 'boolean', isHelp: true}
		});
		
		var args = cli.parse(process.argv);
		if(args.help){
			cli.printHelp();
		} else {
			
			var kl = new Keylogger(config.keyloggerBinary).start();
			Client.setDefaultKeylogger(kl);
			
			pkg('scenario.' + args.scenario)();
		}
		
	});