package nartallax.minecraft.control.plugin

import java.io.{FileInputStream, File}

import nartallax.minecraft.ModuleConfig
import sun.misc.IOUtils

object Config extends ModuleConfig(ControlPlugin.instance.getDataFolder, defaultConfigResourcePath = "/control-plugin-default.conf"){

    val authServer: String = str("auth_server_url")
    val authServerKey: String = {
        val f = new File(str("auth_server_keyfile"))
        ControlPlugin.instance.log("Trying to get key from '" + str("auth_server_keyfile") + "'")
        f.exists() match {
            case true =>
                val in = new FileInputStream(f)
                val result = new String(try {
                    IOUtils.readFully(in, -1, false)
                } finally {
                    in.close()
                }, "utf8")
                ControlPlugin.instance.log("Loaded auth server api key. It's " + result.length + " characters long.")
                result
            case false =>
                ControlPlugin.instance.log("No auth server api key found. Continuing without it.")
                ""
        }
    }

}
