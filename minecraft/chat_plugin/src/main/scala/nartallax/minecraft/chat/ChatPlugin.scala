package nartallax.minecraft.chat

import nartallax.minecraft.AuthServerApi
import org.bukkit.command.{Command, CommandSender, CommandExecutor}
import org.bukkit.entity.Player
import org.bukkit.event.player.{AsyncPlayerChatEvent, PlayerQuitEvent, PlayerJoinEvent}
import org.bukkit.event.{EventHandler, Listener, HandlerList}
import org.bukkit.plugin.Plugin
import org.bukkit.plugin.java.JavaPlugin

import scala.collection.JavaConversions._

class ChatPlugin extends JavaPlugin with Listener {

  import AuthServerApi._

  ChatPlugin.instance = this

  def log(msg: Any) = getLogger.info(msg.toString)

  val authServer = new AuthServerApi(Config.authServer, Config.authServerKey)

  lazy val defaultChannel = ChatChannel(isUnlisted = false, Config.defaultChannel, None)

  val settings = new ChatSettingsContainer(authServer, defaultChannel)

  // "полный" - с префиксом и цветом
  def formNick(nick: String) = {
    settings.mbOf(nick).map(s => {
      val prefix = s.prefix.getOrElse(Config.defaultPrefix) match {
        case "" => ""
        case s: String => format("prefix", s)
      }
      val color = colorFormatterOf(s.color.getOrElse(Config.defaultNickColor))
      prefix + color + nick + styleResetter
    }).getOrElse(nick)
  }
  def colorFormatterOf(color: String) = color match {
    case "" => ""
    case s: String => "§" + s
  }
  lazy val styleResetter = colorFormatterOf("r")


  private val placeholderRegexp = "\\$(\\d+)".r
  private def format(name: String, args: String*) = {
    val amap = args.zipWithIndex.map(_.swap).toMap
    placeholderRegexp.replaceAllIn(Config(name), m => amap.getOrElse(m.group(1).toInt, ""))
  }

