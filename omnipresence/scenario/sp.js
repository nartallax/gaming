pkg('scenario.sp', () => {

	var Client = pkg('op.client'),
		log = pkg('util.log');
		
	return () => {
		Client.startMany([['mainSpoiler', 'main'], ['mainCrafter', 'mundane'], 'mainSe', 'mainEe', 'mainPp'], clients => {
			var head = clients.filter(x => x.char.profession === 'sp')[0],
				ballast = clients.filter(x => x.char.profession === 'cr'),
				supports = clients.filter(x => x.char.roles.filter(x => x === 'buffer').length > 0);
			
			var notHead = ballast.concat(supports);
			
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
			
			var healerRR = 0;
			head.setHotkeys({
				'f2': () => notHead.forEach(cl => cl.useHotkey(2)),
				'f3': () => supports[healerRR = (healerRR + 1) % supports.length].useHotkey(3),
				'f5': () => supports.forEach(x => x.useHotkey(6)),
				'f6': () => supports.forEach(x => x.useHotkey(7)),
				'f7': () => relogDeadWindows(() => log('Done relogging.')),
				'f8': () => chatReady(),
				'f9': () => goParty(() => log('Repartied.')),
				'f10': { handler: () => notHead.forEach(cl => cl.useHotkey(10)), noPrevent: true},
				'f11': { handler: () => notHead.forEach(cl => cl.useHotkey(11)), noPrevent: true},
				'f12': () => notHead.forEach(x => x.evaluate())
			});
		});
	}
	
});