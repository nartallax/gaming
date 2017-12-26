package nartallax.minecraft.chat

import java.io.{FileInputStream, File}

import nartallax.minecraft.AuthServerApi.ChatChannel
import nartallax.minecraft.ModuleConfig
import sun.misc.IOUtils

object Config extends ModuleConfig(ChatPlugin.instance.getDataFolder, defaultConfigResourcePath = "chat-plugin-default.conf"){

  val authServer: String = str("auth_server_url")
  val authServerKey: String = {
    val f = new File(str("auth_server_keyfile"))
    ChatPlugin.instance.log("Trying to get key from '" + str("auth_server_keyfile") + "'")
    f.exists() match {
      case true =>
        val in = new FileInputStream(f)
        val result = new String(try {
          IOUtils.readFully(in, -1, false)
        } finally {
          in.close()
        }, "utf8")
        ChatPlugin.instance.log("Loaded auth server api key. It's " + result.length + " characters long.")
        result
      case false =>
        ChatPlugin.instance.log("No auth server api key found. Continuing without it.")
        ""
    }
  }

  val defaultChannel = str("default_channel")
  val defaultNickColor = str("default_nick_color")
  val defaultPrefix = str("default_prefix")
  val predefinedChannels: Set[String] = str("predefined_channels").split(",").map(_.trim).toSet
  val defaultSubscriptions: Set[ChatChannel] = str("default_subscription").split(",").map(s => ChatChannel(false, s.trim, None)).toSet

}
