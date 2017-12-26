/*
	имплементация хеш-функции Keccak (а именно, перевод с Питона эталонной имплементации)
	не проходит все эталонные тесты sha-3 (питонья имплементация тоже не проходит)
*/

module.exports = (function(){
	
	/* 
	вспомогательный класс для операций над массивом байт 
	подразумевается, что весь массив - одно большое число произвольной разрядности;
	все неопределенные разряды этого числа - старшие и считаются равными нулю
	*/
	var bytes = (function(){
		// utils
		var splitByBytes = function(val){
			var result = [];
			while(val > 0) {
				result.push(val % 256);
				val = ~~(val / 256);
			}
			return result;
		}
		var byteToBin = function(num){
			var result = '';
			for(var i = 0; i < 8; i++){
				result = (num % 2) + result;
				num = ~~(num/2);
			}
			return result;
		}
		var hexToBytes = function(hex){
			if((hex.length % 2) !== 0) hex = '0' + hex;
			var i = hex.length, result = [];
			while((i -= 2) >= 0) result.push(parseInt('0x' + hex.substr(i, 2)));
			return result;
		}
		
		// constructor
		var bytes = function(v, inv){
			if(v instanceof bytes) return v;
			if(!(this instanceof bytes)) return new bytes(v, inv);
			switch(typeof(v)){
				case 'number': this.val = splitByBytes(v); break;
				case 'string': this.val = hexToBytes(inv? bytes(v).revhex(): v); break;
				case 'object': this.val = v; break; // assuming array
				default: throw "Could not create bytes of '"  + v + "'.";
			}
			return this;
		}
		
		// basic type conversion
		bytes.prototype.num = function(){
			var result = 0, a = this.val, i = a.length;
			while(i-->0){
				result *= 256;
				result += this.val[i];
			}
			return result;
		}
		bytes.prototype.bin = function(){
			var result = '', a = this.val, i = a.length;
			while(--i>=0) result = byteToBin(a[i]) + result;
			return result;
		}
		bytes.prototype.hex = function(){
			var result = '', a = this.val, i = a.length;
			while(--i>=0) result += ((a[i] < 16?'0':'') + a[i].toString(16));
			return result.toUpperCase();
		}
		bytes.prototype.revhex = function(){
			var result = '', a = this.val, i = a.length;
			while(--i>=0) result = ((a[i] < 16?'0':'') + a[i].toString(16)) + result;
			return result.toUpperCase();
		}
		bytes.prototype.toString = function(){return this.hex();}
		
		// basic data operationa
		var xor = function(a, b){
			var result = [], l = a.length > b.length? a.length: b.length, i = -1;
			while(++i < l) result.push((a[i] || 0) ^ (b[i] || 0));
			return result;
		}
		var and = function(a, b){
			var result = [], l = a.length > b.length? a.length: b.length, i = -1;
			while(++i < l) result.push((a[i] || 0) & (b[i] || 0));
			return result;
		}
		var or = function(a, b){
			var result = [], l = a.length > b.length? a.length: b.length, i = -1;
			while(++i < l) result.push((a[i] || 0) | (b[i] || 0));
			return result;
		}
		var inv = function(a){
			var result = [];
			for(var i in a) result.push(~a[i]);
			return result;
		}
		var rol = function(a, v){
			var result = [], zeroes = ~~(v / 8), b, p;
			while(zeroes-->0) result.push(0);
			v %= 8;
			for(var i in a){
				b = a[i];
				p = a[i - 1] || 0;
				b = (b * 256) + p;
				b = b << v;
				b &= 0xff00;
				b = b >> 8;
				result.push(b);
			}
			b = a[a.length - 1];
			b = b << v;
			b &= 0xff00;
			b = b >> 8;
			if(b !== 0)	result.push(b);
			return result;
		}
		var ror = function(a, v){
			var result = [], i = (~~(v / 8)) - 1, b, p;
			v %= 8;
			while(++i < a.length){
				b = a[i];
				p = a[i + 1] || 0;
				b = (p * 256) + b;
				b = b >> v;
				b &= 0xff;
				result.push(b);
			}
			return result;
		}
		var size = function(a, s){
			var result = [], i = -1;
			while(++i < s) result[i] = (a[i] || 0);
			return result;
		}
		var rcl = function(a, v){
			var lstart = a.length, pos = ~~(v / 8), sub = rol(a, v % 8), result = [];
			if(sub.length > lstart) sub[0] |= sub.pop();
			var i = sub.length;
			while(i-->0)
				result[(i + pos) % sub.length] = sub[i];
			return result;
		}
		var mpt = function(a, v){ // mpt = Modulo by Power of Two. expecting number
			var result = [], i = 0;
			while(v >= 8){
				result.push(a[i++]);
				v -= 8;
			}
			switch(v){
				case 0: return result;
				case 1: v = 0x1; break;
				case 2: v = 0x3; break;
				case 3: v = 0x7; break;
				case 4: v = 0xf; break;
				case 5: v = 0x1f; break;
				case 6: v = 0x3f; break;
				case 7: v = 0x7f; break;
			}
			result.push(a[i] & v);
			return result;
		}
		// no rcr yet
		
		// data operation bindings
		bytes.prototype.sxor = 	function(v){ this.val = xor(this.val, bytes(v).val); return this;}
		bytes.prototype.xor = 	function(v){ return new bytes(xor(this.val, bytes(v).val)); }
		bytes.prototype.sand = 	function(v){ this.val = and(this.val, bytes(v).val); return this;}
		bytes.prototype.and = 	function(v){ return new bytes(and(this.val, bytes(v).val)); }
		bytes.prototype.sor = 	function(v){ this.val = or(this.val, bytes(v).val); return this;}
		bytes.prototype.or = 	function(v){ return new bytes(or(this.val, bytes(v).val)); }
		bytes.prototype.inv = 	function(){ return new bytes(inv(this.val));}
		bytes.prototype.sinv = 	function(){ this.val = or(this.val, bytes(v).val); return this;}
		bytes.prototype.rol = 	function(v){ return new bytes(rol(this.val, v)); }
		bytes.prototype.srol = 	function(v){ this.val = rol(this.val, v); return this; }
		bytes.prototype.ror = 	function(v){ return new bytes(ror(this.val, v)); }
		bytes.prototype.sror = 	function(v){ this.val = ror(this.val, v); return this; }
		bytes.prototype.size = 	function(v){ return new bytes(size(this.val, v)); }
		bytes.prototype.ssize =	function(v){ this.val = size(this.val, v); return this; }
		bytes.prototype.rcl = 	function(v){ return new bytes(rcl(this.val, v)); }
		bytes.prototype.srcl = 	function(v){ this.val = rcl(this.val, v); return this; }
		bytes.prototype.mpt = 	function(v){ return new bytes(mpt(this.val, v)); }
		bytes.prototype.smpt = 	function(v){ this.val = mpt(this.val, v); return this; }
		
		return bytes;
	})();
	
	// Round Constants
	var RC = [	bytes('0000000000000001'), bytes('0000000000008082'), bytes('800000000000808A'), bytes('8000000080008000'),
				bytes('000000000000808B'), bytes('0000000080000001'), bytes('8000000080008081'), bytes('8000000000008009'),
				bytes('000000000000008A'), bytes('0000000000000088'), bytes('0000000080008009'), bytes('000000008000000A'),
				bytes('000000008000808B'), bytes('800000000000008B'), bytes('8000000000008089'), bytes('8000000000008003'),
				bytes('8000000000008002'), bytes('8000000000000080'), bytes('000000000000800A'), bytes('800000008000000A'),
				bytes('8000000080008081'), bytes('8000000000008080'), bytes('0000000080000001'), bytes('8000000080008008')];
				
	// Rotation offsets
	var r = [	[0,    36,     3,    41,    18],
				[1,    44,    10,    45,     2],
				[62,    6,    43,    15,    61],
				[28,   55,    25,    21,    56],
				[27,   20,    39,     8,    14]];

	// tuning variables; remain constant for single hash
	var b, w, l, nr;
	
	var byteToHex = function(b){ return (b < 16? '0': '') + b.toString(16); }
	var strrep = function(str, rep) { var res = ''; while(rep-->0) res += str; return res; }
	
	var strToTable = function(str){
		if((w % 8) !== 0) throw "W is not multiple of 8";
		if(str.length !== (~~((2 * b)/8))) throw "String could not be divided by blocks";
		var i, j, output = [[],[],[],[],[]];
		for(i = 0; i < 5; i++)
			for(j = 0; j < 5; j++)
				output[i][j] = bytes(str.substr(2 * (~~((((5 * j) + i) * w)/8)), ~~((2 * w)/8)), true);
		return output;
	}
	
	var tableToStr = function(table){
		if((w % 8) !== 0) throw "W is not multiple of 8";
		if(table.length !== 5) throw "Table must be 5x5";
		for(var i in table) if(table[i].length !== 5) throw "Table must be 5x5";
		
		var output = '', i, j;
		for(i = 0; i < 5; i++)
			for(j = 0; j < 5; j++)
				output += table[j][i].revhex();
		return output;
	}
	
	var init = function(initval){
		if(initval !== 25 && initval !== 50 && initval !== 100 && initval !== 200 && initval !== 400 && initval !== 800 && initval !== 1600)
			throw "Unsupported init value.";
			
		b = initval;
		w = ~~(b / 25);
		l = ~~(Math.log(w) / Math.log(2));
		nr = 12 + (2 * l);
	}
	
	var KeccakF = function(A){
		for(var rnd = 0; rnd < nr; rnd++) {
		
			var B = [[],[],[],[],[]], C = [], D = [], i, j;
		
			for(i = 0; i < 5; i++)	C[i] = A[i][0].xor(A[i][1]).xor(A[i][2]).xor(A[i][3]).xor(A[i][4]);
			for(i = 0; i < 5; i++)	D[i] = C[(i + 4) % 5].xor(C[(i + 1) % 5].rcl(1)); 
			for(i = 0; i < 5; i++)	for(j = 0; j < 5; j++)	A[i][j].sxor(D[i]);
			for(i = 0; i < 5; i++)	for(j = 0; j < 5; j++)	B[j][((2 * i) + (3 * j)) % 5] = A[i][j].rcl(r[i][j] % w);
			for(i = 0; i < 5; i++)	for(j = 0; j < 5; j++)	A[i][j] = B[i][j].xor(B[(i + 1) % 5][j].inv().and(B[(i + 2) % 5][j]));
			A[0][0].sxor(RC[rnd].mpt(w));
			
		}
		return A;
	}
	
	var pad10star1 = function(len, str, n){
		if((n % 8) !== 0) throw "N is not multiple of 8."
		if((str.length % 2) !== 0) str += '0';
		if(len > ((~~(str.length / 2)) * 8)) throw "the string is too short to contain the number of bits announced";
		
		var nrBytesFilled = ~~(len/8), nbrBitsFilled = len % 8, l = len % n, myByte, nInRange = (n < 10 && n > 3);
		
		myByte = nbrBitsFilled === 0? 0: parseInt('0x' + str.substr(nrBytesFilled * 2, 2), 16);
		myByte = (myByte >> (8 - nbrBitsFilled)) + Math.pow(2, nbrBitsFilled) + (nInRange? Math.pow(2, 7): 0);
		str = str.substring(0, nrBytesFilled * 2) + byteToHex(myByte);
		if(!nInRange) {
			while(((~~((8 * str.length) / 2)) % n) < (n - 8)) 
				str += '00';
			str += '80';
		}
		
		return str;
	}
	
	var Keccak = function(len, str, r, c, n){
		if(r === undefined) r = 1024;
		if(c === undefined) c = 576;
		if(n === undefined) n = 1024;
		
		if((r < 0) || ((r % 8) !== 0)) throw 'r must be a multiple of 8 in this implementation';
		if((n % 8) !== 0) throw 'outputLength must be a multiple of 8';
		
		init(r + c);
		
		var S = [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]], P = pad10star1(len, str, r);
		
		var iterlim = ~~(~~((P.length * 8) / 2) / r), i, j, k;
		for(i = 0; i < iterlim; i++){
			var Pi = strToTable(P.substring(i * (~~((2 * r)/8)), (i + 1) * (~~((2 * r)/8))) + strrep('00',~~(c/8)));
			for(j = 0; j < 5; j++) 
				for(k = 0; k < 5; k++) 
					S[k][j] = Pi[k][j].xor(S[k][j]);
			S = KeccakF(S);
		}
		
		var Z = '', outputLength = n;
		while(outputLength > 0){
			Z += tableToStr(S).substring(0, ~~((r * 2)/8));
			outputLength -= r;
			if(outputLength > 0) S = KeccakF(S);
		}
		
		return Z.substring(0, ~~((2 * n)/8));
	}
	
	var toUTF8Array = function (str) {
		var utf8 = [];
		for (var i=0; i < str.length; i++) {
			var charcode = str.charCodeAt(i);
			if (charcode < 0x80) 
				utf8.push(charcode);
			else if (charcode < 0x800) 
				utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
			else if (charcode < 0xd800 || charcode >= 0xe000)
				utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode>>6) & 0x3f), 0x80 | (charcode & 0x3f));
			else
				// let's keep things simple and only handle chars up to U+FFFF...
				utf8.push(0xef, 0xbf, 0xbd); // U+FFFE "replacement character"
		}
		return utf8;
	}
	
	var salt = '';
	
	var hashString = function(str){ 
		str = bytes(toUTF8Array(str + salt)).revhex();
		return Keccak(str.length * 4, str, 576, 1024, 512);
	}
			
	hashString.ofHex = function(hex){
		return Keccak(hex.length * 4, hex, 576, 1024, 512)
	}
	
	hashString.setSalt = function(s){ salt = s; }
			
	return hashString;
})();