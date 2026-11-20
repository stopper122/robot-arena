# Robot Arena

Robot games for younger students, played in the browser with **VEX V5 controllers**, USB/Bluetooth gamepads, or the keyboard.
Live at https://stopper122.github.io/robot-arena/

| Game | Difficulty | View | Players | Idea |
|---|---|---|---|---|
| Gem Hunt | ★ Easy | 3D | 1–4 | Drive over gems; gold gems are worth 3 |
| Sumo Bots | ★★ Medium | 3D | 1–4 + CPU robots | Push robots off a shrinking ring |
| Core Rush | ★★ Medium | 2D | 1–4, Red vs Blue | Collect cores, shoot them into your goal |
| Skills Course | ★★★ Hard | 3D | 1–4 race | Gates in order, avoid cones, park to finish (Beginner/Expert courses) |

## Controls
| | V5 controller / gamepad | Keyboard 1 | Keyboard 2 |
|---|---|---|---|
| Join / ready | A | Space | Enter |
| Drive | sticks (1-Stick, 2-Stick or Tank; X switches) | W A S D | Arrows |
| Shoot (Core Rush) | L-up, L-down, R-up, R-down | Space | Enter |
| Leave | B | Q | Backspace |

`Esc` returns to the player screen (and from there to the game menu), `F` toggles full screen.

## V5 controllers
Plug the controller into the computer with a USB data cable (close VEXcode first) and press a button. No brain or program needed.
The browser sees it as a game controller with its own numbering, which also changes when the controller is on or off;
`js/input.js` has both layouts (recorded on real hardware). Windows lists one V5 controller twice, so the join screen ignores the mirror copy.

## Code
Static site, no build step. Shared code in `js/` (input, audio, lobby/HUD, driving, three.js scene helpers); one HTML page per game.
3D uses three.js 0.170.0 from jsDelivr.
