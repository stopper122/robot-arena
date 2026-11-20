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

## Playing on different computers
On the menu, one computer clicks **Host a room** and gets a 4-letter code. Other computers type the code and click **Join**.
The host picks the game and everyone's screen follows; players on joined computers press A in the game lobby like anyone else.
The host computer runs the game, and joined computers send their controller input and show what the host sees.
Connections are direct between browsers (WebRTC via [PeerJS](https://peerjs.com/) and its free public server), so no game server is needed.
A school network that blocks WebRTC peer connections will stop this; same-room play on one computer still works.

## Code
**Updating:** shared files load as `js/x.js?v=N` through each page's import map. After changing anything in `js/` or `css/`, bump `v=N` in all six HTML files, or browsers may keep the old file for up to 10 minutes.

Static site, no build step. Shared code in `js/` (input, audio, lobby/HUD, driving, three.js scene helpers); one HTML page per game.
3D uses three.js 0.170.0 from jsDelivr.
