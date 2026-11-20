# ---------------------------------------------------------------------------
# Robot Arena bridge  (VEXcode V5 - Python)
#
# Sends the V5 controller sticks and buttons to the Robot Arena web game.
# 1. Download this program to a V5 Brain and run it.
# 2. Plug the controller (paired to this brain) OR the brain into the computer
#    with a USB cable.
# 3. In the game, click "Connect V5 controller" and pick the VEX port.
# A partner controller on the same brain shows up as a second player.
# No motors are needed - the brain only relays the controller.
# ---------------------------------------------------------------------------
from vex import *

brain = Brain()
primary = Controller(PRIMARY)
partner = Controller(PARTNER)


def read(c):
    # Button order must match the game: L1 L2 R1 R2 Up Down Left Right X B Y A
    buttons = (c.buttonL1, c.buttonL2, c.buttonR1, c.buttonR2,
               c.buttonUp, c.buttonDown, c.buttonLeft, c.buttonRight,
               c.buttonX, c.buttonB, c.buttonY, c.buttonA)
    bits = 0
    for i in range(12):
        if buttons[i].pressing():
            bits = bits | (1 << i)
    return "%d,%d,%d,%d,%d" % (c.axis1.position(), c.axis2.position(),
                               c.axis3.position(), c.axis4.position(), bits)


brain.screen.set_font(FontType.MONO30)
brain.screen.print("Robot Arena bridge")
brain.screen.next_row()
brain.screen.set_font(FontType.MONO20)
brain.screen.print("Plug USB into the computer,")
brain.screen.next_row()
brain.screen.print("then click Connect in the game.")

last = ["", ""]
quiet = [0, 0]
while True:
    for n, c in ((1, primary), (2, partner)):
        data = read(c)
        quiet[n - 1] += 1
        # Send when something changes, plus a heartbeat 4 times a second.
        if data != last[n - 1] or quiet[n - 1] >= 12:
            print("V5,%d,%s" % (n, data))
            last[n - 1] = data
            quiet[n - 1] = 0
    wait(20, MSEC)
