package nartallax.minecraft.launcher.gui

import java.awt._
import java.awt.event.{MouseEvent, MouseAdapter}
import javax.swing.JPanel

import nartallax.minecraft.launcher.Config

class BorderedPanel(rect: (Int, Int, Int, Int),
                    outerBorderColor: Color = Config.color("outer_border_color"),
                    innerBorderColor: Color = Config.color("inner_border_color"),
                    backgroundColor: Color = Config.color("background_color"),
                    innerBorderThickness: Int = Config.int("border_thickness").toInt,
                    outerBorderThickness: Int = Config.int("border_thickness").toInt,
                    colorBrightening: Int = Config.int("brightening").toInt) extends JPanel {

  setBounds(rect._1, rect._2, rect._3, rect._4)

  private def brighter(c: Color, inc: Int) = new Color(c.getRed + inc, c.getGreen + inc, c.getBlue + inc)

  private val REST = 0
  private val HOVER = 1
  private val ACTIVE = 2

  private var state: Int = REST
  private def setState(newState: Int) = {
    state = newState
    repaint()
  }

  private def fillRectWithOffset(g: Graphics, color: Color, offset: Int) = {
    g.setColor(color)
    g.fillRect(offset, offset, rect._3 - (offset * 2), rect._4 - (offset * 2))
  }

  private def colorSet(b: Int) = (outerBorderColor, brighter(innerBorderColor, b), brighter(backgroundColor, b))

  override def paintComponent(g: Graphics){
    val colors = colorSet(colorBrightening * state)
    fillRectWithOffset(g, colors._1, 0)
    fillRectWithOffset(g, colors._2, innerBorderThickness)
    fillRectWithOffset(g, colors._3, outerBorderThickness + innerBorderThickness)
  }

  addMouseListener(new MouseAdapter() {
    override def mouseEntered(e: MouseEvent) = setState(HOVER)
    override def mouseExited(e: MouseEvent) = setState(REST)
    override def mousePressed(e: MouseEvent) = setState(ACTIVE)
    override def mouseReleased(e: MouseEvent) = setState(HOVER)
  })


}
