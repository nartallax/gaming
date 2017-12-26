package nartallax.minecraft.launcher.gui

import javax.swing.JLabel

import nartallax.minecraft.launcher.Config

class Label(text: String, rect: (Int, Int, Int, Int), val name: String = "") extends JLabel {

  setBounds(rect._1, rect._2, rect._3, rect._4)

  setText(text)
  setFont(Config.font)
  setForeground(Config.color("text_color"))
  setBackground(Config.color("background_color"))

}
