package nartallax.minecraft

import java.math.BigInteger
import java.net.{URL, URLEncoder}
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

import nartallax.minecraft.AuthServerApi.ApiError.ApiError
import nartallax.minecraft.AuthServerApi._
import sun.misc.IOUtils

import scala.util.parsing.json.JSON

/**
 * класс для доступа к серверу аутенификации
 */

object AuthServerApi {
  object ApiError extends Enumeration {
    type ApiError = Value

    val InvalidId = Value("invalid_id")
    val InvalidNick = Value("invalid_nick")
    val InvalidPassword = Value("invalid_password")
    val DuplicateNick = Value("duplicate_nick")
    val NotRegistered = Value("not_registered")
    val WrongPassword = Value("wrong_password")
    val MalformedInput = Value("malformed_input")
    val WrongKey = Value("wrong_api_key")
    val UnknownError = Value("unknown_error")
  }

  case class ApiStatusException(message: ApiError) extends Exception(message.toString)

  case class Ban(timeLeft: Long, reason: String)

  case class Cluster(nics: Seq[String], macs: Seq[String])

  case class ChatChannel(isUnlisted: Boolean, name: String, password: Option[String])
  case class ChatSettings(channel: Option[ChatChannel], color: Option[String], prefix: Option[String], blacklistedPlayers: Set[String], blacklistedForPMPlayers: Set[String], channelsSubscribed: Option[Set[ChatChannel]])
}

