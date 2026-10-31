# Raft Rage: Build Spec

This is the  game you will build. Every tunable number lives in the attached `balance_constants.json` (referenced below as `constants.<group>.<key>`). Load that file as config and never hard-code its values. The numbers in this spec match it; if you ever find a mismatch, stop and ask.

**Process rule:** do not write code until the builder has approved your architecture proposal and Phase 1 plan. Build one phase at a time, deploy, run that phase's acceptance tests, report results, then wait. Builder would view your results and test it too.

**Deadline:** Oct 31, 2026, 11:59 PM PT. **Cut line:** 7:59 PM PT (see §10).

---

## 1. Assumptions

These resolve gaps in the design. Values marked *assumed* in the constants file are starting guesses; tune them.

**Units and conventions**
- A1. Game units (u) = the prototype's pixels. "px" in this spec means u.
- A2. Angles increase clockwise seen from above. φ = 0° is the bow, +90° the raft's right side, ±180° the stern.
- A3. "Walk left" (◀) means the animal's own left as it faces the raft centre. In this convention ◀ always increases φ, ▶ always decreases it. Check: an animal at the stern pressing ◀ moves toward the raft's left side.

**Movement and firing**
- A4. **1v1:**
  - The 1v1 column in the character table replaces the 2v2 value, and the 1v1 ×1.6 impulse multiplier applies on top.
  - Frog's 1v1 "0.64 s" is its recharge time.
  - Any value with no 1v1 override stays the same in 1v1.
- A5. **Capybara's cant:** its fixed cant (40°, or 30° in 1v1) replaces the general cant formula. Aim = φ + sign(φ)·cant, with sign(±180°) = +1. Result: the right half spins the raft left and the left half spins it right.
- A6. **SYNC:**
  - "Opposite sides" means one animal on the left half (φ < 0) and one on the right half (φ > 0).
  - The +35% goes to the second shot of the pair, because each shot's multiplier is computed and locked at the moment it fires.
  - Bear counts as firing at the moment its push starts, and its SYNC bonus covers the first 0.16 s of that push.
- A7. **Heat:**
  - Heat runs from 0 to 1. It rises only while FIRE is held (for Frog, only while held at full charge) and cools at 0.8/s only while FIRE is not held, including during the lockout.
  - Bear has stamina instead of heat. Stamina refills whenever Bear is not pushing, including during its lockout.
- A8. **Airborne:**
  - No water forces, no keel, and no collisions with hazards, crates or the other raft. The banks still collide.
  - Firing still pushes.
  - The speed cap is not applied until the raft lands.

**Combat**
- A9. **Stun:**
  - A stunned raft's animals cannot walk, fire or whack.
  - Stun from every source (whack, log, spike, chomp) stacks, up to a 3 s total.
  - The 2 s immunity starts when a stun ends and covers only whacks and thrown logs.
  - A spike cannot re-trigger while the raft is still stunned from a spike.
- A10. **Whack:**
  - It lands when the rafts' centres are no more than 120 apart (*assumed*) and the rival is within 80° of the animal's rim direction.
  - Whack cooldown is 0.6 s (*assumed*).
  - A **block** happens when any animal on the targeted raft starts its own whack during the attacker's 0.28 s windup. Facing doesn't matter.

**Pickups and Turbo**
- A11. **Pickups belong to the raft:**
  - Bubble and Speed activate instantly.
  - A Log is held, at most one per raft, and the next WHACK by any crew animal throws it.
  - A thrown log aims at the rival if it is within 400 (*assumed*); otherwise it flies straight downstream.
- A12. A raft trailing by 150 or less uses neutral pickup odds (34/33/33). The design only defined the leader and "more than 150 behind".
- A13. **Turbo meter:**
  - One meter per raft.
  - Decay pauses while the meter is full, so TURBO READY doesn't flicker.
  - In 2v2 the triggering pair may be up to 0.3 s apart.

**Course, race and bots**
- A14. **Course:**
  - The layout is fixed: the same course every race, not randomly generated.
  - Course length, width and hazard sizes are *assumed*. Tune `course.length` until a 2v2 race of Normal bots finishes in 75 to 85 s.
  - The shortcut runs from 76% to 84% of the course (*assumed*).
- A15. **Race results:**
  - The first raft across the finish wins.
  - If nobody finishes by 240 s, the raft further along wins.
  - A raft that doesn't finish is shown as DNF with its distance to go.
- A16. **Bots:**
  - The numbers for whack/block chance, lookahead, candidate step, obstacle clearance and stuck detection are *assumed*.
  - The 40% shortcut roll applies only to rafts crewed entirely by bots.

**Rooms and lobby**
- A17. **Defaults:**
  - Multiplayer rooms start in 2v2.
  - Solo vs bots starts in 1v1 against a Chill bot.
  - The host cannot switch to 1v1 while more than 2 humans are seated.
- A18. Display names must be unique within a room (ignoring case), so that rejoining with the same name can reclaim the right seat.
- A19. Rematch returns everyone to the lobby with the same seats and animals, with Ready cleared.

**Phases**
- A20. Phase placement:
  - Disconnect handling, debug mode and the first two first-race hints are in Phase 1.
  - The "Fire together for TURBO" hint ships with Turbo in Phase 3.
  - Phase 3 is ordered by judging impact (§10).

**Sound, stats and views**
- A21. **Sound:**
  - All sound and music is synthesized in the browser. No audio files from anywhere else.
  - "Silly sounds" turns the animal voice sounds on or off, separately from the master Sound toggle.
- A22. **Stats:**
  - Thrusts = shots fired, where each Frog release counts as one and Bear scores one per 0.5 s of pushing.
  - Overheats include Frog misfires and Bear stamina lockouts.
  - Tied leaders share an award, and nobody gets an award for a stat of 0.
- A23. **Views:**
  - A phone held in landscape shows "Turn your phone upright".
  - If a laptop has two local players on different rafts, it shows a left/right split screen.
- A24. **Fonts:** use an open-licensed (for example SIL OFL) rounded display font or a system rounded font, and list its license on the credits line.

---

## 2. Pitch

Raft Rage is a real-time party racer for 1 to 4 players on their own phones or laptops: two round inflatable rafts race down a winding 3D river, and each animal on board stands on the rim with a cannon at its back. Fire, and your raft kicks away from where you're standing, so **where you stand is how you steer**. Teammates walk the rim, fire together from opposite sides for a SYNC boost that charges TURBO, whack the rival raft and block their whacks, dodge rocks, spiked banks, whirlpools and crocodiles, and hit the jump ramp fast for BIG AIR. Friends join with a 4-letter room code, with no login and no install, and every screen stays in sync.

---

## 3. Contest requirements checklist