  // форматированные сообщения на все случаи жизни
  private def messageChannelCreated(nick: String, name: String) = format("channel_create_message", formNick(nick), name)
  private def messageChannelJoin(nick: String, name: String) = format("channel_join_message", formNick(nick), name)
  private def messageChannelLeave(nick: String, name: String) = format("channel_leave_message", formNick(nick), name)
  private def messageChannelSubscribed(nick: String, name: String) = format("channel_subscribe_message", formNick(nick), name)
  private def messageChannelUnsubscribed(nick: String, name: String) = format("channel_unsubscribe_message", formNick(nick), name)
  private def messageChannelDropped(name: String) = format("channel_dropped_message", name)
  private def messageChannelHavePassword(name: String) = format("channel_have_password_message", name)
  private def messageChannelWrongPassword(name: String) = format("invalid_channel_password_message", name)
  private def messageBlacklistAdded(nick: String) = format("you_are_blacklisted_message", formNick(nick))
  private def messageBlacklistAdder(nick: String) = format("player_blacklisted", formNick(nick))
  private def messageBlacklistRemoved(nick: String) = format("you_are_unblacklisted_message", formNick(nick))
  private def messageBlacklistRemover(nick: String) = format("player_unblacklisted", formNick(nick))
  private def messageBlacklistAddedPm(nick: String) = format("you_are_pm_blacklisted_message", formNick(nick))
  private def messageBlacklistAdderPm(nick: String) = format("player_pm_blacklisted", formNick(nick))
  private def messageBlacklistRemovedPm(nick: String) = format("you_are_pm_unblacklisted_message", formNick(nick))
  private def messageBlacklistRemoverPm(nick: String) = format("player_pm_unblacklisted", formNick(nick))
  private def messageBlacklistAtPm() = format("you_are_pming_to_blacklisted")
  private def messageBlacklistPmAtPm() = format("you_are_pming_to_blacklisted")
  private def messagePm(sender: String, receiver: String, message: String) = format("pm_message", formNick(sender), formNick(receiver), message)
  private def messageToCurrent(sender: String, message: String) = format("channel_messsage", formNick(sender), message)
  private def messageToSubscribed(sender: String, name: String, message: String) = format("subscribed_channel_message", formNick(sender), name, message)
  private def messageCouldNotUnsubscribeUnexistent(name: String) = format("could_not_unsubscribe_unexistent", name)
  private def messageCouldNotSubscribeUnexistent(name: String) = format("could_not_subscribe_unexistent", name)
  private def messageCouldNotSubscribeSubscribed(name: String) = format("could_not_subscribe_subscribed", name)
  private def messageCouldNotUnsubscribeUnsubscribed(name: String) = format("could_not_unsubscribe_unsubscribed", name)
  private def messageChannelIsSubscribed(name: String) = format("channel_is_subscribed", name)
  private def messageChannelIsUnsubscribed(name: String) = format("channel_is_unsubscribed", name)
  private def messageCouldNotSendToUnexistentChannel(name: String) = format("could_not_send_to_unexistent_channel", name)
  private def messageCouldNotSendToUnexistentPlayer(name: String) = format("could_not_send_to_unexistent_player", name)
  private def messageCouldNotPmToBlacklister(nick: String) = format("could_not_pm_to_blacklister", formNick(nick))
  private def messageCouldNotBlacklistBlacklisted(nick: String) = format("could_not_blacklist_blacklisted", formNick(nick))
  private def messageCouldNotUnblacklistUnblacklisted(nick: String) = format("could_not_unblacklist_unblacklisted", formNick(nick))
  private def messageCouldNotPmBlacklistPmBlacklisted(nick: String) = format("could_not_pm_blacklist_pm_blacklisted", formNick(nick))
  private def messageCouldNotPmUnblacklistPmUnblacklisted(nick: String) = format("could_not_pm_unblacklist_pm_unblacklisted", formNick(nick))
  private def messageAvailableSubCommands(commands: String) = format("available_commands", commands)
  private def messageCommandNotFound(command: String) = format("command_not_found", command)
  private def messageInvalidNick(nick: String) = format("nick_is_not_valid", nick)
  private def messageInvalidChannel(name: String) = format("channel_is_not_valid", name)
  private def messageInvalidPassword(pwd: String) = format("password_is_not_valid", pwd)
  private def messageInvalidColor(color: String) = format("color_is_not_valid", color)
  private def messageInvalidPrefix(prefix: String) = format("prefix_is_not_valid", prefix)
  private def messageList(channel: String, users: Iterable[String], subscribers: Iterable[String], channels: Iterable[String], subscriptions: Iterable[String]) =
    format("list", channel, users.map(formNick).mkString(", "), subscribers.mkString(", "), channels.mkString(", "), subscriptions.mkString(", "))

  // рассылка всяких-разных сообщений игрокам по определенным критериям
  def sayToChannel(name: String, message: String) = {
    (settings.findChannelParticipants(name) ++ settings.findChannelSubscribers(name))
      .foreach(p => sayToPlayer(p._1, message))
  }
  def sayToPlayer(nick: String, message: String) = getServer.getOnlinePlayers.find(p => p.getDisplayName.equals(nick)).foreach(_.sendMessage(message))

  // анонсы - любые сообщения о действиях с чатом, о которых нужно знать не только одному игроку
  def announceChannelCreated(nick: String, name: String) = name.equals(defaultChannel.name) match {
    case true => /* nothing */
    case false => sayToChannel(defaultChannel.name, messageChannelCreated(nick, name))
  }
  def announceChannelDropped(name: String) = name.equals(defaultChannel.name) match {
    case true => /* nothing */
    case false => sayToChannel(defaultChannel.name, messageChannelDropped(name))
  }
  def announcePlayerJoinedChannel(nick: String, name: String) = {
    name.equals(Config.defaultChannel) match {
      case true => /* nothing */
      case false => sayToChannel(name, messageChannelJoin(nick, name))
    }
  }
  def announcePlayerLeftChannel(nick: String, name: String) = {
    name.equals(Config.defaultChannel) match {
      case true => /* nothing */
      case false => sayToChannel(name, messageChannelLeave(nick, name))
    }
  }
  def announcePlayerSubscribedChannel(nick: String, name: String) = {
    sayToChannel(name, messageChannelSubscribed(nick, name))
    sayToPlayer(nick, messageChannelIsSubscribed(name))
  }
  def announcePlayerUnsubscribedChannel(nick: String, name: String) = {
    sayToChannel(name, messageChannelUnsubscribed(nick, name))
    sayToPlayer(nick, messageChannelIsUnsubscribed(name))
  }

