package nartallax.minecraft.launcher.gui

import java.awt._
import java.awt.event.{MouseEvent, MouseAdapter}

import nartallax.minecraft.launcher.Config

class Button(var text: String, rect: (Int, Int, Int, Int), onclick: () => Unit = () => {}) extends BorderedPanel(rect) {

  def setText(newText: String) = text = newText

  override def paintComponent(g: Graphics){
    super.paintComponent(g)

    g.setColor(Config.color("text_color"))
    g.setFont(Config.font)

    val g2d = g.asInstanceOf[Graphics2D]
    val r = g2d.getFontMetrics().getStringBounds(text, g2d)
    g2d.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON)
    g.drawString(text, (rect._3 / 2) - (r.getWidth / 2).toInt, (rect._4 / 2) + (r.getHeight / 4).toInt)
  }

  addMouseListener(new MouseAdapter() {
    override def mousePressed(e: MouseEvent) = onclick()
  })



}
