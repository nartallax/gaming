import {HostDefinition} from "interfaces/config";

/** В этом файле мы перечисляем все хосты, на которых будет запущена эта программа */
export const hostsConfig: HostDefinition[] = [
	/** Обязательно указываем один из хостов в качестве мастера
	 * Мастер-хост - тот, за которым сидит человек и отдает приказы всей системе */
	{ hostname: "nartallax-laptop", isMaster: true },
	{ hostname: "nartallax-small-computer" },
]