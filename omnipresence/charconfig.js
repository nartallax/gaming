pkg('charconfig', () => {

	// passwords.json - json с паролями. ожидается JSON-объект со строковыми значениями
	// в отдельном файле - для удобства контроля (например, он не заливается в репозиторий)
	// на него ссылается только этот файл, из charconfig.characters
	var passwords = JSON.parse(pkg.external('fs').readFileSync('passwords.json', 'utf8'));

	var charconfig = {
		
		defaultSimpleGraph: true,
		
		clients: {
			main: { binary: "C:\\game\\L2\\system\\L2.exe", simpleGraph: false, affinity: 6 },
			secondary: { binary: "C:\\game\\L2secondary\\system\\L2.exe", isDefault: true, simpleGraph: true, affinity: 2 },
			mundane: { binary: "C:\\game\\L2secondary\\system\\L2.exe", simpleGraph: true, affinity: 4 }
		},
		
		characters: {
			p1tank: { login: 'nartallaxp1t', password: passwords.a, name: 'Thozar', roles: ['tank'], profession: 'sk'},
			p1nuker1: { login: 'nartallaxp1n1', password: passwords.a, name: 'Xoxx', roles: ['nuker'], profession: 'sh'},
			p1nuker2: { login: 'nartallaxp1n2', password: passwords.a, name: 'Zorg', roles: ['nuker'], profession: 'sh'},
			p1nuker3: { login: 'nartallaxp1n3', password: passwords.a, name: 'Dart', roles: ['nuker'], profession: 'sh'},
			p1nuker4: { login: 'nartallaxp1n4', password: passwords.a, name: 'Quex', roles: ['nuker'], profession: 'sh'},
			p1nuker5: { login: 'nartallaxp1n5', password: passwords.a, name: 'Ruxx', roles: ['nuker'], profession: 'sh'},
			p1nuker6: { login: 'nartallaxp1n6', password: passwords.a, name: 'Torn', roles: ['nuker'], profession: 'sh'},
			p1se: { login: 'nartallaxp1se', password: passwords.a, name: 'Azuria', roles: ['buffer', 'healer'], profession: 'se'},
			p1bd: { login: 'nartallaxp1bd', password: passwords.a, name: 'Eanorte', roles: ['buffer', 'melee'], profession: 'bd'}
		}
		
	};
	
	return charconfig;

});