pkg('charconfig', () => {

	// passwords.json - json с паролями. ожидается JSON-объект со строковыми значениями
	// в отдельном файле - для удобства контроля (например, он не заливается в репозиторий)
	// на него ссылается только этот файл, из charconfig.characters
	var passwords = JSON.parse(pkg.external('fs').readFileSync('passwords.json', 'utf8'));

	var charconfig = {
		
		defaultSimpleGraph: true,
		
		hosts: {
			lesserLaptop: { ip: 'nartallax-ll', hostname: 'nartallax-ll', role: 'slave' },
			mainLaptop: { ip: 'nartallax-w7', hostname: 'nartallax-w7', role: 'master' }
		},
		
		clients: {
			main: { binary: "G:\\_kill\\L2\\system\\L2.exe", simpleGraph: false, affinity: 0, isMain: true},
			secondary: { binary: "G:\\_kill\\L2secondary\\system\\L2.exe", isDefault: true, simpleGraph: true, affinity: [2, 4, 6] },
			mundane: { binary: "G:\\_kill\\L2secondary\\system\\L2.exe", simpleGraph: true, affinity: [2, 4, 6] },
			lesser: { binary: "C:\\game\\L2secondary\\system\\L2.exe", simpleGraph: true, affinity: [0, 2], host: 'lesserLaptop' }
		},
		
		characters: {
			mainSpoiler: { login: 'nartallaxsp', password: passwords.a, name: 'BloodGarnet', roles: ['melee'], profession: 'sp' },
			mainCrafter: { login: 'nartallaxcr', password: passwords.a, name: 'SturdyOnyx', roles: ['melee'], profession: 'cr' },
			mainSe: { login: 'nartallaxse', password: passwords.a, name: 'WildSapphire', roles: ['buffer', 'healer'], profession: 'se' },
			mainEe: { login: 'nartallaxee', password: passwords.a, name: 'PureDiamond', roles: ['buffer', 'healer'], profession: 'ee' },
			mainPp: { login: 'nartallaxpp', password: passwords.a, name: 'BlazingRuby', roles: ['buffer', 'healer'], profession: 'pp' },
			
			p1tank: { login: 'nartallaxp1tk', password: passwords.a, name: 'Thozar', roles: ['melee', 'tank'], profession: 'sk' },
			p1se1: { login: 'nartallaxp1se1', password: passwords.a, name: 'Aonerta', roles: ['buffer', 'healer'], profession: 'se' },
			p1se2: { login: 'nartallaxp1se2', password: passwords.a, name: 'Eanorta', roles: ['buffer', 'healer'], profession: 'se' },
			p1nuker1: { login: 'nartallaxp1sh1', password: passwords.a, name: 'Rexx', roles: ['nuker'], profession: 'sh' },
			p1nuker2: { login: 'nartallaxp1sh2', password: passwords.a, name: 'Zaxx', roles: ['nuker'], profession: 'sh' },
			p1nuker3: { login: 'nartallaxp1sh3', password: passwords.a, name: 'Toxx', roles: ['nuker'], profession: 'sh' },
			p1nuker4: { login: 'nartallaxp1sh4', password: passwords.a, name: 'Wexx', roles: ['nuker'], profession: 'sh' },
			p1nuker5: { login: 'nartallaxp1sh5', password: passwords.a, name: 'Noxx', roles: ['nuker'], profession: 'sh' },
			p1nuker6: { login: 'nartallaxp1sh6', password: passwords.a, name: 'Quxx', roles: ['nuker'], profession: 'sh' }
		}
		
	};
	
	return charconfig;

});