| Contest requirement | How Raft Rage meets it | Phase | Test |
|---|---|---|---|
| Multiplayer from players' own devices | Rooms of 1 to 4 humans on any phone or laptop, plus spectators | 1 | P1-2, P1-3 |
| Every screen stays in sync | One authoritative simulation, input messages, 20 Hz snapshots, interpolation, a shared race clock | 1 | P1-4, P1-5 |
| Join with a room code; no login, no install | A 4-letter code plus a share link `?room=ABCD`, display name only, runs in the mobile browser | 1 | P1-1, P1-2 |
| Live at a public link | Deployed at the end of Phase 1 and redeployed after every phase | 1 | P1-1 |
| Rules a new player can pick up unaided | Three how-to cards in the lobby, fading first-race hints, plain labels on every button | 1 (+3) | P1-1, P3-8 |
| Built in ChatGPT Work mode | ChatGPT writes all code from this spec; nothing is pasted from the prototype | all | — |
| Original content only | Original animals, art, synthesized audio and an open-licensed font; no third-party names or logos in the game | all | P3-7 |
| Execution: stable and demo-ready | Bots fill seats, disconnects become bots, rematch works, a debug overlay helps find bugs | 1 | P1-7, P1-8 |
| Creativity | The stand-to-steer recoil mechanic, co-op SYNC, the Big Screen mode | 1 to 3 | P1-5, P3-4, P3-6 |
| Usefulness / Value | A 2-minute party game that works with 1 person or 4, on whatever devices are in the room | 1 | P1-1 |
| Polish & Thoughtfulness | Accessibility basics, edge cases (host left, late join, hidden tab), comic visual style | 1 to 3 | P3-7 |

---

## 4. Multiplayer architecture requirements

### 4.1 Propose and confirm (before any code)

Choose an architecture you can **actually build and deploy from Work mode**. Before writing code, tell the builder:
1. **Hosting:**
   - Where the public link will be hosted.
   - Whether it stays live, without sleeping or expiring, through the end of judging, which will be weeks after Oct 31.
2. **Realtime messaging:**
   - How devices in one room exchange messages in real time.
   - How that works on mobile Safari and Chrome over both Wi-Fi and cellular.
   - If you propose direct device-to-device connections, how you handle networks where they fail.
3. **Authority:**
   - Where the authoritative simulation runs: a server (preferred if you can run one reliably) or the host's device.
   - The trade-offs of your choice.
4. **Manual steps:** any step the builder must do by hand, such as creating a hosting account or clicking deploy. Players never log in; the builder may have to.
5. **Limits:** anything in this spec you can't deliver as written, and what you propose instead.

Name generic patterns only. Do not assume any particular service exists; if you rely on one, say so and confirm that you can use it.

### 4.2 Rooms

- **MP-1. Create room:**
  - Generates a 4-letter code from `ABCDEFGHJKLMNPQRSTUVWXYZ` (no I or O, and no digits, so no 0 or 1).
  - Re-rolls the code if it matches the name block list.
  - Makes a share link `<game-url>?room=ABCD`.
- **MP-2. Join:**
  - Takes a code and a display name.
  - The code is case-insensitive and ignores spaces.
  - A link with `?room=` opens the Join screen with the code prefilled.
- **MP-3. Display name:**
  - 1 to 12 characters, letters, numbers and spaces only.
  - Trimmed, with repeated spaces collapsed.
  - Unique in the room, ignoring case.
  - Checked against a simple profanity block list, matched after lowercasing and removing spaces.
  - Rejections give a plain reason ("Max 12 letters or numbers", "Name taken in this room", "Pick another name").
- **MP-4. Room limits:**
  - 1v1 has 2 seats; 2v2 has 4.
  - Up to 8 spectators.
  - A room closes when the host leaves, or after 20 min with no players.
- **MP-5. Where it works:** current mobile Safari (iPhone), mobile Chrome (Android) and desktop Chrome, Safari, Edge and Firefox.
- **MP-6.** Two browser windows on the same computer act as two separate players, so a judge can test alone.

### 4.3 Seats and roles

- **MP-7. Rafts and seats:**
  - Two rafts, Red and Blue.
  - In 1v1, each raft has 1 seat. In 2v2, each raft has a Left and a Right seat.
  - Empty seats are bots.
  - Each player picks a raft, a seat and an animal. Duplicate animals are allowed.
- **MP-8. Host:**
  - The room creator is the host.
  - Only the host sets the mode (1v1 or 2v2) and bot difficulty, starts the race, and presses Rematch.
  - Start is enabled only when every seated human is Ready.
- **MP-9. Solo vs bots:** one tap from Home creates a private room with you as host, seats you on Red, fills the rest with Chill bots and opens the lobby with Start enabled.

### 4.4 Authority and messages

- **MP-10. Simulation:**
  - One authoritative simulation per room.
  - It runs at 60 Hz with a fixed timestep (an accumulator; never a variable dt).
  - All randomness that affects play (pickup rolls, bot fumbles, bot shortcut choice) comes only from the authority's seeded random number generator.
- **MP-11. Clients send only inputs.**
  - **When:** on every change, and the current held state again 10 times a second, so a lost "release" can never stick.
  - **What:** each input message carries:

| Field | Meaning |
|---|---|
| `seat` | which seat this input drives |
| `seq` | increasing sequence number per seat; the authority ignores anything older than the last one it applied |
| `walk` | −1 (▶ held), 0, or +1 (◀ held) |
| `fire` | true while FIRE is held; the authority derives press and release edges from it |
| `whackCount` | a counter that goes up by 1 per WHACK press, so repeated messages never cause a double whack |

- **MP-12. Snapshots:**
  - The authority broadcasts a compact state snapshot 15 to 20 times a second (default 20).
  - Quantize the values; for example, positions to 0.1 u and angles to 0.1°.

| Snapshot part | Fields |
|---|---|
| Header | authority race time, tick, room phase (lobby, countdown, race, results), last applied `seq` per seat |
| Each raft | x, y, heading, vx, vy, angular velocity, height and vertical speed, progress, stun, slow and immunity time left, boost and turbo time left, turbo meter, held item, bubble on, finish time |
| Each animal | seat, φ, fire state (idle, held, charging, pushing), heat, charge, stamina, lockout left, recharge left, whack phase (idle, windup, cooldown) |
| World | crate states (active, or respawn time left), gate state (closed or open time left), crocodile phase (derived from race time; send it only if you prefer) |
| Events | a list of one-shot events (see MP-13) |

- **MP-13. Events:**
  - Each one-shot event has a unique id, a type, and the raft, seat, position and value it concerns.
  - Event types include: shot, SYNC, whack windup, hit, block, stun, chomp, launch, landing (with air time), too slow, overheat, pickup, log throw, close call, turbo ready, turbo start, gate open, gate hint, finish and banner.
  - Each event is repeated in snapshots for 1 s. Clients de-duplicate by id, so no device plays one twice.

### 4.5 Clients

- **MP-14. Rendering:**
  - Clients render at the authority's time minus a 100 ms buffer, interpolating between the two snapshots around that moment.
  - Each client estimates its clock offset from the authority by pinging every 2 s.
