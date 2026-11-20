# Robot Arena: Core Rush

A top-down robot game for younger students, played in the browser with **VEX V5 controllers**, USB/Bluetooth gamepads, or the keyboard. 1–4 players, Red vs Blue.

**How to play:** drive into the yellow cores to pick them up (carry 2). Shoot them into your team's goal (Red scores on the right, Blue on the left). Shot in = 3 points, pushed in = 1 point.

## Controls
| | V5 controller / gamepad | Keyboard 1 | Keyboard 2 |
|---|---|---|---|
| Join / ready | A | Space | Enter |
| Drive | sticks (1-Stick, 2-Stick or Tank; X switches) | W A S D | Arrows |
| Shoot | R1, R2, L1, L2 | Space | Enter |
| Leave | B | Q | Backspace |

`Esc` returns to the player screen, `F` toggles full screen.

## Hooking up V5 controllers
The V5 controller doesn't show up as a normal game controller on a computer, so a V5 Brain relays it:

1. Open `v5/robot_arena_bridge.py` in VEXcode V5, download it to a brain and run it (no motors needed).
2. Plug the **controller** (paired to that brain) or the **brain** into the computer with USB.
3. In the game click **Connect V5 controller** and pick the VEX port. If nothing happens within a few seconds, connect again and pick the other VEX port (the brain has two; the game needs the User port).
4. A partner controller on the same brain becomes a second player.

Works in Chrome or Edge on Windows, Mac or ChromeOS (Web Serial). Close VEXcode first if it is holding the port.

## Running it
It's a single static page (`index.html`), no build step. Host it anywhere with HTTPS (GitHub Pages) or open it from a local server.