  // валидация входных данных
  def isValidNick(nick: String): Boolean = nick.matches("^[\\pL\\d_\\-]{1,15}$")
  def isValidChannel(name: String): Boolean = name.matches("^[\\pL\\d_\\-]{1,32}$")
  def isValidPassword(pwd: String): Boolean = pwd.matches("^[^:,]{1,32}$")
  def isValidColor(color: String): Boolean = color.matches("^[a-fA-F\\d]$")
  def isValidPrefix(prefix: String): Boolean = prefix.matches("^[a-zA-Z\\d]{0, 15}$")

  // манипуляция каналами
  def passwordErrorMessageFormatter(c: ChatChannel, password: Option[String]): Option[String => String] = {
    c.password.nonEmpty && password.isEmpty match {
      case true => Some(messageChannelHavePassword)
      case false => c.password.map(p => Some(p).equals(password)).getOrElse(true) match {
        case false => Some(messageChannelWrongPassword)
        case true => None
      }
    }
  }
  def tryAddSubscription(nick: String, name: String, password: Option[String], onError: String => Unit) = settings.mbOf(nick).foreach(s => {
    val oldList = s.channelsSubscribed.getOrElse(Config.defaultSubscriptions)
    oldList.exists(c => c.name.equals(name)) match {
      case true => onError(messageCouldNotSubscribeSubscribed(name))
      case false => settings.findChannel(name) match {
        case None => onError(messageCouldNotSubscribeUnexistent(name))
        case Some(channel) => passwordErrorMessageFormatter(channel, password) match {
          case Some(f) => onError(f(name))
          case None =>
            val newList = oldList + channel
            settings.update(nick, s.copy(channelsSubscribed = Some(newList)))
            announcePlayerSubscribedChannel(nick, name)
        }
      }
    }
  })
  def addSubscription(nick: String, name: String, password: Option[String]) = {
    tryAddSubscription(nick, name, password, sayToPlayer(nick, _))
  }
  def removeSubscription(nick: String, name: String) = settings.mbOf(nick).foreach(s => {
    val oldList = s.channelsSubscribed.getOrElse(Config.defaultSubscriptions)
    oldList.exists(c => c.name.equals(name)) match {
      case true => sayToPlayer(nick, messageCouldNotUnsubscribeUnsubscribed(name))
      case false => settings.findChannel(name) match {
        case None => sayToPlayer(nick, messageCouldNotUnsubscribeUnexistent(name))
        case Some(channel) =>
          val newList = oldList.filter(c => !c.name.equals(name))
          settings.update(nick, s.copy(channelsSubscribed = Some(newList)))
          announcePlayerSubscribedChannel(nick, name)
      }
    }
  })
  def tryJoinChannel(nick: String, name: String, unlisted: Boolean, pwd: Option[String], onError: String => Unit) = {

    def getChannel(nick: String, name: String, unlisted: Boolean, pwd: Option[String]): Either[String, ChatChannel] = {
      settings.findChannel(name) match {
        case None => Right(ChatChannel(unlisted, name, pwd))
        case Some(c) =>
          passwordErrorMessageFormatter(c, pwd) match {
            case None => Right(c)
            case Some(f) => Left(f(name))
          }
      }
    }

    getChannel(nick, name, unlisted, pwd) match {
      case Left(error) => onError(error)
      case Right(newChannel) =>
        val s = settings.of(nick)
        val oldChannel = s.channel.getOrElse(defaultChannel)
        val oldChannelIsEmpty = settings.findChannelParticipants(oldChannel.name).size <= 1
        val newChannelIsEmpty = settings.findChannelParticipants(newChannel.name).isEmpty

        settings.update(nick, s.copy(channel = Some(newChannel)))

        announcePlayerLeftChannel(nick, s.channel.getOrElse(defaultChannel).name)
        if(oldChannelIsEmpty && !oldChannel.isUnlisted) announceChannelDropped(oldChannel.name)
        if(newChannelIsEmpty && !newChannel.isUnlisted) announceChannelCreated(nick, newChannel.name)
        announcePlayerJoinedChannel(nick, s.channel.getOrElse(defaultChannel).name)
    }

  }
  def joinChannel(nick: String, name: String, unlisted: Boolean, pwd: Option[String]) = {
    tryJoinChannel(nick, name, unlisted, pwd, sayToPlayer(nick, _))
  }
  def leaveChannel(nick: String) = { joinChannel(nick, defaultChannel.name, unlisted = false, None) }
  def sendToChannel(nick: String, name: String, message: String, password: Option[String]) = {

    def sayIt() = {
      settings.findChannelSubscribers(name).filter(!_._2.blacklistedPlayers.contains(nick))
        .foreach(p => sayToPlayer(p._1, messageToSubscribed(nick, name, message)))
      settings.findChannelParticipants(name).filter(!_._2.blacklistedPlayers.contains(nick))
        .foreach(p => sayToPlayer(p._1, messageToCurrent(nick, message)))
    }

    settings.findChannel(name) match {
      case None => sayToPlayer(nick, messageCouldNotSendToUnexistentChannel(name))
      case Some(c) => passwordErrorMessageFormatter(c, password) match {
        case None => sayIt()
        case Some(f) => sayToPlayer(nick, f(name))
      }
    }
  }

