pkg('config', () => {

	return {
		keyloggerBinary: 'hooker_dumper\\hooker_dumper.exe',

		expectedWindowCaption: 'Lineage II',
		windowSearchInterval: 100,
		windowActivationInterval: 5000,
		windowActivationLag: 1000,
		minorInterfaceLag: 250,
		windowSwitchLag: 2500,
		colorCheckInterval: 100,
		loginStepDelay: 5000
	}
});