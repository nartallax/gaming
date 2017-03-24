// omnipresense - a tool to simplify multi-window gaming for Lineage II
require('../javascript-common/meta/addict.js')
	.resolvers(['node', {'../javascript-common': ''}])
	.main(() => {
		
		var log = pkg('util.log'),
			ffi = pkg.external('ffi'),
			ref = pkg.external('ref');
			
		var voidptr = ref.refType('void'),
			refulong = ref.refType('ulong');
			cstring = ref.types.CString,
			refcstring = ref.refType(cstring),
			refrefcstring = ref.refType(refcstring);
		
		var user32 = ffi.Library('user32', {
			//RegisterHotKey: ['bool', ['uint', 'int', 'uint', 'uint']]
			SetWindowsHookExW: ['long', ['int', voidptr, 'long', 'ulong']],
			GetForegroundWindow: ['long', []],
			GetWindowThreadProcessId: ['ulong', ['long', refulong]]
		});
		
		var kernel32 = ffi.Library('Kernel32', {
			GetCurrentThreadId: ['uint', []],
			GetLastError: ['ulong', []],
			GetModuleHandleW: ['long', [ref.refType('int8')]],
			FormatMessageW: ['ulong', ['ulong', 'ulong', 'ulong', 'ulong', refrefcstring, 'ulong'], {'varargs': true}]
		});
		
		
		var keyPressCallback = ffi.Callback(voidptr, ['int', voidptr, voidptr], (code, lparam, wparam) => {
			log('CALLED');
		});
		
		//setInterval(() => {}, 1000);
		
		//setTimeout(() => {
			var pidRef = ref.alloc('long');
			
			var fgw = user32.GetForegroundWindow(),
				threadId = user32.GetWindowThreadProcessId(fgw, pidRef),
				pid = pidRef.deref();
			
			var currentModule = kernel32.GetModuleHandleW(ref.NULL);
			var hookHandle = user32.SetWindowsHookExW(2, keyPressCallback, currentModule, threadId);
			
			//var hookHandle = user32.SetWindowsHookExW(2, keyPressCallback, ref.NULL, kernel32.GetCurrentThreadId());
			log('hhandle = ' + hookHandle);
			
			if(hookHandle === 0){
				var lastErr = kernel32.GetLastError();
				log('last error code = ' + lastErr);
				
				var buf = new Buffer(4096);
				var bufref = ref.alloc(ref.refType('char'), buf);
				
				var size = kernel32.FormatMessageW()(/*0x00000100 | */0x00001000 | 0x00000200, ref.NULL, lastErr, 0, buf, 0)
				log('size = ' + size);
				if(size !== 0){
					log('msg: ' + ref.readCString(buf, 0));
					log('DONE');
				}
				
			}
			
		//}, 1000);
		
	});