package nartallax.minecraft.launcher.gui

import java.awt.Color
import javax.swing._

import nartallax.minecraft.AuthServerApi.{ApiError, ApiStatusException}
import nartallax.minecraft.{AuthServerApi, Utils, UpdateServerApi, ModuleConfig}

class MainWindow(var settings: ModuleConfig, authServer: AuthServerApi, updateServer: UpdateServerApi, startGame: (ModuleConfig, Boolean) => Unit) extends JFrame {

  setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE)
  setTitle("Nartallax's Launcher")
  setIconImage(new ImageIcon(Utils.readAndClose(this.getClass.getResourceAsStream("/cube_icon.png"))).getImage)
  getContentPane.setBackground(new Color(55, 55, 55))

  private val lastUpdateTime = updateServer.getClientTime()
  private val needUpdateBecauseOfTime = lastUpdateTime > settings.int("update")
  private var needUpdateBecauseOfRequest = false
  private val content = getContentPane
  content.setLayout(null)

  private val windowWidth = 550
  private val windowHeight = 360
  setSize(windowWidth, windowHeight)
  setResizable(false)

  private def updateSettings(in: (String, String)*) = settings = settings.update(in: _*)

  var inputs = Map[String, TextInput]()
  var labels = Map[String, Label]()
  private val screens = Map(

    "main" -> (() => {

      var updateButton: Button = null

      def refreshUpdateText() = {
        updateButton.setText(needUpdateBecauseOfTime match {
          case true => "Найдено обновление"
          case false => needUpdateBecauseOfRequest match {
            case true => "Обновление запрошено"
            case false => "Обновить клиент"
          }
        })
      }

      updateButton = new Button("", (30, 260, windowWidth - 60, 50), () => {
        needUpdateBecauseOfRequest = true
        refreshUpdateText()
      })

      refreshUpdateText()

      List(
        new Label(s"Вошел как ${settings("nick")}", (30, 20, windowWidth - 60, 50)),
        new Button("Настройки", (30, 80, windowWidth - 60, 50), () => screen("settings")),
        new Button("Играть", (30, 140, windowWidth - 60, 50), () => startGame(settings, needUpdateBecauseOfRequest || needUpdateBecauseOfTime)),
        new Button("Выйти", (30, 200, windowWidth - 60, 50), () => {
          updateSettings("id" -> "", "nick" -> "")
          screen("login")
        }),
        updateButton
      )}),

    "settings" -> (() => {List(
      new Label("Папка с игрой:", (15, 20, 160, 50)),
      new TextInput("installDir", settings("dir"), (170, 20, windowWidth - 190, 50)),
      new Label("Память:", (15, 80, 160, 50)),
      new TextInput("memory", settings("mem"), (170, 80, windowWidth - 190, 50)),
      new Label("Ключи JVM:", (15, 140, 160, 50)),
      new TextInput("tweaks", settings("tweaks"), (170, 140, windowWidth - 190, 50)),
      new Button("OK", (30, 200, windowWidth - 60, 50), () => {
        updateSettings(
          "dir" -> inputs("installDir").getText,
          "mem" -> inputs("memory").getText,
          "tweaks" -> inputs("tweaks").getText
        )
        screen("main")
      }),
      new Button("Отмена", (30, 260, windowWidth - 60, 50), () => screen("main"))
    )}),

    "login" -> (() => {
      val statusLabel = new Label("", (15, 260, windowWidth - 30, 50))

      def nick = inputs("nick").getText
      def pwd = inputs("password").getText

      List(
        statusLabel,
        new Label("Ник: ", (15, 20, 160, 50)),
        new TextInput("nick", "", (170, 20, windowWidth - 190, 50)),
        new Label("Пароль:", (15, 80, 160, 50)),
        new TextInput("password", "", (170, 80, windowWidth - 190, 50)),
        new Button("Войти", (30, 140, windowWidth - 60, 50), () => {
          val statusMessage = try {
            val id = authServer.id(nick, pwd)
            updateSettings("id" -> id, "nick" -> nick)
            screen("main")
            "Успешно."
          } catch {
            case e: ApiStatusException => e.message match {
              case ApiError.InvalidNick => "Некорректный ник."
              case ApiError.NotRegistered => "Игрок не зарегистрирован."
              case ApiError.WrongPassword => "Неправильный пароль."
              case _ => "Неизвестная ошибка."
            }
            case _: Exception => "Неизвестная ошибка."
          }

          statusLabel.setText(statusMessage)
        }),
        new Button("Зарегистрироваться", (30, 200, windowWidth - 60, 50), () => {

          val statusMessage = try {
            if(pwd.length < 5){
              "Пароль слишком короткий."
            } else {
              val id = authServer.register(nick, pwd)
              updateSettings("id" -> id, "nick" -> nick)
              screen("main")
              "Успешно."
            }
          } catch {
            case e: ApiStatusException => e.message match {
              case ApiError.InvalidNick => "Некорректный ник."
              case ApiError.DuplicateNick => "Этот ник уже занят."
              case _ => "Неизвестная ошибка."
            }
            case _: Exception => "Неизвестная ошибка."
          }

          statusLabel.setText(statusMessage)
        })
      )}),

    "download" -> (() => {
      List(
        new Label("Обновление клиента", (15, 80, windowWidth - 60, 50)),
        new Label("соединение...", (15, 140, windowWidth - 60, 50), "progress")
      )
    }),

    "launch" -> (() => {
      List(
        new Label("Запуск клиента", (15, 80, windowWidth - 60, 50)),
        new Label("подождите немного.", (15, 140, windowWidth - 60, 50), "progress")
      )
    })

  )

  def screen(screenName: String): Unit = {
    content.removeAll()
    inputs = Map[String, TextInput]()
    val controls = screens.getOrElse(screenName, () => List())()
    controls.foreach(c => {
      content.add(c)
      c match {
        case input: TextInput => inputs += input.name -> input
        case label: Label => labels += label.name -> label
        case _ =>
      }
    })
    this.repaint()
  }

  screen(settings("id").isEmpty match {
    case true => "login"
    case false => "main"
  })

}
