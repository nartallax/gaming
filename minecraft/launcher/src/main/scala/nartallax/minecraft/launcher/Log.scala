package nartallax.minecraft.launcher

import java.io.{File, FileOutputStream, PrintStream}

object Log {

  val file = new File(Config("log_path"))
  val out = new PrintStream(new FileOutputStream(file))

  private def removeUserId(args: Iterable[String]): Iterable[String] = {
    var replacePrev = false
    args.map(c => if(replacePrev){
      replacePrev = false
      "USER_ID_WAS_HERE"
    } else {
      replacePrev = c.equals("--username")
      c
    })
  }

  def apply(in: Iterable[String]): Unit = this.apply(removeUserId(in).mkString("\n"))

  def apply(in: String): Unit = {
    out.println(in)
    out.flush()
  }

}
