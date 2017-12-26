var locks = {}, listeners = {};
	
// сервис блокировок
// гарантирует, что заявки на локи будут обработаны в порядке их поступления

var lock = name => locks[name] = true;
var unlock = name => {
	delete locks[name];
	var lsers = listeners[name] || [];
	
	while(lsers.length){
		lsers.shift().call(null);
		if(locks[name]) return;
	}
	
	delete listeners[name];
}

var listenUnlock = (name, listener) => {
	
	if(!listeners[name]) listeners[name] = [];
		listeners[name].push(listener);
	
	if(!locks[name]){
		lock(name);
		setTimeout(() => unlock(name), 1);
	}
}

var acquireLock = (name, callback) => {
	listenUnlock(name, () => {
		lock(name);
		callback();
	})
};

module.exports = {
	acquire: acquireLock,
	free: unlock,
	wait: listenUnlock
};