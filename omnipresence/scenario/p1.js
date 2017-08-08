// это файл сценария.
// он определяет, что же именно произойдет при запуске omnipresence.
pkg('scenario.p1', () => {

	var Client = pkg('op.clients'),
		log = pkg('util.log'),
		Utils = pkg('op.utils'),
		CLI = pkg('op.cli');
		
	return () => {
		// для начала открываем окна и логиним в них персонажей.
		// все имена, которые мы используем в этой части, определены в charconfig.js
		// здесь мы указываем, какие персонажи будут залогинены и с помощью каких клиентов
		Utils.start([
			['p1tank', 'main'], 
			'p1se1', 'p1se2', 'p1nuker5', 'p1nuker6',
			['p1nuker1', 'lesser'], ['p1nuker2', 'lesser'], ['p1nuker3', 'lesser'], ['p1nuker4', 'lesser']
		], (u, cls) => {
			// в этот момент все персонажи залогинены, и можно начинать ими оперировать
			
			// поднимаем на передний план основное окно, после чего начинаем собирать им пати
			u.getPartyLeader().bringToFront(() => {
				u.chatAll("#Started and working.");
				setTimeout(() => u.formParty(), 1000);
			});
			
			// здесь мы определяем round-robin
			// вообще, round-robin - это "выбор по очереди" - сначала первый, потом второй, потом третий, потом снова первый и т.д.
			// это хорошо подходит для случая, когда мы хотим использовать персонажей по одному, 
			// но нам не важно, какой именно будет выбран - и поэтому мы используем их по очереди
			u.defineRoundRobin('nuker', u.byRole('nuker')) 
				// выбираем множество персонажей с ролью healer и создаем так же называющийся round-robin
			 .defineRoundRobin('healer', u.byRole('healer'))
				// ... и так далее
			 .defineRoundRobin('buffer', u.byRole('buffer'));
			 
			// здесь мы навешиваем на главное окно горячие клавиши
			// при нажатии таких клавиш произойдет не то, что случается обычно при нажатии этой клавиши, а заданное нами действие
			// эти клавиши работают не по всей системе, а только в главном клиенте
			u.getPartyLeader().setHotkeys({
					// по нажатию ` (тильда, она же ё) - выбрать одного нюкера, использовать слот 1 на этом нюкере
					'`':	() => u.getRoundRobinClient('nuker').useHotkey(1), // one cast nuke
					// по нажатию f1 - всем нюкерам использовать слот 1
					'f1':	() => u.byRole('nuker').forEach(x => x.useHotkey(1)), // all cast nuke
					// по нажатию f2 - всем не-главным персонажам использовать слот 2
					'f2':	() => u.getTwinks().forEach(x => x.useHotkey(2)), // all follow
					// ... и так далее
					'f3':	() => u.getRoundRobinClient('healer').useHotkey(1), // one tank heal
					'f4':	() => u.byRole('nuker').forEach(x => x.useHotkey(3)), // all cast overhit nuke
					'f5':	() => u.getRoundRobinClient('healer').useHotkey(4),	// one assist recharge
					'f6':	() => u.getRoundRobinClient('healer').useHotkey(3), // one assist heal
					'f7':	() => { /* ??? */ },
					'f8':	() => u.getRoundRobinClient('healer').useHotkey(7), // buff for mage
					'f9':	() => u.getRoundRobinClient('healer').useHotkey(8), // buff for warrior
					// по нажатию f10 - произвести некоторые нормализующие действия
					'f10':	() => {
						// всем твинкам - отменить текущее действие/сбросить таргет
						// иногда таргет залипает, и твинк не может взять ассист - это помогает в таком случае
						u.getTwinks().forEach(x => x.cancelCurrentAction()),
						// активация клиентов - чтобы не отставали
						// каждый раз, когда мы снимаем фокус с окна клиента (например, альт-табимся на другое окно)
						// - окно клиента становится неактивным и начинает тормозить
						// и поэтому его нужно активировать, каждый раз
						Client.activateAll(),
						// написать что-нибудь в чат - чтобы сбросить с чата выделение после активации
						// актуально для C4, клиент Interlude таким уже не страдает
						u.chatAll("#Nya!");
					},
					'f11':	() => u.byRole('nuker').forEach(cl => cl.useHotkey(11)), // all nuker sitstand
					'f12':	() => u.byRole('nuker').forEach(x => x.useHotkey(12)), // soulshots
				});
			
			// здесь мы определяем команды, которые можно отдавать запущенному инстансу omnipresence
			// такие команды вбиваются прямо в консоль, в которой запущен omnipresence
			// удобно привязывать к таким командам действия, которые нужны редко, и клавиши под них отдавать неудобно
			new CLI({
				'relog': 	() => u.reloginAllDead(),
				'assist':	() => u.getTwinks().forEach(cl => cl.assist()),
				'attack':	() => u.getTwinks().forEach(cl => cl.attack()),
				'activate':	() => Client.activateAll(),
				'evaluate':	() => cls.forEach(cl => cl.evaluate()),
				'tp':		() => cls.forEach(cl => cl.unstuck()),
				'say':		word => u.chatAll('#' + (word || 'Nya!')),
				'party':	() => u.formParty()
			});
		});
		
	}
	
});