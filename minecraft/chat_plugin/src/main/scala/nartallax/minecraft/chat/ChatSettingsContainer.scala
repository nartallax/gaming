package nartallax.minecraft.chat

import nartallax.minecraft.AuthServerApi
import nartallax.minecraft.AuthServerApi.{ChatChannel, ChatSettings}

import scala.collection.mutable

// хранилище для настроек чата и манипуляции ими
// автосинхронизируется с сервером
class ChatSettingsContainer(authServer: AuthServerApi, defaultChannel: ChatChannel) {

  private val players = mutable.Map[String, ChatSettings]()

  def update(nick: String, newSettings: ChatSettings) = {
    players.synchronized { players += nick -> newSettings }
    authServer.setChatSettings(nick, newSettings)
  }
  def updateWith(nick: String, mapper: ChatSettings => ChatSettings) = {
    players.synchronized { players.get(nick).map(mapper).foreach(update(nick, _)) }
  }
  def of(nick: String) = players.synchronized { players(nick) }
  def mbOf(nick: String) = players.synchronized { players.get(nick) }
  def have(nick: String) = players.synchronized { players.contains(nick) }
  def find(filter: ChatSettings => Boolean) = players.synchronized { players.find(p => filter(p._2)).map(_._2) }
  def filter(filter: ChatSettings => Boolean) = filterWithNick(filter).map(_._2)
  def filterWithNick(filter: ChatSettings => Boolean) = players.synchronized { players.filter(p => filter(p._2)) }
  def register(nick: String, settings: ChatSettings) = {
    //val settings = authServer.getChatSettings(nick)
    players.synchronized { players += nick -> settings }
    //onRegister(settings, nick)
  }
  def unregister(nick: String) = {
    players.synchronized { players -= nick }
  }

  def channels: Map[String, ChatChannel] = {
    players.synchronized { players.map(p => p._2.channel.getOrElse(defaultChannel)).map(c => c.name -> c).toMap }
  }
  def findChannel(name: String): Option[ChatChannel]= {
    Config.predefinedChannels.contains(name) match {
      case true => Some(ChatChannel(false, name, None))
      case false => find(s => s.channel.exists(c => c.name.equals(name))).flatMap(_.channel)
    }
  }
  def findChannelParticipants(name: String): Map[String, ChatSettings] = {
    filterWithNick(c => c.channel.getOrElse(defaultChannel).name.equals(name)).toMap
  }
  def findChannelSubscribers(name: String): Map[String, ChatSettings] = {
    filterWithNick(c => c.channelsSubscribed.getOrElse(Config.defaultSubscriptions).exists(_.name.equals(name)))
      .filter(c => !c._2.channel.getOrElse(defaultChannel).name.equals(name))
      .toMap
  }

}