  // пм
  def sendToPlayer(sender: String, receiver: String, message: String) = {
    settings.mbOf(receiver) match {
      case None => sayToPlayer(sender, messageCouldNotSendToUnexistentPlayer(receiver))
      case Some(s) => s.blacklistedForPMPlayers.contains(sender) match {
        case true => sayToPlayer(sender, messageCouldNotPmToBlacklister(receiver))
        case false =>
          val formatted = messagePm(sender, receiver, message)
          sayToPlayer(receiver, formatted)
          sayToPlayer(sender, formatted)

          settings.mbOf(sender).foreach(s => s.blacklistedForPMPlayers.contains(receiver) match {
            case true => sayToPlayer(sender, messageBlacklistPmAtPm())
            case false => s.blacklistedForPMPlayers.contains(receiver) match {
              case false => /* ok */
              case true => sayToPlayer(sender, messageBlacklistAtPm())
            }
          })
      }
    }
  }

  // блеклисты
  def addToBlacklist(adder: String, victim: String) = {
    settings.mbOf(adder).foreach(s => {
      s.blacklistedPlayers.contains(victim) match {
        case true => sayToPlayer(adder, messageCouldNotBlacklistBlacklisted(victim))
        case false =>
          settings.update(adder, s.copy(blacklistedPlayers = s.blacklistedPlayers + victim))
          sayToPlayer(adder, messageBlacklistAdder(victim))
          sayToPlayer(victim, messageBlacklistAdded(adder))
      }
    })
  }
  def addToPmBlacklist(adder: String, victim: String) = {
    settings.mbOf(adder).foreach(s => {
      s.blacklistedForPMPlayers.contains(victim) match {
        case true => sayToPlayer(adder, messageCouldNotPmBlacklistPmBlacklisted(victim))
        case false =>
          settings.update(adder, s.copy(blacklistedForPMPlayers = s.blacklistedForPMPlayers+ victim))
          sayToPlayer(adder, messageBlacklistAdderPm(victim))
          sayToPlayer(victim, messageBlacklistAddedPm(adder))
      }
    })
  }
  def removeFromBlacklist(adder: String, victim: String) = {
    settings.mbOf(adder).foreach(s => {
      s.blacklistedPlayers.contains(victim) match {
        case true => sayToPlayer(adder, messageCouldNotUnblacklistUnblacklisted(victim))
        case false =>
          settings.update(adder, s.copy(blacklistedPlayers = s.blacklistedPlayers - victim))
          sayToPlayer(adder, messageBlacklistRemover(victim))
          sayToPlayer(victim, messageBlacklistRemoved(adder))
      }
    })
  }
  def removeFromPmBlacklist(adder: String, victim: String) = {
    settings.mbOf(adder).foreach(s => {
      s.blacklistedForPMPlayers.contains(victim) match {
        case true => sayToPlayer(adder, messageCouldNotPmUnblacklistPmUnblacklisted(victim))
        case false =>
          settings.update(adder, s.copy(blacklistedPlayers = s.blacklistedPlayers - victim))
          sayToPlayer(adder, messageBlacklistRemoverPm(victim))
          sayToPlayer(victim, messageBlacklistRemovedPm(adder))
      }
    })
  }

  case class ChatException(msg: String) extends Exception

