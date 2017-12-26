package nartallax.minecraft.control

import java.net.{InetAddress, NetworkInterface}

import cpw.mods.fml.common.network.simpleimpl.{IMessageHandler, MessageContext}
import nartallax.minecraft.control.communication.{ResponsePackage, RequestPackage}
import nartallax.minecraft.control.utils.{FileIterator, Hasher}

class RequestHandler extends IMessageHandler[RequestPackage, ResponsePackage] {

    private val hasher = new Hasher(Config.hashSeed)
    private val iter = new FileIterator(Config.pathRegexp)

    private def hashOf(data: String) = hasher.hash(data)
    private def getClientFilesHash(iter: FileIterator): String = {
        var hashes = List[String]()
        iter.iterateStream((f, s) => {
            val hash = hasher.apply(s)
            synchronized{
                //println(hash + " <- " + f.getAbsolutePath)
                hashes = hash :: hashes
            }
        })

        val fullHash = hashOf(hashes.sortBy(s => s).mkString(""))

        println("Full hash: " + fullHash)

        fullHash
    }


    override def onMessage(req: RequestPackage, context: MessageContext): ResponsePackage = {
        context.side.isClient match {
            case false => null
            case true =>
                val resp = new ResponsePackage

                resp.requestId = req.id
                resp.hash = hashOf(getClientFilesHash(iter) + req.saltStr)

                resp.macs = List()

                // монструозная конструкция для получения мак-адреса
                // понадобилась из-за того, что у оодного из игроков localInterface почему-то обnullялся
                // а также иногда становился null localMac
                // причины этого так и не выяснены.
                val localIp = InetAddress.getLocalHost
                if (localIp != null) {
                    val localInterface = NetworkInterface.getByInetAddress(localIp)
                    if(localInterface != null){
                        val localMac = localInterface.getHardwareAddress
                        if(localMac != null){
                            resp.macs = List(localMac)
                        }
                    }
                }
                println("Mixed hash: " + resp.hash)

                resp
        }
    }

}
