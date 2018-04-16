pkg('scenario.sp', () => {

	var log = pkg('util.log'),
		Utils = pkg('op.utils'),
		CLI = pkg('op.cli'),
		defaultCLI = pkg("op.cli.default"),
		defaultHotkeys = pkg("op.hotkeys.default");
		
	return () => {
		Utils.start([
			['sp', 'main'], 
			//'cr',
			'p1pp1'
		], (u, cls) => {
			
			u	.getPartyLeader().setHotkeys(defaultHotkeys(u, {
					"f11":	() => {
						u.byRole("buffer").forEach(buffer => {
							buffer.target("Fury");
							setTimeout(() => buffer.useHotkey(8), 500);
						});
					},
					"f3":	() => u.getRoundRobinClient("healer").useHotkey(3),
					"f4":	() => u.getRoundRobinClient("healer").useHotkey(4)
				})).bringToFront(() => log("Done logging."));
			
			var cli = new CLI(defaultCLI(u, cls, {
				meleeBuffHotkey: 8,
				mageBuffHotkey: 7,
			}));
		});
		
	}
	
});