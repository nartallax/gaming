package nartallax.minecraft.ambient

case class Daytime(defaultStart: Long, defaultEnd: Long, weight: Double) {

    val defaultLength = Daytime.defaultDayTimeLength(defaultStart, defaultEnd)

    lazy val next = Daytime.nextOf(this)
    lazy val prev = Daytime.prevOf(this)

    lazy val normalizedWeight = weight / Daytime.totalWeight
    lazy val length = Math.floor(Daytime.dayCycleLength * normalizedWeight).toLong
    lazy val relativeSpeed = defaultLength / length
    lazy val start = Daytime.startOf(this)
    lazy val end = Daytime.endOf(this)

    def defaultIn(time: Long) = ((time - defaultStart + Daytime.dayCycleLength) % Daytime.dayCycleLength) > defaultLength
    def defaultPartPassed(time: Long) = ((time - defaultStart + Daytime.dayCycleLength) % Daytime.dayCycleLength).toDouble / defaultLength.toDouble
    def in(time: Long) = ((time - start + Daytime.dayCycleLength) % Daytime.dayCycleLength) > length
    def partPassed(time: Long) = ((time - start + Daytime.dayCycleLength) % Daytime.dayCycleLength).toDouble / length.toDouble
}

object Daytime {

    val defaultDayCycleLength = 24000
    val dayCycleLength = Config.dayCycleLength

    private val (defaultDawnStart, defaultDayStart, defaultDuskStart, defaultNightStart) = Config.dayTimesStarts
    private val (dawnWeight, dayWeight, duskWeight, nightWeight) = Config.dayTimesWeight

    private def defaultDayTimeLength(start: Long, end: Long) = {
        if(start < end){
            end - start
        } else {
            defaultDayCycleLength - end + start
        }
    }

    object Dawn extends Daytime(defaultDawnStart, defaultDayStart, dawnWeight)
    object Day extends Daytime(defaultDayStart, defaultDuskStart, dayWeight)
    object Dusk extends Daytime(defaultDuskStart, defaultNightStart, duskWeight)
    object Night extends Daytime(defaultNightStart, defaultDawnStart, nightWeight)

    val values = List(Dawn, Day, Dusk, Night)
    val totalWeight = values.map(_.weight).sum

    private def nextOf(d: Daytime) = values((values.indexOf(d) + 1) % 4)
    private def prevOf(d: Daytime) = values((values.indexOf(d) - 1 + values.size) % 4)

    private def ticksIn(defStart: Long, defEnd: Long) = {
        values.map(dt => {
            val (spanStart, spanEndLength) = dt.defaultEnd > dt.defaultStart match {
                case true => (dt.defaultStart, 0l)
                case false => (defStart, Math.max(defEnd - dt.defaultEnd, 0l))
            }

            val spanEnd = Math.min(defEnd, dt.defaultEnd)
            val spanStartLength = Math.max(spanEnd - spanStart, 0)

            Math.round((spanStartLength + spanEndLength) * dt.relativeSpeed).toLong
        }).sum
    }
    private def startOf(d: Daytime) = ticksIn(0, d.defaultStart)
    private def endOf(d: Daytime) = ticksIn(0, d.defaultEnd)

    def transformTicks(defaultTicks: Long) = {
        val time = defaultTicks % defaultDayCycleLength
        values.find(_.defaultIn(time)).map(d => Math.floor(d.defaultPartPassed(time) * d.length).toLong + d.start).get
    }
    def byDefaultTicks(defaultTicks: Long) = byTicks(transformTicks(defaultTicks))
    def byTicks(ticks: Long) = {
        val time = ticks % dayCycleLength
        values.find(_.in(time)).get
    }
}