pkg('op.core.selection.strategy', () => {

	var log = pkg('util.log');

	// стратегия выбора ядра процессора, на котором будет исполняться клиент
	// в ходе экспериментов было выявлено, что клиенты почему-то кучкуются на одном ядре, и нужно их вручную разносить
	
	// avail - available on the system at all, array of number
	// occupied - already taken by some other process, map number -> array of string (that are algo names)
	// avail > occupied always
	var affinityStrategies = {
		
		// выбирает одно свободное ядро. предполагается к использованию на главном окне
		dedicatedCore: (avail, occupied) => {
			var freeCores = avail.filter(x => occupied[x].length === 0);
			if(freeCores.length === 0){
				log('Warning: could not find suitable processor core for client (at dedicatedCore strategy). Will use occupied core.');
				return avail[0];
			} else {
				return freeCores[0];
			}
		},
		
		// выбирает то же ядро, что раньше было уже выбрано этим алгоритмом, или любое свободное
		allOnSingleCore: (avail, occupied) => {
			var takenCores = avail.filter(x => occupied[x].filter(x => x === 'allOnSingleCore').length > 0);
			if(takenCores.length > 0){
				return takenCores[0];
			} else {
				var freeCores = avail.filter(x => occupied[x].length === 0);
				if(freeCores.length > 0){
					return freeCores[0];
				} else {
					log('Warning: could not find suitable processor core for client (at allOnSingleCore strategy). Will use occupied core.');
					return avail[0];
				}
			}
			return takenCores.length > 0? takenCores[0]: avail[0];
		},
		
		// старается занять свежее ядро; если такого нет - выбирает среди ядер, занятых тем же алгоритмом
		groupSharedCore: (avail, occupied) => {
			var freeCores = avail.filter(x => occupied[x].length === 0);
			if(freeCores.length > 0){
				return freeCores[0]
			} else {
				var takenCores = avail.filter(x => occupied[x].filter(x => x === 'groupSharedCore').length > 0);
				if(takenCores.length > 0){
					var lowestOcuppiedIndex = 0, lowestOccupiedCount = occupied[takenCores[i]].filter(x => x === 'groupSharedCore').length;
					for(var i = 1; i < takenCores.length; i++){
						var count = occupied[takenCores[i]].filter(x => x === 'groupSharedCore').length;
						if(count < lowestOccupiedCount){
							lowestOccupiedCount = count;
							lowestOcuppiedIndex = i;
						}
					}
					return takenCores[lowestOcuppiedIndex];
				} else {
					log('Warning: could not find suitable processor core for client (at groupSharedCore strategy). Will use occupied core.');
					return avail[0];
				}
			}
		}
		
	};
	
	return affinityStrategies;

})