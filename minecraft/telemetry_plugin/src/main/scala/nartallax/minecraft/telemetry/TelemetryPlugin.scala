package nartallax.minecraft.telemetry

import java.io.{FileOutputStream, File}
import java.text.{DecimalFormatSymbols, DecimalFormat}
import java.util.Locale
import java.util.concurrent.atomic.{AtomicBoolean, AtomicLong, AtomicInteger}

import org.bukkit.plugin.java.JavaPlugin

import scala.concurrent.{ExecutionContext, Future}

class TelemetryPlugin extends JavaPlugin with Runnable {

    TelemetryPlugin.instance = this

    private val updateFreq = 15 * 1000; // msec
    private val outFile = getDataFolder.toPath.resolve(Config("output_file")).toFile
    private val playersDir = new File(Config("players_dir"))

    getDataFolder.mkdir() // just in case

    private def log(msg: String) = getLogger.info(msg)

    private val tickCount = new AtomicInteger(0)
    private def increaseTickCount() = tickCount.incrementAndGet()
    private def getAndClearTickCount() = {
        val res = tickCount.get
        tickCount.set(0)
        res
    }

    override def onEnable() = {
        getServer.getScheduler.scheduleSyncRepeatingTask(this, this, 0, 1)
        flushCancelled.set(false)
        scheduleFlush()
    }
    override def onDisable() = {
        getServer.getScheduler.cancelTasks(this)
        flushCancelled.set(true)
    }

    override def run() = increaseTickCount()

    private val lastLaunchTime = new AtomicLong(System.currentTimeMillis())
    private def getAndClearTimeGap() = {
        val now = System.currentTimeMillis()
        val gap = now - lastLaunchTime.get
        lastLaunchTime.set(now)
        gap
    }

    private def gatherDataAndResetCounters() = {
        val timeGap = getAndClearTimeGap()
        val ticksPassed = getAndClearTickCount()
        val tps = (ticksPassed.toDouble * 1000d) / timeGap.toDouble
        val registeredPlayerCount = playersDir.listFiles.size
        val onlinePlayerCount = getServer.getOnlinePlayers.size
        val maxPlayers = getServer.getMaxPlayers

        val tpsFormatted = new DecimalFormat("#.####", new DecimalFormatSymbols(Locale.forLanguageTag("EN"))).format(tps)

        Map(
            "tps" -> tpsFormatted,
            "total_players" -> registeredPlayerCount.toString,
            "online_players" -> onlinePlayerCount.toString,
            "max_players" -> maxPlayers.toString
        )
    }
    private def flush(data: Map[String, String]) = {
        // это немного неправильно - прописывать JSON руками
        // но я не хочу тащить для одной этой строчки целую либу
        val outString = "{" + data.map(kv => "\"" + kv._1 + "\":" + kv._2).mkString(",") + "}"

        val outStream = new FileOutputStream(outFile)
        try {
            outStream.write(outString.getBytes("utf-8"))
        } finally {
            outStream.close()
        }
    }

    private val flushCancelled = new AtomicBoolean(true)
    private def scheduleFlush(): Unit = {
        Future {
            Thread.sleep(updateFreq)
            if(!flushCancelled.get){
                scheduleFlush()
                val data = gatherDataAndResetCounters()
                flush(data)
            }
        }(ExecutionContext.global)
    }

}

object TelemetryPlugin {
    var instance: TelemetryPlugin = null
}