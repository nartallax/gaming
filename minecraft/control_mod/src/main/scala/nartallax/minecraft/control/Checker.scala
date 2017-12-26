package nartallax.minecraft.control

import java.util.concurrent.atomic.AtomicLong

import nartallax.minecraft.control.utils.Hasher

import scala.concurrent.{ExecutionContext, Future}

class Checker(hasher: Hasher, checkTimeout: Int, onTimeout: String => Unit){

    private var checkMap = Map[Long, (String, String)]()

    private val idSequence = new AtomicLong(0)

    private def hashOf(data: String) = hasher.hash(data)

    def getExpectedHash(ethalon: String, id: Long) = {
        //println("CALCULATING EXPECTED HASH: " + checkMap)
        synchronized { checkMap.get(id) }.map(s => calcServerHash(ethalon, s._1))
    }
    def isCorrect(id: Long, ethalonHash: String, hash: String): Boolean = getExpectedHash(ethalonHash, id).exists(_.equals(hash))
    def playerOf(id: Long): Option[String] = synchronized { checkMap.get(id).map(_._2) }
    def unregisterCheck(id: Long): Unit = synchronized {
        checkMap -= id
        //println("REMOVED CHECK: " + checkMap)
    }

    def registerCheck(salt: String, player: String): Long = {
        val id = idSequence.incrementAndGet()
        synchronized { checkMap += id -> (salt, player) }

        //println("REGISTERED CHECK: " + checkMap)

        Future {
            //println("SLEEPING " + Config.checkTimeout)
            Thread.sleep(Config.checkTimeout)
            //println("REMOVING BY TIMEOUT")
            synchronized { checkMap.get(id) }.foreach(s => {
                onTimeout(player)
                unregisterCheck(id)
            })
        }(ExecutionContext.global)

        id
    }

    def calcServerHash(ethalonHash: String, salt: String) = hashOf(ethalonHash + salt)
}
