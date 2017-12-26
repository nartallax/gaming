package nartallax.minecraft.control

import cpw.mods.fml.common.network.simpleimpl.{MessageContext, IMessage, IMessageHandler}
import nartallax.minecraft.AuthServerApi.Ban
import nartallax.minecraft.{AuthServerApi, UpdateServerApi}
import nartallax.minecraft.control.communication.ResponsePackage

class ResponseHandler extends IMessageHandler[ResponsePackage, IMessage] {

    private val updateServer = new UpdateServerApi(Config.updateServer)
    private val authServer = new AuthServerApi(Config.authServer, Config.authServerKey)

    private def checker = ControlMod.instance.checker

    private def twoDigit(in: Long) = in > 9 match {
        case true => in.toString
        case false => "0" + in
    }

    private def formatTimeLeft(time: Long) = {
        val days = time / (60 * 60 * 24)
        val hours = twoDigit((time % (60 * 60 * 24)) / (60 * 60))
        val minutes = twoDigit((time % (60 * 60)) / 60)
        val seconds = twoDigit(time % 60)

        s"$days d, $hours:$minutes:$seconds"
    }

    private def formatBan(b: Ban) = "Reason: " + b.reason + "\nTime left: " + formatTimeLeft(b.timeLeft)

    private def formatMac(mac: Array[Byte]) = mac.map(b => {
        val v = (b.toInt + 256) % 256
        v < 16 match {
            case true => "0" + Integer.toHexString(v)
            case false => Integer.toHexString(v)
        }
    }).mkString(":").toUpperCase

    private def getBanFor(nick: String) = {
        try {
            val result = authServer.getBan(nick)
            println(s"Fetched ban '$result' for '$nick'")
            result
        } catch {
            case e: Exception =>
                println(s"WARNING: auth server api call failed! Assuming '$nick' is NOT banned.")
                e.printStackTrace(System.out)
                None
        }
    }

    private def registerMac(nick: String, mac: String) = {
        try {
            authServer.addMac(nick, mac)
            println(s"Registered mac '$mac' for '$nick'")
        } catch {
            case e: Exception =>
                println(s"WARNING: auth server api call failed! Could not register maybe new mac '$mac' for '$nick'.")
                e.printStackTrace(System.out)
                None
        }
    }

    private def getEthalonHash = {
        try {
            val hash = updateServer.getClientHash()
            println(s"Received from update server hash '$hash'")
            Some(hash)
        } catch {
            case e: Exception =>
                println("WARNING: update server api call failed! Could not check correctness of hash received from client.")
                e.printStackTrace(System.out)
                None
        }
    }

    override def onMessage(req: ResponsePackage, context: MessageContext): IMessage = {
        if(context.side.isServer) {

            checker.playerOf(req.requestId).foreach(player => {

                def kick(msg: String) = ControlMod.instance.kick(player, msg)

                (getEthalonHash match {
                    case None => false
                    case Some(ethalonHash) =>
                        println("Expected from client #" + req.requestId + ": " + checker.getExpectedHash(ethalonHash, req.requestId))
                        checker.isCorrect(req.requestId, ethalonHash, req.hash) match {
                            case true => false
                            case false =>
                                kick("Client modification is not allowed.")
                                true
                        }
                }) match {
                    case true =>
                    case false =>
                        req.macs.foreach(mac => registerMac(player, formatMac(mac)))

                        authServer.getBan(player) match {
                            case Some(b) => kick("Your ban is not expired yet.\n" + formatBan(b))
                            case None =>
                        }
                }

                checker.unregisterCheck(req.requestId)

            })
        }
        null
    }

}