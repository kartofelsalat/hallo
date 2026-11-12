# Kiss the Rose
### Game design document — v1, 2026-11-12

**Status: design locked, awaiting approval to build. No code exists yet.**

A small game for Flor.

---

## 1. What it is

She wakes on a planet the size of a room. Something asks her to draw a sheep. Then she
is sent out across a handmade universe to gather water for a rose that is waiting at home.

She walks all the way around little worlds, falls off them on purpose, drifts through the
dark between them, meets five absurd and lonely grown-ups, learns from a fox how to be
still, and finds a garden containing five thousand roses, none of which is hers.

Then she goes home and waters the rose.

About twenty minutes, one sitting, iPad, offline, no way to lose.

---

## 2. Thesis

She does not know the book well. The book is the costume, not the content. The theme
already exists between them: he calls her Flor.

> **There are five thousand flowers in the universe and exactly one of them is mine.**

Every system serves that sentence. No famous line is quoted that the game has not earned
on its own terms.

---

## 3. Design pillars

1. **Nothing can hurt her.** No death, no timer, no failure, no wrong turn.
2. **The hand is visible.** Every line is drawn by a hand that is slightly shaking.
3. **The challenge is noticing**, never dexterity.
4. **She is a guest everywhere and belongs in exactly one place.**
5. **Red is the rose.** The colour appears nowhere else until the last minute of the game.

---

## 4. Core loop

Land on a small round world → walk around it → meet someone → notice something →
gather water → leave by jumping too hard → fly through the dark → land somewhere new.

Five times. Then home.

---

## 5. Controls (iPad, landscape, multitouch)

| Input | Action |
|---|---|
| Hold & drag, left half | Walk. Relative, not a fixed stick — no precision required. |
| Tap, right half | Jump. Hold longer for higher. |
| Heart button, bottom-right | Heart-sight: see what is invisible to the eye. |
| Hold anywhere, in flight | Drift toward the finger. |
| Tap a character | Talk. Tap to advance. |

No pause menu. A small corner button for sound and "start again".

Portrait shows a hand-drawn *turn me sideways* card. Landscape works on a phone too,
because a link gets opened on whatever is in the hand.

---

## 6. Movement model

**Radial gravity.** Gravity points at each planet's centre. The camera rotates so she is
always upright on screen and the planet turns beneath her. Her sprite never rotates, so it
never shimmers.

**Low gravity.** Jump arcs are slow and floaty. Timing is forgiving because the setting
already implies it, not because difficulty was turned down.

**Escape velocity is reachable.** Jump hard off a small planet and she leaves it. This is a
feature and the game teaches it early as a delight, not an accident.

**Space is playable.** Drag to steer, slow drift, dust and seeds to collect, a wandering
flock of birds that gives a boost. The nearest planet's gravity captures her and sets her
down. There is no star map and no level select — the sky is a place, not a menu.

**She can never be stranded.** After a few seconds adrift with no input, a bird arrives and
carries her to the nearest world.

---

## 7. The worlds

Each planet: ~3 minutes, 3 water drops on the path, 1 water drop hidden, 1 memory star hidden.

### 0. Home
Two volcanoes to sweep. A baobab sprout. The rose under its glass dome — vain, demanding,
dramatic, secretly terrified she will not come back. Talkable at any time; it comments on
everything she has done. It blooms as she returns with water.

**Opening, first 30 seconds:** a blank page. *Draw me a sheep.* She draws with her finger.
Whatever it is — a blob, a masterpiece, something rude — it is received as exactly the sheep
that was wanted. It follows her for the rest of the game. The rose has opinions about it.
This is also the tutorial for "this game is played by touching things".

### 1. The Lamplighter
A planet spinning so fast that day and night pass in seconds. Daylight shows one path;
darkness shows another, in things that glow. He has been awake for two hundred years and
would very much like a nap.
*Teaches: walking all the way around a world.*

### 2. The Hat
A planet shaped unmistakably like a hat. Everyone insists it is a hat. Press the heart
button and it is an elephant asleep inside a snake — the hills are its back. Walking along
it wakes it, which lifts her somewhere she could not otherwise reach.
*Teaches: heart-sight.*

### 3. The Businessman
He owns all the stars and is counting them. He asks for help. The number is absurd. He
loses count. She leaves with what she needs and he never notices she was there.
**The only planet rendered in hard pixels** — no line boil, a grid, machine colour. The world
visibly stops being hand-drawn for as long as she stands on it, and is warm again when she
leaves. A joke about grown-ups.

### 4. The Fox
A fox who will not come near her. There is no way to catch him. The only mechanic is
**to be still** — put the controls down and he comes a little closer. Walk away and come back
and he is closer than he was. A game that teaches a non-gamer to stop moving in order to be
loved.

### 5. The Garden
Five thousand roses, identical, perfect. Nothing to collect. Nothing to solve. She can
wander as long as she likes. The way out opens when she understands that none of them is
hers.

This is the most important room in the game.

### Then: home.

---

## 8. What she gathers

