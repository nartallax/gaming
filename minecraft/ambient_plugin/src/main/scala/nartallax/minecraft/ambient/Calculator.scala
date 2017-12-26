package nartallax.minecraft.ambient

class Calculator(currentDayTime: Long) {

    private val launchOffset = Daytime.transformTicks(currentDayTime)

    def getExpectedTime(elapsedFromAppStartTicks: Long): Long = {
        val time = (elapsedFromAppStartTicks + launchOffset) % Daytime.dayCycleLength
        val d = Daytime.byTicks(time)

        if(elapsedFromAppStartTicks % 20 == 0){
            println("TIME: " + d + ", " + d.partPassed(time))
        }

        Math.floor(d.partPassed(time) * d.defaultLength).toLong + d.defaultStart
    }

    private def generateMarginedValue(p: (Double, Double)) = p._1 + ((Math.random() * 2) - 1) * p._2
    private def generateCalmWeight = generateMarginedValue(Config.calmWeight)
    private def generateRainWeight = generateMarginedValue(Config.rainWeight)
    private def generateStormWeight = generateMarginedValue(Config.stormWeight)
    private def generateWeatherCycleLength = Math.round(generateMarginedValue(Config.weatherCycle))
    private def generateWeatherChangeFrequency = Math.round(generateMarginedValue(Config.weatherFrequency))

    private def generateWeightedWeather = List(
        Weather.Calm -> generateCalmWeight,
        Weather.Rain -> generateRainWeight,
        Weather.Storm -> generateStormWeight
    ).filter(_._2 > 0)

    private def generateTimedWeather = {
        val weighted = generateWeightedWeather
        val totalWeight = weighted.map(_._2).sum
        val totalTime = generateWeatherCycleLength
        weighted.map(p => p._1 -> Math.floor((p._2 / totalWeight) * totalTime).toLong)
    }

    private def generateSplittedWeather(prevWeather: Weather, prevPrevWeather: Option[Weather]): List[(Weather, Long)] = {
        val timed = generateTimedWeather.toMap
        val blockCount = Math.max(generateWeatherChangeFrequency, timed.size)

        def nextBlocks(remainCount: Int, prev: Weather, prevPrev: Option[Weather]): List[Weather] = {
            remainCount match {
                case 0 => List()
                case _ =>
                    val newWeather = prev match {
                        case Weather.Calm | Weather.Storm => Weather.Rain
                        case Weather.Rain => prevPrev.getOrElse(Weather.Rain) match {
                            case Weather.Calm => Weather.Storm
                            case Weather.Storm => Weather.Calm
                            case Weather.Rain => Math.random() > 0.5 match {
                                case true => Weather.Storm
                                case false => Weather.Calm
                            }
                        }
                    }
                    newWeather :: nextBlocks(remainCount - 1, newWeather, Some(prev))
            }
        }

        val rawBlocks = nextBlocks(blockCount.toInt, prevWeather, prevPrevWeather)
        val typedBlockCount = rawBlocks.groupBy(w => w).map(p => p._1 -> p._2.size)
        val typedBlockAvgLength = typedBlockCount.map(p => p._1 -> Math.round(timed.getOrElse(p._1, 0l).toDouble / p._2.toDouble))

        rawBlocks.map(w => w -> typedBlockAvgLength(w))
    }

    // at least 1 weather item in old block is required
    def generateNextWeatherBlock(prevBlock: List[(Weather, Long)]): List[(Weather, Long)] = {
        val reversedOld = prevBlock.reverse
        val prevWeather = reversedOld.head._1
        val prevPrevWeather = reversedOld.size match {
            case 1 => None
            case _ => Some(reversedOld(1)._1)
        }

        generateSplittedWeather(prevWeather, prevPrevWeather).filter(_._2 > 0).map(p => p._1 -> Math.max(p._2, Config.weatherMinLength))
    }

}