case class AuthServerApi(urlBase: String, apiKey: String = "", charset: String = "utf8") {

  private def errorByMessage(msg: String) = {
    AuthServerApi.ApiError.values.find(e => e.toString.equals(msg)).get.asInstanceOf[AuthServerApi.ApiError.ApiError]
  }

  def nick(id: String) = callStr("nick", "id" -> id)("nick")
  def id(nick: String, pwd: String) = callStr("id", "nick" -> nick, "pwd" -> hashOf(pwd))("id")
  def register(nick: String, pwd: String) = callStr("register", "nick" -> nick, "pwd" -> hashOf(pwd))("id")
  def password(id: String, newPwd: String) = callStr("password", "id" -> id, "pwd" -> hashOf(newPwd))("id")

  def getBan(nick: String) = {
    val raw = callKeyed("getBan", "nick" -> nick)("ban").asInstanceOf[Map[String, Any]]
    val timeLeft = raw("timeLeft").asInstanceOf[Double].toLong
    timeLeft match {
      case 0 => None
      case _ => Some(Ban(timeLeft, raw("reason").asInstanceOf[String]))
    }
  }
  def setBan(nick: String, ban: Ban): Unit = {
    callKeyed("setBan", "nick" -> nick, "reason" -> ban.reason, "len" -> ban.timeLeft.toString)
  }
  def resetBan(nick: String): Unit = {
    callKeyed("resetBan", "nick" -> nick)
  }

  def getTransmutations(nick: String) = {
    callKeyed("transmutations", "nick" -> nick)("transmutations")
      .asInstanceOf[Map[String, Long]]
      .map(p => p._1.toLong -> p._2)
  }
  def increaseTransmutations(nick: String, transmutations: Map[Long, Long]) = {
    val serialized = transmutations.map(p => p._1 + ":" + p._2).mkString("|")
    callKeyed("increaseTransmutations", "nick" -> nick, "transmutations" -> serialized)
  }

  def getCluster(nick: String) = {
    val raw = callKeyed("cluster", "nick" -> nick)
    val nicks = raw("nicks").asInstanceOf[Seq[String]]
    val macs = raw("macs").asInstanceOf[Seq[String]]
    Cluster(nicks, macs)
  }
  def addMac(nick: String, mac: String) = callKeyed("addMacs", "nick" -> nick, "macs" -> mac)

  def getChatSettings(nick: String) = {
    val raw = callKeyed("getChat", "nick" -> nick)("chat").asInstanceOf[Map[String, Any]]

    ChatSettings(
      raw.get("channel").asInstanceOf[Option[String]].map(name => {
        val unlisted = raw.get("is_unlisted").asInstanceOf[Option[String]].getOrElse("false") match {
          case "true" => true
          case _ => false
        }
        val password = raw.getOrElse("password", "") match {
          case "" => None
          case s: String => Some(s)
        }
        ChatChannel(unlisted, name, password)
      }),
      raw.get("color").asInstanceOf[Option[String]],
      raw.get("prefix").asInstanceOf[Option[String]],
      raw.get("blacklist").asInstanceOf[Option[Seq[String]]].getOrElse(List()).toSet,
      raw.get("pm_blacklist").asInstanceOf[Option[Seq[String]]].getOrElse(List()).toSet,
      raw.get("subscriptions").asInstanceOf[Option[Seq[String]]].map(_.flatMap(s => {
        val parts = s.split(":").filter(_.isEmpty)
        parts.size match {
          case 0 => None
          case 1 => Some(ChatChannel(false, parts.head, None))
          case _ => Some(ChatChannel(false, parts.head, Some(parts(1))))
        }
      }).toSet)
    )
  }

  def setChatSettings(nick: String, settings: ChatSettings) = {
    val params = List(
      settings.channel.map("channel" -> _.name),
      settings.channel.map(c => "is_unlisted" -> (c.isUnlisted match {
        case true => "true"
        case false => "false"
      })),
      settings.channel.flatMap(_.password.map("password" -> _)),
      settings.color.map("color" -> _),
      settings.prefix.map("prefix" -> _),
      settings.blacklistedPlayers.isEmpty match {
        case true => None
        case false => Some("blacklist" -> settings.blacklistedPlayers.mkString(","))
      },
      settings.blacklistedForPMPlayers.isEmpty match {
        case true => None
        case false => Some("pm_blacklist" -> settings.blacklistedForPMPlayers.mkString(","))
      },
      settings.channelsSubscribed.map("subscriptions" -> _.map(c => c.name + c.password.map(p => ":" + p).getOrElse("")).mkString(","))
    ).flatten

    callKeyed("setChat", params: _*)
  }

  private def callKeyed(func: String, params: (String, String)*) = {
    call(func, params:+("key" -> apiKey): _*)
  }

  private def callStr(func: String, params: (String, String)*) = call(func, params: _*).asInstanceOf[Map[String, String]]

  private def call(func: String, params: (String, String)*): Map[String, Any] = {
    val queryString = params.map(p => p._1 + "=" + URLEncoder.encode(p._2, charset)).mkString("&")
    val url = urlBase + func + "?" + queryString
    val connection = new URL(url).openConnection()
    connection.setDoOutput(true) // Triggers POST
    connection.setRequestProperty("Accept-Charset", charset)
    connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded;charset=" + charset)

    connection.getOutputStream.close()

    val in = connection.getInputStream
    try {
      val jsonStr = new String(IOUtils.readFully(in, -1, false), charset)
      val result = JSON.parseFull(jsonStr).get.asInstanceOf[Map[String, Any]]
      if(!result("status").equals("ok")) throw ApiStatusException(errorByMessage(result("status").asInstanceOf[String]))
      result
    } finally {
      in.close()
    }
  }

  private val keyFactory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA1")
  private val salt = "aFqUUIMP04xFxQ6oTFeQg6nnLoszEuL9Fw14TZDvWQ6jZtbw7LwgMZ4rzdYy".getBytes("utf8")

  private def hashOf(in: String) = {
    val hash = keyFactory.generateSecret(new PBEKeySpec(in.toCharArray, salt, 512, 512)).getEncoded
    val intWrap = new BigInteger(hash)
    val isNegative = intWrap.compareTo(new BigInteger("0")) < 0
    (if(isNegative){
      intWrap.negate()
    } else {
      intWrap
    }).toString(36).substring(0, 15).toUpperCase
  }

}