- **Water** — the only required collectible. Carried home to the rose, which blooms in
  proportion. Cannot be failed; missing some means a less-open rose, never a loss.
- **Memory stars** — 5 to 7, optional, one hidden per world. Each unlocks a card: a memory,
  a joke, a date. *(Content required from the author.)*
- **Her sheep** — persistent, saved to her device, hers.

---

## 9. The ending

Built in week one, not week two.

She pours what she gathered. The rose opens petal by petal, in real time, slowly. The glass
dome lifts. The rose drops the act entirely and says the true thing — the letter, in its
voice.

Then **the red escapes.** The one colour forbidden all game floods out of the rose and across
the universe: the planets, the sky, every star she flew past. She has been starved of it for
twenty minutes without noticing.

**Coda:** her sheep, her drawings, and the memory cards collected into a sketchbook she keeps.
**Date check:** one scene exists only on the anniversary itself.
**The fox remembers** between visits.

---

## 10. Art direction

**Hand-drawn storybook with the hand left visible.** Thick, wobbly ink outlines. Flat warm
colour that does not quite stay inside them. Paper grain over everything. Proportions
slightly wrong on purpose. The source is Saint-Exupéry's own illustrations, which are a
pilot's sketchbook and are not polished.

**Line boil.** Every outline is redrawn with a different wobble three times a second. The
world looks like it is being drawn while she plays it. This is the single most important
visual decision and it costs almost nothing.

**Palette:** roughly sixteen colours. Deep teal-navy night (deliberately not the lavender of
the previous gift). Warm sand, cream, dusty mint, bone. Ink-brown for all linework. Burnt
orange for the fox. **One red, reserved entirely for the rose.**

**Characters:** two or three head-heights. Dot eyes. One line for a mouth. Expression comes
from posture and bounce, never detail.

**The only art not drawn by code is drawn by a human hand:** her sheep, and — if it arrives —
one rose drawn by the author, traced and cleaned, used as *the* rose.

---

## 11. Audio

WebAudio only. No files, nothing to download, works offline.

A music box / celesta voice. One five-note motif, varied per world. Soft bells for water,
a low drone for space, a single sustained note when the fox finally comes close. Mute
button in the corner.

*Optional and high value: a short recording by the author for the ending.*

---

## 12. Technical architecture

- Vanilla JavaScript, ES modules, **no framework and no build step.**
- Canvas 2D, single full-screen canvas, `devicePixelRatio`-aware.
- Fixed-timestep simulation, interpolated render, 60fps target on iPad Safari.
- No allocation in the main loop. Paper grain and planet textures pre-rendered to offscreen
  canvases once.
- Pointer Events with multitouch; `touch-action: none`; no 300ms delay; safe-area insets.

```
index.html
styles.css
manifest.json
sw.js
src/
  main.js        loop, state machine, scenes
  input.js       multitouch, zones, gestures
  render.js      camera, boil, grain, palette
  physics.js     radial gravity, flight, capture
  planets.js     world data, one entry per planet
  dialogue.js    text, typewriter, portraits
  draw.js        the sheep-drawing page
  save.js        localStorage, versioned
  audio.js       WebAudio synthesis
content/
  memories.js    the author's cards — the only file he edits
```

- **Save:** one versioned JSON blob in `localStorage`, written on every world change.
- **PWA:** manifest plus a service worker precaching everything. Fully playable offline
  after first load; installable to the home screen with a proper icon.
- **Hosting:** static drop to Netlify.

---

## 13. Two-week plan

| Day | Work |
|---|---|
| 1 | Loop, canvas, radial gravity, walking, rotating camera, touch controls |
| 2 | Jumping, escape to space, flight, bird rescue, home planet, the rose |
| 3 | **The ending** — bloom, letter, the red flood. Deliberately early. |
| 4 | Drawing page, sheep companion, save system, PWA shell |
| 5–6 | The Lamplighter, The Hat |
| 7–8 | The Businessman, The Fox |
| 9 | The Garden |
| 10 | Dialogue pass, memory stars, cards |
| 11 | Audio |
| 12 | Real iPad testing, feel, tuning |
| 13 | Polish, performance, bugs |
| 14 | Buffer, deploy, send |

Built in vertical slices: it is a complete, giftable game from the end of day 4 onward.
Everything after that adds worlds to something that already works.

---

## 14. Required from the author

By roughly day four, or the memory stars are cut:

1. The letter the rose reads — or notes, and it will be drafted in the rose's voice to rewrite.
2. Five to seven memories, jokes or references. One line each.
3. The exact anniversary date. *(Wired as a config value — can be filled in at the end.)*
4. Optional, high value: one rose, drawn by hand, photographed.
5. Optional, high value: a short audio recording for the ending.

---

## 15. Explicitly out of scope

Multiple endings. Character customisation. More than five worlds. Achievements. Settings
beyond sound. Any other language. Anything online. Anything that can be lost.

---

## 16. Still open

- The title. *Kiss the Rose* is the working one and it is fine.
- What 19 was, on the previous gift.
- Whether a hand-drawn rose arrives.