  trait CommandDescription {
    def apply(invoker: String, args: Seq[String]): Option[String]
  }
  case class Solid(helpStr: String, minArgs: Int, act: (String, Seq[String]) => Unit) extends CommandDescription{
    def apply(invoker: String, args: Seq[String]): Option[String] = {
      args.length < minArgs match {
        case true => Some(helpStr)
        case false =>
          try {
            act(invoker, args)
            None
          } catch {
            case e: ChatException => Some(e.msg)
          }
      }
    }
  }
  case class Gather(pairs: (String, CommandDescription)*) extends CommandDescription{
    private lazy val cmap = pairs.toMap
    def help = messageAvailableSubCommands(pairs.map(p => "\t" + p._1).mkString("\n"))
    def apply(invoker: String, args: Seq[String]): Option[String] = args.headOption match {
      case None => Some(help)
      case Some(c) =>
        val l = c.toLowerCase
        cmap.get(l) match {
          case None => Some(messageCommandNotFound(args.mkString(" ")))
          case Some(cmd) => cmd.apply(invoker, args.drop(1))
        }
    }
  }

  val commands = Gather(
    "blacklist" -> Solid("Usage: /chat blacklist %nick% [pm]", 1, (sender, args) => {
      val nick = args.head
      if(!isValidNick(nick)) throw ChatException(messageInvalidNick(nick))
      args.length > 1 && args(1).toLowerCase.equals("pm") match {
        case true => addToPmBlacklist(sender, nick)
        case false => addToBlacklist(sender, nick)
      }
    }),
    "unblacklist" -> Solid("Usage: /chat unblacklist %nick% [pm]", 1, (sender, args) => {
      val nick = args.head
      if(!isValidNick(nick)) throw ChatException(messageInvalidNick(nick))
      args.length > 1 && args(1).toLowerCase.equals("pm") match {
        case true => addToPmBlacklist(sender, nick)
        case false => addToBlacklist(sender, nick)
      }
    }),
    "channel" -> Gather(
      "join" -> Solid("Usage: /chat channel join %channel_name% %is_unlisted% [%password%]", 1, (sender, args) => {
        val name = args.head
        if(!isValidChannel(name)) throw ChatException(messageInvalidChannel(name))
        val pwd = args.size > 2 && args(2).trim.nonEmpty match {
          case false => None
          case true =>
            val pwd = args(2)
            if(!isValidPassword(pwd)) throw ChatException(messageInvalidPassword(pwd))
            Some(pwd)
        }
        val unlisted = args.size > 1 && args(1).trim.matches("^[yt1+]")
        joinChannel(sender, name, unlisted, pwd)
      }),
      "leave" -> Solid("Usage: /chat channel leave", 0, (sender, args) => leaveChannel(sender)),
      "subscribe" -> Solid("Usage: /chat channel subscribe %channel_name% [%password%]", 1, (sender, args) => {
        val name = args.head
        if(!isValidChannel(name)) throw ChatException(messageInvalidChannel(name))
        val pwd = args.size > 1 && args(1).trim.nonEmpty match {
          case false => None
          case true =>
            val pwd = args(1)
            if(!isValidPassword(pwd)) throw ChatException(messageInvalidPassword(pwd))
            Some(pwd)
        }
        addSubscription(sender, name, pwd)
      }),
      "unsubscribe" -> Solid("Usage: /chat channel unsubscribe %channel_name%", 1, (sender, args) => {
        val name = args.head
        if(!isValidChannel(name)) throw ChatException(messageInvalidChannel(name))
        removeSubscription(sender, name)
      }),
      "say" -> Solid("Usage: /chat channel say %channel_name% [%password%] %message%", 1, (sender, args) => {
        val name = args.head
        if(!isValidChannel(name)) throw ChatException(messageInvalidChannel(name))
        val isPwded = settings.findChannel(name).exists(_.password.nonEmpty)
        val pwd = isPwded && args.length > 1 match {
          case false => None
          case true =>
            val pwd = args(1)
            if(!isValidPassword(pwd)) throw ChatException(messageInvalidPassword(pwd))
            Some(pwd)
        }
        val msg = args.drop(isPwded match {
          case true => 2
          case false => 1
        }).mkString(" ")
        sendToChannel(sender, name, msg, pwd)
      })
    ),
    "list" -> Solid("Usage: /chat list", 0, (sender, args) => {
      val channel = settings.mbOf(sender).flatMap(_.channel).getOrElse(defaultChannel).name
      val users = settings.findChannelParticipants(channel).map(_._1)
      val subscribers = settings.findChannelSubscribers(channel).map(_._1)
      val available = settings.channels.filter(!_._2.isUnlisted).map(_._1)
      val subscriptions = settings.mbOf(sender).flatMap(_.channelsSubscribed).getOrElse(Config.defaultSubscriptions).map(_.name)
      // это несколько кривовато, но пусть будет
      throw ChatException(messageList(channel, users, subscribers, available, subscriptions))
    }),
    "pm" -> Solid("Usage: /pm %nick% %message%", 1, (sender, args) => {
      val message = args.drop(1).mkString(" ")
      val nick = args.head
      if(!isValidNick(nick)) throw ChatException(messageInvalidNick(nick))
      sendToPlayer(sender, nick, message)
    }),
    "color" -> Solid("Usage: /chat color %wanted_color%", 1, (sender, args) => {
      val color = args.head
      if(!isValidColor(color)) throw ChatException(messageInvalidColor(color))
      settings.updateWith(sender, _.copy(color = Some(color)))
    }),
    "prefix" -> Solid("Usage: /chat prefix %wanted_prefix%", 1, (sender, args) => {
      val prefix = args.head
      if(!isValidPrefix(prefix)) throw ChatException(messageInvalidPrefix(prefix))
      settings.updateWith(sender, _.copy(prefix = Some(prefix)))
    })
  )

