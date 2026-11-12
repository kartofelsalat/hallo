# Catch My Love
### Game design document — built 2026-11-12

A small arcade game for Flor. iPad, landscape, touch only, offline, installable.

---

## 1. Thesis

> **You don't win by catching things. You win by getting them home to the rose.**

A catching game is four hours of work and a thousand clones. The twist is that
catching is not scoring. Catching fills a watering can; scoring only happens when you
walk to the rose and pour, and pouring roots you in place for just over a second while
the sky keeps falling. Every few seconds the player makes the same small decision:
bank now and stay safe, or hold eleven hearts through a meteor shower for four times
the points.

She is the rose. The one red in the game is hers.

---

## 2. Core loop

Catch → fill the can → stop on the rose → pour → the rose opens a little more.

- **Can** holds 10 drops. Overflow is worth almost nothing, so a full can is pressure.
- **Pour** = water × 12 × multiplier. Multiplier is 1 + 0.5 per 5 consecutive catches,
  capped at ×4. Pouring with 3+ water also weeds the worst baobab.
- **Pouring is automatic**: stand still on the rose for a third of a second. No button.
  You have to stop moving to water her, which is the same verb as taming the fox.

## 3. Failure: baobabs, not hearts

Every missed collectible drops a seed where it landed and a baobab sprouts there.
Saplings slow her down; grown baobabs are solid walls that eat her floor. Three grown
baobabs and the planet is choked — that is the only way to lose. Failure is visible,
spatial, and caused by a mistake she can point at.

Catching a hazard is not death: it spills half the can, breaks the combo, scares off
the fox and sprouts a baobab at her feet.

## 4. The nights

Five nights, ~45 seconds each, continuous — no level menu. Then the finale.
Endless mode reshuffles and escalates them forever.

| Night | The twist |
|---|---|
| The Starfall | Calm opener. Teaches catch → pour. |
| The Lamplighter | The light goes out every few seconds. In the dark only glowing trails remain — gold for safe, red for sharp. |
| The Businessman | Coins that look like stars. They pay, but each one drains the can. At the night's end he audits: more coins than hearts and he takes 12%. |
| Five Thousand Roses | The sky floods with identical pale roses. One per wave is red — hers — and worth a fortune. |
| The Fox | Nothing falls. The only way through is to stand still until he comes. |

## 5. The fox

Appears at intervals. Cannot be caught. Tamed by standing still within range for 1.6
seconds — dangerous in a storm, free on his own night. Once tamed he follows a few
steps behind and catches one thing for you every four seconds. Lost if you take a hit.

## 6. The scarf

Catching with the tip of the trailing scarf — only reachable while moving fast — pays a
grace bonus. It rewards sweeping movement over twitching.

## 7. What persists

- **Trinkets.** Rare parachuting objects, one guaranteed at the end of each night.
  Caught once, they are planted on her planet forever and appear in every future run.
  Twelve of them. This is the long replay hook.
- **Notes.** Stars carrying one line each of the author's writing. Collected in
  *Her Planet*, kept forever.
- **Two letters.** Letter one plays at the finale. Letter two is revealed one line per
  star caught in Endless, with no end.
- **High score** per mode, best night, sound setting.

All in `localStorage`, versioned.

## 8. Controls

Relative drag, anywhere on screen — her finger never has to sit on top of the
character. A tap with no drag walks to that spot. Arrow keys work on a desktop.
Nothing else, no buttons, no pause.

## 9. Art

Ink-and-watercolour storybook, drawn entirely in code. Every outline is redrawn with a
new wobble three times a second — "line boil" — so the world looks like it is being
sketched while she plays. Paper grain over everything.

Palette: teal-navy night, cream, sand, mint, bone, ink-brown line, burnt orange fox,
and one red reserved for the rose and for the finale, where it floods the universe.

Readability rule: collectibles are round with a soft gold glow, hazards are angular with
none. Classification in 100 milliseconds, even inside the dreaminess.

## 10. Audio

WebAudio synthesis only — no files, works offline. A music box motif on a five-note
scale that changes with each night, bells for catches, a sustained note when the fox
comes close. Unlocked by the first touch, as iOS requires. Mute in the corner.

## 11. Technical

Vanilla JS, canvas 2D, no dependencies, no build step. Fixed DPR cap of 2, offscreen
pre-rendering for sky, planet and paper grain, pooled particles. If a device drops
frames for a sustained period the game quietly lowers resolution and drops the grain.
PWA with a service worker: installable to the Home Screen and fully playable offline.

## 12. Still open

- The anniversary date and all personal text (`content.js`, placeholders in place).
- A hand-drawn rose, one colour, to replace the drawn one.
- Trinket names tied to real things.
