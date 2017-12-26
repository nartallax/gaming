package nartallax.minecraft.transmutation

import java.io.{File, FileInputStream}

import nartallax.minecraft.ModuleConfig
import sun.misc.IOUtils

object Config extends ModuleConfig(TransmutationPlugin.instance.getDataFolder, defaultConfigResourcePath = "/transmutation-plugin-default.conf"){

  val authServer: String = str("auth_server_url")
  val authServerKey: String = {
    val f = new File(str("auth_server_keyfile"))
    TransmutationPlugin.instance.log("Trying to get key from '" + str("auth_server_keyfile") + "'")
    f.exists() match {
      case true =>
        val in = new FileInputStream(f)
        val result = new String(try {
          IOUtils.readFully(in, -1, false)
        } finally {
          in.close()
        }, "utf8")
        TransmutationPlugin.instance.log("Loaded auth server api key. It's " + result.length + " characters long.")
        result
      case false =>
        TransmutationPlugin.instance.log("No auth server api key found. Continuing without it.")
        ""
    }
  }

  object inventory {
    val width = int("inventory_width").toInt
    val height = int("inventory_height").toInt
    val offset = int("inventory_offset").toInt
  }

  lazy val keys = values.keySet ++ defaults.keySet

}
