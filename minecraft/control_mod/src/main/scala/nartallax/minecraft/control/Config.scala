package nartallax.minecraft.control

import java.io.{FileInputStream, File}

import nartallax.minecraft.{Utils, ModuleConfig}

import scala.util.matching.Regex

object Config extends ModuleConfig(new File("config"), "=", "control-mod.conf", defaultConfigResourcePath = "/control-mod-default.conf") {

    val hashSeed: Int = int("hash_seed").toInt
    val pathRegexp: Regex = "^(asm|libraries|resourcepacks|scripts|server-resource-packs|versions|mods.*?\\.jar$)".r
    val updateServer: String = str("update_server_url")
    val authServer: String = str("auth_server_url")
    val authServerKey: String = {
        val f = new File(str("auth_server_keyfile"))
        println("Trying to get key from '" + str("auth_server_keyfile") + "'")
        f.exists() match {
            case true =>
                val result = new String(Utils.readAndClose(new FileInputStream(f)), "utf8")
                println("Loaded auth server api key. It's " + result.length + " characters long.")
                result
            case false =>
                println("No auth server api key found. Continuing without it.")
                ""
        }
    }

    val checkTimeout: Int = int("check_timeout").toInt

}
