pkg("op.snitch", () => {
	
	let ffi = pkg.external('ffi'),
		lib = ffi.Library("./snitch/snitch.dll", {
			getBarState: ['int32', ['uint32']]
        });
	
	return {
		getBarState: hwnd => {
			let resp = lib.getBarState(hwnd);
			return {hp: ((resp >> 12) & 0xfff) / 0xfff, mp: (resp & 0xfff) / 0xfff}
		}
	}

});