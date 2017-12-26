package nartallax.minecraft.launcher.gui

import javax.swing.JTextField

import nartallax.minecraft.launcher.Config

class TextInput(val name: String = "", text: String = "", rect: (Int, Int, Int, Int)) extends BorderedPanel(rect = rect) {

  private val field = new JTextField()

  this.setLayout(null)

  private val offset = Config.int("border_thickness").toInt * 2
  field.setBounds(offset, offset, rect._3 - (offset * 2), rect._4 - (offset * 2))
  field.setFont(Config.font)
  field.setForeground(Config.color("text_color"))
  field.setBackground(Config.color("background_color"))
  field.setBorder(null)
  field.setText(text)

  add(field)

  def getText = field.getText

}
