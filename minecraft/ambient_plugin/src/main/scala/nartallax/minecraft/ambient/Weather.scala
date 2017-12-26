package nartallax.minecraft.ambient

import org.bukkit.Bukkit

import scala.collection.JavaConversions._

object Weather {
    object Calm extends Weather(false, false)
    object Rain extends Weather(true, false)
    object Storm extends Weather(true, true)

    def get = {
        val w = Bukkit.getServer.getWorlds.head
        getFor(w.hasStorm, w.isThundering)
    }

    def getFor(isRaining: Boolean, isStorming: Boolean) = {
        isRaining match {
            case false => Calm
            case true => isStorming match {
                case false => Rain
                case true => Storm
            }
        }
    }
}

case class Weather(isRaining: Boolean, isStorming: Boolean){

    def set(duration: Int = 0xffffffff) = {
        Bukkit.getServer.getWorlds.foreach(w => {
            w.setWeatherDuration(duration)
            w.setThunderDuration(duration)
            w.setStorm(isRaining)
            w.setThundering(isStorming)
        })
    }

}