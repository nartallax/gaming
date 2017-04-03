// omnipresense - a tool to simplify multi-window gaming for Lineage II
require('../../javascript-common/libs/meta/addict.js')
	.resolvers(['node', {'../../javascript-common/libs': '', './app': 'op', './': ''}])
	.main(() => {
		
		var log = pkg('util.log'),
			CLI = pkg('util.cli'),
			winapi = pkg('win.api'),
			config = pkg('config'),
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
			pkg('scenario.' + args.scenario)();
		}
		
	});