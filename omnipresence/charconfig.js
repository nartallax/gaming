pkg('charconfig', () => {

	// passwords.json - json с паролями. ожидается JSON-объект со строковыми значениями
	// в отдельном файле - для удобства контроля (например, он не заливается в репозиторий)
	// на него ссылается только этот файл, из charconfig.characters
	var passwords = JSON.parse(pkg.external('fs').readFileSync('passwords.json', 'utf8'));

	var charconfig = {
		
		defaultSimpleGraph: true,
		
		hosts: {
			lesserLaptop:	{ ip: 'nartallax-ll',		hostname: 'nartallax-ll',		role: 'slave'	},
			oldLaptop:		{ ip: 'nart-old-laptop',	hostname: 'nart-old-laptop',	role: 'slave'	},
			mainLaptop: 	{ ip: 'nartallax-w7',		hostname: 'nartallax-w7',		role: 'master'	}
		},
		
		clients: {
			main: { binary: "C:\\game\\L2\\system\\L2.exe", simpleGraph: false, affinity: 0, isMain: true},
			secondary: { binary: "C:\\game\\L2secondary\\system\\L2.exe", isDefault: true, simpleGraph: true, affinity: [2, 4, 6] },
			mundane: { binary: "C:\\game\\L2secondary\\system\\L2.exe", simpleGraph: true, affinity: [2, 4, 6] },
			lesser: { binary: "C:\\game\\L2secondary\\system\\L2.exe", simpleGraph: true, affinity: [0, 2], host: 'lesserLaptop' },
			old: { binary: "C:\\game\\L2secondary\\system\\L2.exe", simpleGraph: true, affinity: [0, 2], host: 'oldLaptop' },
		},
		
		characters: {
			p1tank:   { login: 'KKCnarttk1', password: passwords.a, name: 'Panzerbjorn', roles: ['melee', 'tank'], profession: 'sk' },
			p1se1:    { login: 'CQZnartse1', password: passwords.a, name: 'Pepyaka', roles: ['buffer', 'healer', "recharger"], profession: 'se' },
			p1pp1:    { login: 'SCXnartpp1', password: passwords.a, name: 'ВОВАН', roles: ['buffer', 'healer'], profession: 'pp' },
			p1nuker1: { login: 'WSKnartsh1', password: passwords.a, name: 'Kawaika', roles: ['nuker'], profession: 'sh' },
			p1nuker2: { login: 'CQAnartsh2', password: passwords.a, name: 'Tassadar', roles: ['nuker'], profession: 'sh' },
			p1nuker3: { login: 'RPHnartsh3', password: passwords.a, name: 'I18nL10n', roles: ['nuker'], profession: 'sh' },
			p1nuker4: { login: 'ZFCnartsh4', password: passwords.a, name: 'ZorDe', roles: ['nuker'], profession: 'sh' },
			p1nuker5: { login: 'HUWnartsh5', password: passwords.a, name: 'KYCAKA', roles: ['nuker'], profession: 'sh' },
			p1nuker6: { login: 'WLKnartsh6', password: passwords.a, name: 'Grenka', roles: ['nuker'], profession: 'sh' },
			
			p2tank:   { login: 'FLXnarttk2', password: passwords.a, name: 'Panzer', roles: ['melee', 'tank'], profession: 'da' },
			p2nuker1: { login: 'HKEnartsh7', password: passwords.a, name: 'BromButan', roles: ['nuker'], profession: 'sh' },
			p2nuker2: { login: 'JFPnartsh8', password: passwords.a, name: 'BOMBANYLO', roles: ['nuker'], profession: 'sh' },
			p2nuker3: { login: 'MIPnartsh9', password: passwords.a, name: 'RmRf', roles: ['nuker'], profession: 'sh' },
			p2nuker4: { login: 'GWOnartsh10',password: passwords.a, name: 'Narimanchik', roles: ['nuker'], profession: 'sh' },
			p2nuker5: { login: 'QTPnartsh11',password: passwords.a, name: 'Vduvatel', roles: ['nuker'], profession: 'sh' },
			p2nuker6: { login: 'REUnartsh12',password: passwords.a, name: 'Spoon', roles: ['nuker'], profession: 'sh' },
			p2nuker7: { login: 'JTCnartsh13',password: passwords.a, name: 'ItsOver9000', roles: ['nuker'], profession: 'sh' },
			p2nuker8: { login: 'TYVnartsh14',password: passwords.a, name: 'ULTRAKILL', roles: ['nuker'], profession: 'sh' },
			p2nuker9: { login: 'RCRnartsh15',password: passwords.a, name: 'RagefulZero', roles: ['nuker'], profession: 'sh' },
			p2nuker10:{ login: 'DXBnartsh16',password: passwords.a, name: 'ZorgZorg', roles: ['nuker'], profession: 'sh' },
			p2nuker11:{ login: 'ESQnartsh17',password: passwords.a, name: 'NISHTYAK', roles: ['nuker'], profession: 'sh' },
			p2nuker12:{ login: 'AWDnartsh18',password: passwords.a, name: 'Tworeest', roles: ['nuker'], profession: 'sh' },
			p2se1:    { login: 'CNQnartse2', password: passwords.a, name: 'KratosGirl', roles: ['buffer', 'healer', "recharger"], profession: 'se' },
			p2pp1:    { login: 'PVRnartpp2', password: passwords.a, name: 'Jovovich', roles: ['buffer', 'healer'], profession: 'pp' },
			p2ee1:    { login: 'CYLnartee1', password: passwords.a, name: 'Platinum', roles: ['buffer', 'healer', "recharger"], profession: 'ee' },
			
			sp:       { login: "MGLnartsp1", password: passwords.a, name: "CherryLoli", roles: ["melee"], profession: "sp"},
			cr:       { login: "IZXnartcr1", password: passwords.a, name: "dOOb", roles: ["ballast"], profession: "cr"}
		}
		
	};
	
	return charconfig;

});