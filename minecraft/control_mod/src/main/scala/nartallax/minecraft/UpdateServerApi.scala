package nartallax.minecraft

import java.io.InputStream
import java.net.URL

import nartallax.minecraft.Utils

import scala.util.parsing.json.JSON

class UpdateServerApi(urlBase: String, charset: String = "utf8") {

    def withPackedClientStream(body: (InputStream, Long) => Unit) = {
        val connection = new URL(urlBase + "getClient").openConnection()

        val len = connection.getHeaderField("Content-Length").toLong

        val in = connection.getInputStream
        try {
            body(in, len)
        } finally {
            in.close()
        }
    }

    def getClientInfo() = {
        val connection = new URL(urlBase).openConnection()
        connection.setRequestProperty("Accept-Charset", charset)

        val jsonStr = new String(Utils.readAndClose(connection.getInputStream()), charset)
        val result = JSON.parseFull(jsonStr).get.asInstanceOf[Map[String, Any]]
        if(!result("success").equals(true)) throw new Exception("Unsuccessful update informer call.")
        val strMap = result("data").asInstanceOf[Map[String, String]]

        ClientInfo(strMap("client_time").toLong, strMap("client_hash"))
    }

    def getClientHash() = getClientInfo().hash
    def getClientTime() = getClientInfo().time

    case class ClientInfo(time: Long, hash: String)

}
