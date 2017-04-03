pkg('scenario.p1', () => {

	var Client = pkg('op.client'),
		log = pkg('util.log');
		
	return () => {
		Client.startMany([['p1tank', 'main']/*, ['p1se', 'mundane'], ['p1bd', 'mundane']*/, 'p1nuker1', 'p1nuker2', 'p1nuker3', 'p1nuker4', 'p1nuker5', 'p1nuker6'], clients => {
			var head = clients.filter(x => x.char.roles.filter(x => x === 'tank').length > 0)[0],
				supports = clients.filter(x => x.char.roles.filter(x => x === 'buffer').length > 0),
				healers = supports.filter(x => x.char.roles.filter(x => x === 'healer').length > 0),
				nukers = clients.filter(x => x.char.roles.filter(x => x === 'nuker').length > 0),
				notHead = clients.filter(x => x !== head);
			
			var chatReady = () => notHead.forEach(x => x.chat('#ready'));
			
			head.bringToFront(() => chatReady);
			
			var goParty = cb => {
				head.partyWithMany(notHead.filter(x => !x.inParty), () => {
					chatReady();
					cb();
				})
			}
			
			var alreadyRelogging = false;
			var relogDeadWindows = cb => {
				if(alreadyRelogging) return cb(false);
				alreadyRelogging = true;
				log('Relogging closed windows.');
				var i = 0;
				var next = () => {
					var cl = notHead[i++];
					if(!cl) return ((alreadyRelogging = false), cb());
					
					cl.reloginIfClosed(next);
				}
				
				next();
			}
			
			var nukerRR = 0, healerRR = 0;
			head.setHotkeys({
				'`': () => nukers.forEach(cl => cl.useHotkey(1)),
				'1': () => nukers[nukerRR = (nukerRR + 1) % nukers.length].useHotkey(1),
				'2': () => notHead.forEach(cl => cl.useHotkey(2)),
				'3': () => healers[healerRR = (healerRR + 1) % healers.length].useHotkey(1),
				'0': { handler: () => notHead.forEach(cl => cl.useHotkey(10)), noPrevent: true},
				'-': { handler: () => notHead.forEach(cl => cl.useHotkey(11)), noPrevent: true},
				'=': () => notHead.forEach(x => x.evaluate()),
				'f9':() => goParty(() => log('Repartied.')),
				'f10': () => chatReady(),
				'f11': () => relogDeadWindows(() => log('Done relogging.'))
			});
		});
	}
	
});