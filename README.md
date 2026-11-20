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

## Plugging in V5 controllers
No brain or extra program needed. The V5 controller shows up as a game controller over USB:

1. Turn the V5 controller **off**.
2. Plug it into the computer with a USB data cable (close VEXcode first).
3. Press any button so the browser notices it, then press **A** to join.

Works in Chrome or Edge. The V5's button numbering differs from an Xbox pad; the game detects the V5 (vendor 0x2888) and maps it automatically.

## Running it
It's a single static page (`index.html`), no build step. Host it anywhere with HTTPS (GitHub Pages) or open it from a local server.
