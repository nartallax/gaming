import * as net from "net";
import {log} from "impl/log";

/** Здесь определяются функции, позволяющие обмениваться JSON-сообщениями по сети */

/** Получать JSON-сообщения из сокета и дергать за onJson при получении */
export function receiveJsonMessages(socket: net.Socket, onJson: (data: any) => void) {
	let received = [] as Buffer[], 
		tmpData = null as Buffer | null,	// невостребованный кусок данных, содержащий неполные 4 байта длины
		waitingLength = 0; // длина сообщения, который мы ждем
	
	let processData = (data: Buffer) => {
		if(tmpData){
			data = Buffer.concat([tmpData, data]);
			tmpData = null;
		}

		if(waitingLength < 1){
			// значит, это начало сообщения
			if(data.length < 4){
				//log('received partial package: ' + data.length + ' of 4 bytes.');
				tmpData = data; // пока что невозможно сказать, какой длины будет сообщение. просто ждем следующего пакета
				return;
			}
			
			waitingLength = data.readInt32LE(0) + 4;
			//log('received package header: ' + waitingLength + ' long.');
		}
		
		// значит, это середина сообщения
		if(data.length >= waitingLength){
			//log('received package end!');
			received.push(data.slice(0, waitingLength));
			var remains = data.slice(waitingLength);
			waitingLength = 0;
			
			var totalBuffer = Buffer.concat(received);
			received = [];
			
			var json = totalBuffer.slice(4).toString('utf8');
			//log('parsing ' + (totalBuffer.length - 4) + ' bytes, ' + json.length + ' characters');
			try {
				json = JSON.parse(json);
			} catch(e){
				log('Failed to parse JSON from server: ' + json);
				log(e.stack)
				return;
			}
			onJson(json);
			
			if(remains.length > 0) processData(remains);
		} else {
			received.push(data);
			waitingLength -= data.length;
			//log('received package part; ' + waitingLength + ' remaining.');
		}
	}

	socket.on('data', processData);
}

/** Записать в указанный сокет указанные данные */
export function sendJsonMessage(socket: net.Socket, json: any){
	(typeof(json) !== 'string') && (json = JSON.stringify(json));
	var len = Buffer.byteLength(json, 'utf8'),
		data = Buffer.allocUnsafe(len + 4);
		
	data.writeInt32LE(len, 0);
	data.write(json, 4, len, 'utf8');
	socket.write(data);
}