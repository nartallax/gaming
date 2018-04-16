// omnipresense - a tool to simplify multi-window gaming for Lineage II
require('./javascript-common/libs/meta/addict.js')
	.resolvers(['node', {'./javascript-common/libs': '', './app': 'op', './': ''}])
	.main(() => {
		pkg('global')();
		process.chdir(__dirname);
		
		var log = pkg('util.log'),
			CLI = pkg('util.cli'),
			net = pkg('op.net'),
			Client = pkg('op.clients');
		
		var cli = new CLI({
			scenario: { alias: 's', description: 'Determines the scenario package name to execute.', type: 'string', default: ''},
			help: { alias: 'h', description: 'Print usage information and exit.', type: 'boolean', isHelp: true}
		});
		
		var args = cli.parse(process.argv);
		if(args.help){
			cli.printHelp();
		} else {
			
			if(!net.isMaster()){
				log('Running as slave at node ' + net.getLocalHostname());
			} else {
				if(args.scenario === ''){
					return log('Tried to run as master, but no scenario supplied! Use --scenario command line argument.');
				}
				pkg('scenario.' + args.scenario)();
			}
			
		}
		
	});