- **MP-15. Instant feedback:** pad buttons light up on touch without waiting for the network. Optionally, a client may predict its own animal's rim walk and correct it from snapshots; everything else comes from the authority.
- **MP-16.** The countdown, race timer, crocodile positions and every on-screen number follow the authority's clock.
- **MP-17. Hidden tab:** when the tab is hidden or the page loses focus, the client sends "all released" right away.

### 4.6 What "in sync" means

- **MP-18. Same state everywhere:** every device shows the same race state, within about 150 ms: raft positions, animal positions, timer, banners and results.
- **MP-19. Phones:** each phone shows its own raft's chase camera plus its own controller.
- **MP-20. Big Screen (Phase 3):**
  - A laptop can join as Big Screen: a spectator view of both rafts.
  - It switches to a split screen when the rafts are more than 500 apart.

### 4.7 Robustness

| Situation | Required behaviour |
|---|---|
| A player disconnects | After 3 s their seat becomes a bot. Show "Ben left, bot is driving" on every device. |
| A player rejoins with the same code and name | They reclaim their seat, even mid-race. |
| A late joiner (race in progress) | They spectate ("You'll join next race") with a live view, then pick a seat in the lobby. |
| The host leaves | Everyone sees "Host left. Start a new room" with a Home button. Host migration is optional. |
| The host's tab is hidden (host-device authority only) | Others see "Host paused…". The host sees a banner: "You're the host, keep this screen open". |
| Rematch | Keeps the room, the seats and the animals. Ready is cleared. |
| Tab hidden | All inputs release (MP-17). |
| Room code not found | "No room ABCD. Check the code with your host." |
| Room full | "Room is full. Watch as a spectator?" |

### 4.8 Performance

- **MP-21. Phone frame rate:** at least 30 fps on a mid-range phone.
  - Low-poly meshes.
  - At most 300 particles and about 150k triangles in view.
  - Device pixel ratio capped at 2.
- **MP-22. Auto low effects:** if fps stays below 30 for 3 s, turn on Low effects automatically and say so in a small toast.

### 4.9 Privacy and content

- **MP-23. Data:**
  - The only thing collected is a display name, held only for the room's lifetime.
  - No accounts, analytics, trackers, ads or payments.
  - A device may remember the last name it used locally, to prefill the field.
- **MP-24. Originality:**
  - All art, audio and text are original.
  - No third-party characters, brand names or logos, and no references to other games inside the game.

### 4.10 Debug mode (Phase 1; for the builder and tests only)

- **MP-25. Debug overlay:** `?debug=1` shows a small overlay with:
  - fps, ping, snapshot rate and interpolation buffer;
  - last input seq sent and acknowledged;
  - authority tick and race time;
  - the own raft's position, heading, speed and active multipliers;
  - each raft's pickup odds;
  - room phase.
- **MP-26. Debug-only host buttons:**
  - "Jump Red/Blue/both to N%" (5, 20, 40, 50, 68, 75, 95);
  - "Give pickup";
  - "Fill turbo";
  - "Hide HUD" (for cover screenshots).
- Debug mode is never shown without the flag.

---

## 5. Screens and flows

```
Home ─┬─ Create room ─► Lobby ◄── Join room ◄── (?room=ABCD link)
      ├─ Solo vs bots ─► Lobby (private)
      └─ How to play
Lobby ─(host: Start)─► Countdown ─► Race ─► Results ─(host: Rematch)─► Lobby
```
Room phases: `lobby → countdown → race → results → lobby`.

### 5.1 Home
- The **RAFT RAGE** title over a looping river scene, or a still image in Low effects.
- Buttons:
  - **Create room**
  - **Join room**
  - **Solo vs bots**
  - **How to play**
  - ⚙ **Settings**
- A footer line: "No login. Nothing to install." plus credits ("Made by Shernice", the font license).

### 5.2 Create room
- A name field (MP-3) and a **Create** button, then the Lobby, with you as host.

### 5.3 Join room
- **Fields:** a code field (4 boxes, auto-uppercase), a name field and a **Join** button.
- **Prefill:** the code is prefilled from `?room=`, and the name field gets focus.
- **Errors:** plain error messages (§4.7).
- **Race already running:** join as a spectator.

### 5.4 Lobby (includes character select)
- **Top:**
  - The room code in large letters.
  - **Copy link**.
  - **Share**, using the device's share sheet when available.
  - A "Players join at this link with no login" note.
- **Seat grid:**
  - Two columns, RED and BLUE, each labelled with its colour, the word, and an icon (Red ▲, Blue ●).
  - Each seat shows a name, "Bot (Chill)" or "Open, tap to sit".
  - Tapping a seat takes it.
- **Character select:**
  - Four portrait cards, each with a name, its propulsion word, and Push/Turn/Ease pips that are labelled and also shown as a number (e.g. "Push ●●●○○ 3").
  - The selected card is marked with a ✓ and the word SELECTED, not by colour alone.
  - Phase 1 shows only the Hippo card.
- **Ready:** a toggle that shows ✓ READY or "Not ready" on every device.
- **Host controls:**
  - Mode (1v1 / 2v2).
  - Bot difficulty (Chill, Normal or Spicy; Phase 2).
  - **Start**, disabled with a reason ("Waiting for Ana to be Ready").
- **How-to strip:** the three cards "Stand to steer", "Pick an animal" and "Whack and block", always visible as a swipeable strip.
- **Other:** a **Big Screen** option (Phase 3) and **Leave**.

### 5.5 How to play
- The three cards, each with a simple illustration and one sentence, plus the full plain-words rules from §8.
- Reachable from Home and from the Lobby.

### 5.6 Race
- **Countdown:** 3-2-1-GO, synced to the authority.
- **HUD:**
  - A progress bar along the top showing both rafts (▲ RED, ● BLUE), with your raft tagged YOU.
  - The race timer.
  - Your raft's turbo meter.
  - Banners for events.
- **Phone:** the chase camera of your own raft, plus your pad (§6).
- **Late joiners and spectators:** a camera that follows the leader in Phase 1, and the Big Screen view in Phase 3.

### 5.7 Results
- A big winner banner ("RED WINS").
- Both rafts' times, or DNF with distance to go.
- The crews: names and animals, with bots labelled "Bot".
- **Phase 3 additions:**
  - A stats table with the best value in each column marked ★ and highlighted.
  - The awards.
- **Buttons:**
  - The host gets **Rematch**.
  - Everyone else sees "Waiting for host…".
  - Everyone gets **Leave**.

### 5.8 Rematch
- Back to the Lobby with the same room, seats and animals, and Ready cleared.
- Spectators can now take open seats.

### 5.9 Overlays
- **Connection:**
  - "Reconnecting…", with a spinner and text.
  - "Host left. Start a new room".
  - "Host paused…".
- **Phone:**
  - "Turn your phone upright".
  - "Tap anywhere for sound": shown once on iPhone until the first tap; the Ready tap counts.