  def executeCommand(sender: String, args: Seq[String]) = commands.apply(sender, args).foreach(m => sayToPlayer(sender, m))

  private def listenCommand(name: String, listener: (CommandSender, Command, String, Array[String]) => Unit) = {
    getCommand(name).setExecutor(new CommandExecutor {
      override def onCommand(commandSender: CommandSender, command: Command, label: String, args: Array[String]): Boolean = {
        command.getName.toLowerCase.equals(name.toLowerCase) match {
          case false => false
          case true =>
            listener(commandSender, command, label, args)
            true
        }
      }
    })
  }

  private def listenCommandFromPlayer(name: String, listener: (Player, Command, String, Array[String]) => Unit) = {
    listenCommand(name, (sender, a, b, c) => {
      sender match {
        case p: Player => listener(p, a, b, c)
        case _ => sender.sendMessage("Only players are able to execute this command.")
      }
    })
  }

  override def onDisable() = HandlerList.unregisterAll(this.asInstanceOf[Plugin])
  override def onEnable() = {
    listenCommandFromPlayer("pm", (sender, command, label, args) => executeCommand(sender.getName, List("pm") ++ args))
    listenCommandFromPlayer("chat", (sender, command, label, args) => executeCommand(sender.getName, args))
    getServer.getPluginManager.registerEvents(this, this)
  }

  @EventHandler
  def onJoin(event: PlayerJoinEvent) = {
    val nick = event.getPlayer.getName
    var s = authServer.getChatSettings(nick)

    val channels = s.channelsSubscribed.getOrElse(Config.defaultSubscriptions).filter(c => {
      var successful = true
      tryAddSubscription(nick, c.name, c.password, s => successful = false)
      successful
    })
    if(s.channelsSubscribed.nonEmpty) s = s.copy(channelsSubscribed = Some(channels))

    s = s.copy(channel = s.channel.filter(c => {
      var successful = true
      tryJoinChannel(nick, c.name, c.isUnlisted, c.password, s => successful = false)
      successful
    }))

    settings.register(nick, s)
  }

  @EventHandler
  def onLeave(event: PlayerQuitEvent) = {
    val nick = event.getPlayer.getName

    settings.mbOf(nick).foreach(s => {
      s.channelsSubscribed.foreach(_.foreach(c => removeSubscription(nick, c.name)))
      leaveChannel(nick)
    })

    settings.unregister(nick)
  }

  @EventHandler
  def onAsyncPlayerChat(e: AsyncPlayerChatEvent) {
    val msg = e.getMessage
    val nick = e.getPlayer.getName
    val channel = settings.mbOf(nick).flatMap(_.channel).getOrElse(defaultChannel)
    sendToChannel(nick, channel.name, msg, channel.password)
  }


}

object ChatPlugin { var instance: ChatPlugin = null }
