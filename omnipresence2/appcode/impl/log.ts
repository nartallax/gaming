type DateFormat = (d: Date) => string
function dateFmt(inner: DateFormat): DateFormat {
	return d => (d && (d instanceof Date))? inner(d): "";
}

function twoDigits(n: number): string{
	return n > 9? n + '': '0' + n;
}
function threeDigits(n: number): string {
	return n > 99? n + '': '0' + twoDigits(n);
}

const localDate = dateFmt((d: Date) => d.getFullYear() + '.' + twoDigits(d.getMonth() + 1) + '.' + twoDigits(d.getDate()))
const localTimeHours = dateFmt((d: Date) => twoDigits(d.getHours()))
const localTimeMinutes = dateFmt((d: Date) => localTimeHours(d) + ':' + twoDigits(d.getMinutes()))
const localTimeSeconds = dateFmt((d: Date) => localTimeMinutes(d) + ':' + twoDigits(d.getSeconds()))
const localTimeMilliseconds = dateFmt((d: Date) => localTimeSeconds(d) + ':' + threeDigits(d.getMilliseconds()))
const localTimeToMilliseconds = dateFmt((d: Date) => localDate(d) + " " + localTimeMilliseconds(d))

export function log(v: string){
	console.error(localTimeToMilliseconds(new Date()) + " | " + v);
}