### 5.10 Settings (⚙, on Home, in the Lobby and in a corner during the race)
- **Sound:** on/off (master).
- **Silly sounds:** on/off.
- **Low effects:** on/off.
- **Reduce motion:**
  - It follows `prefers-reduced-motion` by default and can be set manually.
  - When on, there is no screen shake and the camera is gentler.

### 5.11 Accessibility rules (all screens)
- **Touch targets:** at least 44 px; pad buttons are much larger.
- **Contrast:** text contrast of at least 4.5:1; comic text gets a dark outline.
- **Never colour alone:**
  - Teams: the RED/BLUE word plus the ▲/● icon.
  - Ready: ✓ plus the word.
  - Heat: the "HOT" label plus steam.
  - Selected card: ✓.
  - Best stat: ★.
- **Text alternatives:** every sound event also has a visual (a banner or pop).

---

## 6. Phone layout (portrait)

```
┌─────────────────────────────┐
│ ▲RED ━━━━━●BLUE━━━━ 🏁 0:42 │  progress bar + timer
│                             │
│        RACE VIEW (55%)      │  chase cam of YOUR raft;
│   banners pop here          │  follows the river direction,
│                             │  not the raft's spin
├─────────────────────────────┤
│ HEAT ▮▮▮▮▯ HOT   TURBO ▮▮▯▯ │  meters row
│                  [ WHACK  ] │
│ [  ◀  ] [  ▶  ]  [        ] │
│                  [ SPOUT  ] │  big FIRE (label per animal)
└─────────────────────────────┘
        PAD (45%)
```
- **Split:** the race view takes the top 55% of the height and the pad the bottom 45%.
- **Thumbs:** the left thumb works ◀ ▶; the right thumb works FIRE (the largest button) and WHACK above it.
- **FIRE button:**
  - Its label matches the animal: SPOUT, CHARGE, PUSH or WHIRL.
  - It carries that animal's bar: heat for Hippo and Capybara, charge for Frog, stamina for Bear.
- **Touch input:**
  - Multi-touch is required: holding ◀ and FIRE together must work.
  - Use per-button pointer events with `touch-action: none`.
  - Block double-tap zoom, long-press menus, text selection and pull-to-refresh.
- **Layout:** respect safe-area insets (the notch and the home bar).

## 7. Laptop layout

- **View:** a full-window race view with the HUD overlaid, and a key legend bottom-left that fades after 10 s.
- **Keys:**

| Player | Walk | Fire | Whack |
|---|---|---|---|
| Player 1 | A / D | W | S |
| Player 2 (same laptop) | ← / → | ↑ | ↓ |

- **Second local player:** they take their own seat in the lobby. If they are on the other raft, the view splits left/right.
- **On-screen pad:** a clickable version is available as a fallback, hidden by default.
- **Big Screen:** a spectator mode with no pad, showing both rafts and switching to split screen when they are more than 500 apart (Phase 3).

---

## 8. Game rules for a new player (plain words)

1. **The basics:** you're an animal standing on the edge of a round raft, with a cannon on your back.
2. **Firing pushes you away from where you stand.**
   - Stand at the back to go forward.
   - Stand on the right to slide left; stand on the left to slide right.
3. **Moving:** walk around the edge with ◀ ▶. Fire with the big button.
4. **Teammates:** if you have a teammate, fire at the same moment from opposite sides for a SYNC boost. Enough SYNCs fill TURBO.
5. **Heat:** don't hold fire too long, or your cannon overheats. Tapping in rhythm is safe.
6. **Whacking:** when the other raft is close, WHACK it to stun it. If they wind up a whack at you, WHACK back to block.
7. **The river:**
   - Grab crates.
   - Dodge rocks, spiky banks, whirlpools and crocodiles.
   - Hit the ramp fast to fly.
8. **Winning:** the first raft through the FINISH arch wins.

---

## 9. Full game design

All numbers are in `balance_constants.json`; the key is given in brackets.

### 9.0 Concept

- **The race:** co-op raft racing. Two round inflatable rafts race down a winding 3D river, rendered in Three.js in the comic style of §9.19.
- **The mechanic:**
  - Each animal stands on the raft's rim with a cannon at its back.
  - Firing kicks the raft away from where the animal stands, so where you stand is how you steer, and teammates have to coordinate.
- **The camera:** the chase camera follows the **river direction**, not the raft's spin.

### 9.1 Simulation order (authority, every 1/60 s tick)

1. Apply the latest inputs.
2. Update animals: walking, timers, heat, charge, stamina, whack windups.
3. Start new shots; detect SYNC; update Turbo.
4. Apply active shot impulses and Bear pushes.
5. Water forces, damping, keel, whirlpools.
6. Airborne integration.
7. Integrate position and heading; apply the speed cap.
8. Collisions: banks and spikes, rocks, logs, raft vs raft, crates, crocodiles, ramp, gate.
9. Progress, slipstream, finish, close calls.
10. Bots decide (on their own decision tick).
11. Queue events; every 3rd tick, send a snapshot (20 Hz).

### 9.2 Raft body [`raft`]

| Value | Number |
|---|---|
| Raft radius R (also the collision radius) | 34 |
| Mass | 1 |
| Moment of inertia | 0.5·R² = 578 |
| Rim radius where animals stand | 26 |

Physics happens in a 2D plane (x, y), plus a height for jumps. The renderer maps it into 3D.

### 9.3 Walking [`walking`]

| Mode | Range | Speed |
|---|---|---|
| 1v1 | the whole ring, wraps around | 180°/s |
| 2v2 left animal | −180° … −20° | 120°/s |
| 2v2 right animal | +20° … +180° | 120°/s |

- **The bow is empty in 2v2:** no animal stands between −20° and +20°.
- **Stern gap:** keep at least 30° between the two animals across the stern. The animal that is moving stops.
- **Frog:** walks at half speed while charging.
- **Zone stripes:** draw each 2v2 animal's zone as a coloured stripe on the tube with white end posts (Phase 2).

### 9.4 Firing [`firing`, `multipliers`]

- **Recoil:** each shot applies an impulse in the opposite direction to the cannon, at the animal's position.
  - Aim angle = φ + cant(φ), where cant(φ) = −20°·sin(2φ). Capybara uses its own cant (A5).
  - Force direction = −(aim direction in world space).
  - Torque = position × force. Δω = (r × F) / I.
- **Spread:** the impulse is spread evenly over 0.16 s. Each step recomputes the direction from the raft's current heading, using the φ locked at the moment of firing.

Pseudocode for one active shot, per tick:
```
portion = shot.dv * mult * (dt / 0.16)
dir     = worldDir(raft.heading, shot.phi + shot.cant)
F       = -dir * portion
raft.v     += F / mass
raft.omega += cross(worldPos(raft, shot.phi, 26), F) / I
```

