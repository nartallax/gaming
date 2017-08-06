pkg('op.clients', () => {
	// этот пакет нужен исключительно для того, чтобы не создавать рекурсивной зависимости

	var Client = pkg('op.client');
		
	Client.localClientClass = pkg('op.client.local');
	Client.remoteClientClass = pkg('op.client.remote');
		
	return Client;

});