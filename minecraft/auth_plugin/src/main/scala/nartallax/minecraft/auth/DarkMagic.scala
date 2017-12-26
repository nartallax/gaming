package nartallax.minecraft.auth

import java.lang.reflect.{Modifier, Field}

import org.bukkit.entity.Player

/**
  * средоточие темной магии в плагине
  */
object DarkMagic {

  def renamePlayer(player: Player, newName: String, log: String => Unit) = substValues(player, player.getName, newName, log, 5)

  private val primes = Set[Class[_]](
    classOf[java.lang.Integer],
    classOf[java.lang.Integer],
    classOf[java.lang.Byte],
    classOf[java.lang.Short],
    classOf[java.lang.Long],
    classOf[java.lang.String],
    classOf[java.lang.Boolean],
    classOf[java.lang.Float],
    classOf[java.lang.Double],
    classOf[java.lang.Character]
  )

  private def getFieldsWithValues(in: Any) = {
    var c = in.getClass
    var result = Map[Field, Any]()
    while(c != null){
      c.getDeclaredFields.foreach(f => {
        f.setAccessible(true)
        result += f -> f.get(in)
      })
      c = c.getSuperclass
    }
    result
  }

  private val modifiersField = classOf[Field].getDeclaredField("modifiers")
  modifiersField.setAccessible(true)

  private def setFieldValue[T](in: T, f: Field, v: Any): T = {
    if(!Modifier.isStatic(f.getModifiers)){
      modifiersField.setInt(f, f.getModifiers & ~Modifier.FINAL)
      f.set(in, v)
    }
    in
  }

  private def substValues[T](in: T, from: Any, to: Any, log: String => Unit, depth: Int): T = {
    try {
      if(depth >= 0) {
        val values = getFieldsWithValues(in)
        values.foreach(p => {
          val (f, v) = p
          if(from.equals(v)){
            setFieldValue(in, f, to)
          } else if(v != null && !primes.contains(v.getClass)){
            setFieldValue(in, f, substValues(v, from, to, log, depth - 1))
          }
        })
      }
    } catch {
      case e: Error => log("Error during substing field: " + e.getMessage)
      case e: Exception => log("Exception during substing field: " + e.getMessage)
    }
    in
  }

}