- **Multipliers** (they stack by multiplying; each shot's multiplier is locked when it fires):

| Condition | Thrust multiplier |
|---|---|
| Slowed | ×0.5 |
| Speed boost | ×1.5 |
| Slipstream | ×1.3 |
| SYNC: the second of two shots from opposite sides within 0.15 s | ×1.35 (+35%) |
| Turbo | ×1.5 |
| Any 1v1 shot | ×1.6 |

### 9.5 Water [`water`]

| Rule | Value |
|---|---|
| River current | 55 u/s along the local path direction (× current multipliers) |
| Relax toward the current | rate 1.05/s: `v += (current − v)·(1 − e^(−1.05·dt))` |
| Angular damping | `ω *= e^(−3·dt)`, or `e^(−1·dt)` while stunned |
| Speed cap | 430 u/s |
| Keel (unless stunned or airborne) | `ω += 2.2 × headingError × dt` (rad/s per second), turning toward the river direction |

| Current multiplier | Value |
|---|---|
| Slipstream | ×1.25 |
| Turbo | ×1.3 |
| Shortcut rapid | ×2.2 |

### 9.6 Heat [`heat`]

| Rule | Value |
|---|---|
| Hippo and Capybara overheat after holding FIRE for | 3 s |
| Frog overheats after being held at full charge for | 1.5 s (the charge misfires: no kick) |
| Warning from | 70% heat: the cannon flashes orange, steams and hisses, and the bar shows "HOT" |
| Overheated | no firing for 1 s; shows OVERHEAT |
| Cooling | 0.8 per second while FIRE is not held, so tapping in rhythm never overheats |

### 9.7 Characters [`characters`]

All animals share the same whack, block and walk speed. No hidden perks.

| Animal | FIRE label | Input | 2v2 numbers | 1v1 override (then ×1.6) |
|---|---|---|---|---|
| Hippo | SPOUT | tap or hold (auto-fires when recharged) | 50 dv per shot, 0.5 s recharge | 48 dv |
| Frog | CHARGE | hold to charge, release to fire | 50 to 180 dv, linear over a 0.8 s charge; 0.65 s recharge; half walk speed while charging; a hit cancels the charge; puffs up while charging | up to 170 dv; 0.64 s recharge |
| Bear | PUSH | hold | 104 dv/s while held; 2.2 s of stamina, refilling at 1.83 per s; emptying it gives a 1.2 s lockout ("TIRED") | 107 dv/s |
| Capybara | WHIRL | tap or hold | 44 dv, 0.55 s recharge; cannon canted 40°, so every shot also spins hard (the right half spins you left, the left half spins you right) | 30° cant, 52 dv |

| Card pips | Push | Turn | Ease |
|---|---|---|---|
| Hippo | 3 | 2 | 4 |
| Frog | 5 | 2 | 2 |
| Bear | 3 | 1 | 5 |
| Capybara | 2 | 5 | 3 |

### 9.8 Combat [`combat`]

- **WHACK:**
  - It reaches the other raft when the rival is within 80° of where the animal stands and the rafts' centres are no more than 120 apart (*assumed*).
  - 0.28 s windup; 0.6 s cooldown (*assumed*).
- **Block:** if the defender whacks during the attacker's windup, show BLOCK, with no stun.
- **A landed hit:**
  - Stuns for 1.5 s, stacking to a 3 s maximum.
  - Slows for 3 s (thrust ×0.5).
  - Then gives 2 s of immunity, starting when the stun ends.
- **Thrown logs** (a pickup) are hits too. A Bubble blocks the next hit.

### 9.9 Course [`course`]

- **Layout:** a winding river with sharp turns.
  - Fixed layout; length 18,000 (*assumed*, tune per A14); half-width 200 (*assumed*).
  - Rafts start side by side, 70 either side of the centre line (*assumed*).
- **Spikes:**
  - They line the outer bank of the 5 sharp turns (*assumed* count).
  - A hit gives a 0.6 s stun and halves the raft's speed (velocity ×0.5). A Bubble blocks it.
  - A warning sign stands before each spiked turn.
- **Obstacles:**

| Obstacle | Count | Size (*assumed*) | Effect |
|---|---|---|---|
| Rocks | 13 | radius 20 to 40 | solid; bounce (restitution 0.4) |
| Floating logs (anchored, they bob) | 4 | 120 × 24 | solid; bounce |
| Whirlpools | 3 | radius 70 | spin +3 rad/s² and extra drag 1.2/s while inside |

- **Collisions:** banks bounce with restitution 0.4, and the two rafts bump each other with restitution 0.5 (*assumed*).

### 9.10 Pickups and slipstream [`pickups`, `slipstream`]

- **Crates:** 10 of them; each respawns 8 s after it's collected.

| Pickup | Effect |
|---|---|
| Bubble | blocks the next hit or spike |
| Speed swirl | 3 s boost (thrust ×1.5) |
| Log | held; thrown with the next WHACK (auto-aims at the rival within 400, flies at 500) |

| Who opens the crate | Speed | Log | Bubble |
|---|---|---|---|
| A raft more than 150 behind | 50% | 35% | 15% |
| The leader | 25% | 25% | 50% |
| Trailing by 150 or less (*assumed*) | 34% | 33% | 33% |

- **Slipstream:** active between 80 and 900 behind the leader; thrust ×1.3 (+30%) and current ×1.25 (+25%). Show a "SLIPSTREAM" label.

### 9.11 Shortcut [`shortcut`]

- **The rapid:** a fast side channel with current ×2.2 that saves about 5 s, from 76% to 84% of the course (*assumed*), behind a log gate.
- **Gate:**
  - One whack near the gate (within whack reach) opens it for 6 s.
  - A raft pinned at the closed gate sees "WHACK THE GATE!" every 1.5 s.
  - After 4 s pinned, the gate gives way, so nobody is ever trapped.

### 9.12 Crocodiles [`crocodiles`]

- **Placement:** 3 crocodiles, at 23.5%, 54.5% and 69% of the course.
- **Motion:**
  - A sine path across 72% of the half-width, with periods 4.6, 5.4 and 5.0 s.
  - Position = 0.72·halfWidth·sin(2π·t/period), where t is the authoritative race time. This is a pure function of race time, so every device agrees.
- **CHOMP** (on touch; collision radius 28, *assumed*):
  - 1 s stun.
  - 1.5 s slow.
  - Knocked back at 160 u/s, upstream.
  - Then a 1.6 s cooldown per raft.
- **Jaws:** they snap faster when a raft is within 140. This is cosmetic.
- **Airborne rafts** pass over crocodiles.

### 9.13 Jump ramp [`ramp`]

- **The ramp:** a wooden ramp at 43% of the course, in the middle of the river, 80 long and 112 wide.
- **LAUNCH** (above 160 u/s along the river):
  - Vertical speed = 110 + 0.5·speed, gravity 520, horizontal speed ×1.12.
  - While airborne the raft flies over hazards and can't be whacked, and a shadow on the water shows where it will land.
  - On landing it shows "BIG AIR x.xs" (the air time).
- **TOO SLOW** (160 u/s or below): speed ×0.6, shown as a banner.

### 9.14 Race end [`race`]

- **When it ends:** 15 s after the first finisher, or at 240 s, whichever comes first.
- **Always visible:** the finish arch and the progress bar showing both rafts.

### 9.15 Sync Turbo [`turbo`]

| Rule | Value |
|---|---|
| 2v2 fill | +16% per synced pair |
| 1v1 fill | each shot adds shot dv ÷ 2000 |
| Decay | 2% per second (paused while full) |
| Ready | when full, show "TURBO READY" |
| Trigger | the next synced pair within 0.3 s (in 1v1, the next shot) |
| Effect | 2.5 s: thrust ×1.5, current ×1.3, a pink trail and a TURBO banner |

### 9.16 Bots [`bots`]

- **Who they are:** bots fill empty seats. The host sets the difficulty in the lobby; the default is Chill.
- **Aim:** on every decision tick, take an aim point from an obstacle-avoiding lookahead along the river path. The lookahead is 220 ahead, and the aim shifts sideways to keep 30 clear of obstacles (*assumed*).
  - Desired change = unit(aim − position)·targetSpeed − velocity.
- **Scoring:**
  - For each candidate rim position (every 15°, *assumed*, inside the bot's zone): score = cos(angle between recoil and desired change) − w·(predicted change in |angular velocity|).
  - w = 0.25, or 0.8 when |ω| > 0.8 rad/s.
  - The bot walks toward the best candidate.
- **Per character:**

| Character | Rule |
|---|---|
| Hippo, Capybara | fire when the score > 0.4 |
| Frog | charge when the score > 0.4; release after 0.5 to 0.8 s, with jitter |
| Bear | hold while the score > 0.3 and stamina > 0.3 s |

- **Difficulty:**

| Level | Decision tick | Fumble | Target speed | Whack and block |
|---|---|---|---|---|
| Chill | 0.32 s | 22% | 240 | rarely (10% chance, *assumed*) |
| Normal | 0.2 s | 6% | 270 | sometimes (35%, *assumed*) |
| Spicy | 0.15 s | 2% | 300 | often (70%, *assumed*) |

- **Other bot rules:**
  - "Fumble" means the decision is replaced by a random walk or a skipped shot.
  - In 2v2, bots stay out of the outer 20° at the stern end of their zone.
  - **Stuck detection:** if the raft gains less than 30 progress in 2 s while not stunned, push off by facing the nearest bank or obstacle and firing (*assumed*).
  - 40% of all-bot rafts take the shortcut (rolled once per race by the authority).

### 9.17 End-of-race stats and awards [`stats`]

| Stat | Counts | Award for the leader |
|---|---|---|
| Thrusts | shots fired (A22) | Engine Room |
| Hits landed | whacks and thrown logs that hit | Sharpshooter |
| Blocks | successful blocks | The Wall |
| Close calls | passing within 14 of a rock, log, whirlpool, crocodile or spiked bank without touching it; credited to whoever fired in the last 1.5 s; shown as a green "CLOSE CALL!" pop | Daredevil |
| Overheats | overheats, Frog misfires, Bear lockouts | Hothead |

The results screen shows both rafts' times, the crews, the stats table with the best in each column marked ★, the awards and a Rematch button.

### 9.18 Controls

- **Phone pad, per player:** ◀, a big FIRE (labelled SPOUT, CHARGE, PUSH or WHIRL, with a heat, charge or stamina bar), ▶ and WHACK.
- **Laptop:** A/D walk, W fire, S whack. The arrow keys are a second local player.

### 9.19 Visual style (target: a bold cartoon comic look; stays 3D)

- **Shading:** toon/cel shading with 3-step lighting, plus dark outlines on all characters, rafts and props.
- **Characters:**
  - Chunky, character-specific shapes.
  - Big expressive eyes with pupils and eyebrows; open mouths with teeth.
  - A team-colour helmet and an orange life vest, which also make the teams readable at a glance.
  - Squash and stretch when firing, a lean while walking the rim, and a big wind-up arc on the whack.
- **Expressions change with state:**

| State | Expression |
|---|---|
| Firing | determined |
| Whacking | angry brows |
| Stunned | spiral eyes with orbiting stars |
| Chomped or airborne | shocked |

- **Raft:** a segmented inflatable tube, a rope line with tie points, a wooden bench across it, and a wobble on impact or landing. Each animal has a red rim cannon at its back.
- **Water:** blends from deep teal in the centre to aqua at the edges, with:
  - animated streaks flowing with the current;
  - white foam at rocks, banks and logs;
  - a white wake behind each raft;
  - whitewater at the rapids, the shortcut and the ramp landing;
  - spiral foam whirlpools;
  - chunky splash bursts.
- **Per-animal effects:**

| Animal | Effect |
|---|---|
| Hippo | water droplets and splash rings |
| Frog | green puff ring |
| Bear | brown bubble stream |
| Capybara | swirl rings |

- **World:**
  - Boulder banks and mixed trees.
  - Wooden docks with small cheering spectator animals.
  - Danger signs before spikes and crocodiles.
  - A wooden FINISH banner.
  - A sky gradient with distance fog.
- **Comic effects:**
  - Outlined, tilted burst words with starbursts behind them: WHACK!, CHOMP!, SPINNING!, STUNNED!, BIG AIR!
  - Impact stars, puff clouds and speed lines.
  - A chunky rounded comic font (open-licensed) for all game text.
- **Build order if time is short:**
  1. Outlines and toon shading.
  2. Faces and expressions.
  3. Water foam and wake.
  4. Comic burst text.
  5. Spectators and docks.

### 9.20 Visual guardrails (the style never changes gameplay)

- **Gameplay is untouched:** no change to rules, physics numbers, sync or balance.
- **Performance:**
  - At most 300 particles and about 150k triangles in view.
  - 30 fps on a mid-range phone.
  - A **Low effects** toggle turns off outlines, spectators and extra foam.
- **Hitboxes:** every visual stays inside the 34-unit collision radius. Never change collision to fit the art.
- **Readability:** hazards stay high-contrast (dark rocks, bright warning signs), and foam is always lighter than any hazard.
- **Sync:**
  - Expressions are driven by state already in the snapshots: stun, swing, charge and height.
  - Faces, spectators and splashes are computed on each device, with no extra network traffic.
  - Cosmetic randomness is fine. Anything that affects play comes only from the shared state.
- **Scheduling:** the full style is Phase 3. Phase 1 uses simple shapes with toon shading.

### 9.21 Look and sound

- **Music:** original chiptune, synthesized in the browser, speeding up from ×1.0 to ×1.25 tempo as the race progresses (*assumed*).
- **Animal sounds:** one short sound per animal, with a **Silly sounds** toggle and a master **Sound** toggle.
- **iPhone:** start or resume audio on the first tap.
- **Teaching:**
  - Three how-to cards in the lobby: "Stand to steer", "Pick an animal", "Whack and block".
  - First-race hints that fade once the player has done the action: "Walk with ◀ ▶", "Fire pushes you away from where you stand", and "Fire together for TURBO" (2v2 only).
  - The hints show only in each device's first race of the visit.

### 9.22 Validation history (context only)

In single-device bot races:
- The mean finish was about 75 to 85 s, with no stuck rafts.
- With the keel, a raft faced backwards less than 2% of the time, against 40% without it.

Use these as tuning targets.

---

## 10. Phased build plan with cut lines

Deploy to the public link at the end of **every** phase, and of every Phase 3 step. Each deploy must leave a working game.

### Phase 1: MVP (must ship; everything after it is optional)
- **Multiplayer:**
  - Rooms, join by code and by link, name rules.
  - Lobby with seats and Ready.
  - Synced countdown.
  - Solo vs bots.
- **Race:**
  - A river with banks, spikes and rocks.
  - Two rafts with rim walking and Hippo recoil (every animal is a Hippo in this phase).
  - Whack, block and stun.
  - Finish line, results with times, Rematch.
- **Bots:** in empty seats, at Chill.
- **Robustness:** disconnect becomes a bot, rejoin, late-join spectating, host left, hidden tab releases inputs.
- **Teaching:** how-to cards plus the first two first-race hints.
- **Accessibility:** basics, including reduced motion and the settings panel; the Sound toggle can stay hidden until there is sound.
- **Tools:** debug mode (MP-25, MP-26).
- **➜ DEPLOY to the public link before starting Phase 2.**

━━━━━━━━━━ CUT LINE 1: if behind schedule, ship Phase 1 and go straight to bug-fixing ━━━━━━━━━━

### Phase 2: Depth
- All four animals with heat, stamina and charge; character cards.
- Keel and zone stripes.
- Floating logs, whirlpools, pickups with catch-up, slipstream.
- Bot difficulty (Chill, Normal, Spicy).
- Sounds and music, with the Sound and Silly sounds toggles.
- **➜ DEPLOY.**

━━━━━━━━━━ CUT LINE 2 ━━━━━━━━━━

### Phase 3: Wow (in this order; deploy after each step)
- **3A.** Crocodiles and the jump ramp. These are needed for the cover image.
- **3B.** Visual style steps 1 and 2: outlines and toon shading, faces and expressions. Add the Low effects toggle at the same time.
- **3C.** Sync Turbo, plus the "Fire together for TURBO" hint.
- **3D.** End-of-race stats and awards.
- **3E.** Visual style steps 3 and 4: water foam and wake, comic burst text.
- **3F.** Big Screen spectator mode.
- **3G.** Shortcut gate.
- **3H.** Visual style step 5: spectators and docks. Then the polish pass.

**Cut rule:** if fewer than 4 hours remain before the deadline (that is, after **7:59 PM PT, Oct 31**), stop adding features. Fix the bugs found by the playbook, make sure the public link works, and submit.

---

## 11. Acceptance tests

**Devices:**
- **Laptop L:** desktop Chrome; host unless stated.
- **Phone A:** iPhone, Safari.
- **Phone B:** Android, Chrome, or a second phone.
- **Device D:** any fourth device.

Run with `?debug=1` where a test says "debug". Each test takes under a minute.

### Phase 1
| ID | On device… do… | Expect on every device |
|---|---|---|
| P1-1 | On **Phone A**, in a private window: open the public link, tap **Solo vs bots**, enter "Ana", tap Start. | No login or install prompt. A 1v1 race against a bot starts within 10 s, and the bot raft moves downstream. The hints "Walk with ◀ ▶" and "Fire pushes you away…" appear, then fade after use. How to play is reachable from Home and from the Lobby. |
| P1-2 | On **Laptop L**, Create room as "Lia". On **Phone A**, Join by typing the code in lowercase, as "Ana". On **Phone B**, open the copied link; try "Benjamin Franklin", then "B@n", then join as "Ben". | The code is 4 letters with no I or O. Phone B's code is prefilled. The two bad names are rejected with a plain reason. Lia, Ana and Ben are listed on all three devices within 2 s. |
| P1-3 | **Host** picks 2v2. Ana takes Red Left, Ben takes Blue Left, Lia takes Red Right. The host then tries to switch to 1v1. | The same seat grid on every device, with Blue Right shown as "Bot". Start stays disabled with a reason until all three show ✓ READY. 1v1 is refused with a reason. |
| P1-4 | **Host** taps Start; hold all devices side by side. | 3-2-1-GO on every device within about 0.2 s of each other. Timers match within about 0.2 s throughout. |
| P1-5 | On **Phone A**, walk Ana to the back of the raft and tap SPOUT 5 times. Then walk to the right side and tap 3 times. Then hold ◀ and SPOUT together. | Buttons light the instant they're touched. The Red raft surges forward, then slides left, the same way on every screen, with the kick visible on the other devices within about 150 ms. Multi-touch works. |
| P1-6 | Steer Red beside Blue. On **Phone A**, tap WHACK. Next time, have **Phone B** tap WHACK during Ana's windup. | First: a windup, then WHACK!, and Blue shows STUNNED (label plus stars) for about 1.5 s and can't fire. Second: BLOCK, and no stun. A whack within 2 s after a stun ends does nothing (immunity). |
| P1-7 | Mid-race, put **Phone B** in airplane mode for 5 s, then turn it off and rejoin with the same code as "Ben". Then **Device D** joins as "Dee". | Within about 3 s, "Ben left, bot is driving" appears and Blue keeps racing. After rejoining, Ben is back in Blue Left. Dee sees "You'll join next race" with a live view. |
| P1-8 | Debug: **Host** taps "Jump both to 95%", and the race finishes. The host taps Rematch. | A finish banner when the first raft crosses. Results within 15 s, with identical times on every device. Rematch returns everyone to the Lobby with the same seats and animals and Ready cleared. Dee can take Blue Right. |

### Phase 2
| ID | On device… do… | Expect on every device |
|---|---|---|
| P2-1 | On **Phone A**, open character select. Ana and Lia both pick Frog. | Four cards with labelled Push/Turn/Ease pips and numbers. Duplicates are allowed. Each pad's FIRE reads SPOUT, CHARGE, PUSH or WHIRL to match its animal. |
| P2-2 | As Hippo, hold SPOUT for 3 s. Then tap about twice a second for 10 s. | From about 2.1 s: orange flash, steam, a hiss and "HOT". At 3 s, OVERHEAT and 1 s of no firing. Steady tapping never overheats. |
| P2-3 | As Frog, hold CHARGE and release at full. Next, hold at full for 1.5 s. Next, get whacked while charging. | The bar fills over 0.8 s, the frog puffs up and walks at half speed, and release gives the biggest kick. Held at full: a misfire (no kick) plus OVERHEAT. The whack cancels the charge. |
| P2-4 | As Bear, hold PUSH until it stops. | A steady push. The stamina bar empties in about 2.2 s, then a 1.2 s "TIRED" lockout, then the bar refills. |
| P2-5 | In 1v1 as Capybara, stand on the raft's right side and tap WHIRL 3 times. Then do the same on the left side. | Right side: the raft spins left (counter-clockwise from above). Left side: it spins right. The same on every screen. |
| P2-6 | In 2v2: walk the left animal toward the bow, then both animals to the stern. Spin the raft and let go. | Zone stripes with white end posts. The left animal stops at −20°. The animals stop 30° apart at the stern. With no input, the raft turns to face downstream within about 2 s. |
| P2-7 | Debug jumps: hit a whirlpool, a floating log and a crate. Keep Blue 80 to 900 behind Red. | Whirlpool: the raft spins and slows. Log: it bounces. Crate: a BUBBLE, SPEED or LOG label on every device, and the crate is back 8 s later. Blue shows SLIPSTREAM. The debug overlay shows the right odds table for each raft. |
| P2-8 | **Host** sets Spicy, then Chill, racing a little each time. On **Phone A**, toggle Sound, then Silly sounds. | Spicy bots fire and whack visibly more than Chill bots. On the iPhone, sound starts after the first tap, and the music speeds up near the finish. Sound off silences everything; Silly sounds off silences only the animal voices. |

### Phase 3
| ID | On device… do… | Expect on every device |
|---|---|---|
| P3-1 | With devices side by side, steer into a crocodile, then straight into it again. | Each crocodile is at the same spot on every screen. CHOMP!, a 1 s stun and a knockback. No second chomp within 1.6 s. The jaws snap faster up close. |
| P3-2 | Debug: jump to 40%. Hit the ramp fast; whack the airborne raft. Next lap, hit the ramp slowly. | Fast: LAUNCH, a landing shadow, and "BIG AIR x.xs" with the same number on every device; the whack in mid-air does nothing. Slow: TOO SLOW and a speed drop. |
| P3-3 | Debug: jump to 75%. Whack the gate. Next, sit pinned at the closed gate. | The gate opens for 6 s on every device. Pinned: "WHACK THE GATE!" every 1.5 s, and the gate gives way after 4 s. |
| P3-4 | In 2v2, both crew fire from opposite sides together, repeatedly. In 1v1, fire until the meter is full. | A SYNC pop, and the meter goes up 16% per pair. When full: TURBO READY. The next pair within 0.3 s (in 1v1, the next shot) gives 2.5 s of turbo with a pink trail and a banner. |
| P3-5 | Finish a race. | During the race, green "CLOSE CALL!" pops appeared. The results table is identical on every device, the best in each column is marked ★, and the 5 awards are named with their players. |
| P3-6 | On **Laptop L**, join as Big Screen. Let the rafts separate by more than 500. | No pad. Both rafts are visible, and the view switches to a split screen labelled ▲ RED and ● BLUE, with names, progress and timer showing. |
| P3-7 | On a mid-range phone in debug: watch fps, turn Low effects on, then turn on Reduce motion and get whacked. | Outlines, toon shading, faces that change with state, foam and wake. Fps ≥ 30. Low effects removes the outlines, spectators and extra foam, and fps rises. No screen shake with Reduce motion on. |
| P3-8 | In a fresh private window, play a 2v2 race, then a rematch. | First race: all three hints appear and each fades once used. Rematch: no hints. |

---

## 12. Glossary

**Players and roles**

| Term | Meaning |
|---|---|
| Host | The player who created the room. Controls the mode, difficulty, Start and Rematch. |
| Bot | A computer player filling an empty or disconnected seat. |
| Fumble | A bot's deliberate mistake on a decision tick. |
| Big Screen | A laptop joined as a spectator display showing both rafts. |
| Spectator | A device watching without a seat. Late joiners are spectators until the next race. |

**Networking**

| Term | Meaning |
|---|---|
| Authority | The one simulation per room (on a server or the host's device) that decides what happens. |
| Input | A small message from a client: walk, fire held, whack count, seq. |
| seq | A per-seat increasing number on each input, so old or duplicate inputs are ignored. |
| Snapshot | The authority's periodic broadcast of the full race state (20 per second). |
| Event | A one-shot happening (a pop, sound or banner) with a unique id, so no device plays one twice. |
| Interpolation | Drawing positions smoothly between two snapshots, about 100 ms behind the authority. |
| In sync | Every device shows the same race state within about 150 ms. |

**The raft**

| Term | Meaning |
|---|---|
| Bow / stern | The front / back of the raft. |
| φ (phi) | Where an animal stands on the rim, as an angle from the bow, clockwise seen from above. |
| Rim | The raft's outer tube, where animals walk (radius 26). |
| Zone | In 2v2, the arc of the rim each animal may walk (drawn as a stripe). |
| dv | The instant velocity change one shot gives the raft. |
| Recoil | The push a shot gives the raft, away from where the animal stands. |
| Cant | How far a cannon is twisted from pointing straight out; this is what makes a shot spin the raft. |
| Keel | A steady turn of the raft toward the river's direction (off while stunned or airborne). |

**Racing**

| Term | Meaning |
|---|---|
| Current | The river's own flow, 55 u/s along the path. |
| SYNC | Two animals on opposite sides firing within 0.15 s. The second shot gets +35%. |
| Turbo | 2.5 s of extra thrust and current, earned by filling the meter with SYNCs. |
| Slipstream | A bonus for the trailing raft when it is 80 to 900 behind the leader. |
| Catch-up odds | Crate odds that favour the trailing raft. |
| Close call | Passing within 14 of a hazard without touching it. |
| Low effects | A setting that drops outlines, spectators and extra foam to keep the frame rate up. |

---

## 13. Riskiest parts and mitigations

| Risk | Mitigation |
|---|---|
| Realtime sync on mobile networks | Use the authority plus snapshots plus a 100 ms interpolation buffer, repeat held inputs at 10 Hz, test on cellular in Phase 1, and read the debug overlay. |
| The host's phone backgrounds its tab (host-device authority) | Prefer server authority. Otherwise show the "keep this screen open" banner, and recommend a laptop as host. |
| iOS audio stays silent until the first tap | Create or resume audio on the first tap (the Ready tap counts), and show a "Tap anywhere for sound" chip until then. |
| Phone frame rate with outlines and effects | Cap pixel ratio at 2 and particles at 300, provide the Low effects toggle, and switch to low effects automatically below 30 fps for 3 s. |
| Multi-touch on phones (◀ held while firing) | Per-button pointer events, `touch-action: none`, and test P1-5 on a real iPhone. |
| The public link sleeps or expires during judging | Choose hosting that stays live (§4.1). Re-test the link in a private window the next day. |
| The deadline | Deploy Phase 1 first, deploy after every step, and follow the 4-hour cut rule. |
