package nartallax.minecraft.ambient

import java.util.concurrent.atomic.{AtomicInteger, AtomicLong, AtomicReference}

import org.bukkit.plugin.java.JavaPlugin

import scala.collection.JavaConversions._

class AmbientPlugin extends JavaPlugin with Runnable {

    AmbientPlugin.instance = this

    private def world = getServer.getWorlds.head

    private def log(msg: Any) = getLogger.info(msg.toString)
    private val calc = new AtomicReference[Calculator](null)
    private val weatherBlock = new AtomicReference[List[(Weather, Long)]](null)
    private val elapsedTickCounter = new AtomicLong(0)
    private val remainingWeatherTime = new AtomicLong(0)
    private val currentWeatherIndex = new AtomicInteger(0)

    override def onEnable() = {
        getServer.getScheduler.scheduleSyncRepeatingTask(this, this, 0, 1)

        calc.set(new Calculator(world.getTime))
        weatherBlock.set(List(Weather.get -> 0))
        elapsedTickCounter.set(0)
        remainingWeatherTime.set(0)
        currentWeatherIndex.set(0)

        world.setGameRuleValue("doDaylightCycle", "false")
        Weather.Calm.set()
    }

    override def onDisable() = {
        getServer.getScheduler.cancelTasks(this)

        calc.set(null)
        weatherBlock.set(null)

        world.setGameRuleValue("doDaylightCycle", "true")
        Weather.get.set(1000)
    }

    def adjustTime() = {
        val time = calc.get.getExpectedTime(elapsedTickCounter.incrementAndGet())
        if(world.getTime != time) {
            world.setTime(time)
        }
    }

    def adjustWeather() = {
        if(remainingWeatherTime.decrementAndGet() <= 0){

            if(currentWeatherIndex.incrementAndGet() >= weatherBlock.get.size){
                weatherBlock.set(calc.get.generateNextWeatherBlock(weatherBlock.get))
                currentWeatherIndex.set(0)
            }

            val weather = weatherBlock.get()(currentWeatherIndex.get)
            remainingWeatherTime.set(weather._2)
            weather._1.set()
        }
    }

    override def run() = {
        adjustTime()
        /*
        synchronized {
            adjustTime()
            adjustWeather()
        }
        */
    }

}

object AmbientPlugin {
    var instance: AmbientPlugin = null
}