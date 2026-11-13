# Illustrated artwork — drop-in spec

The game draws everything in code today. It can use illustrated PNGs instead, for
some things or all of them. If you generate images anywhere (Midjourney, DALL·E,
Higgsfield, a human illustrator), put them in `art/` with the names below and I
will wire them up — the loader falls back to the drawn version for anything missing,
so this can happen one file at a time.

## Rules for every file

- **PNG with a transparent background.** No drop shadows, no ground, no frame.
- Square-ish, **512×512** is plenty. Trim the empty space so the subject fills the file.
- The subject faces **right** where it has a direction (the fox, the prince).
- No text anywhere in the image.

## The style prompt

Paste this in front of every single prompt, unchanged. Consistency between separate
generations is the whole difficulty — the same opening paragraph every time is what
keeps them in one family. Better still: ask for **several items on one sheet** and cut
them apart, because things generated in one image always match each other.

> In the style of Antoine de Saint-Exupéry's own watercolour illustrations for The
> Little Prince: loose wobbly brown ink outlines, flat watercolour washes that spill
> slightly outside the lines, visible paper grain, slightly wrong proportions, naive
> and hand-painted. Palette: ink brown outlines, cream, warm sand, dusty mint, bone,
> deep teal-navy, one crimson red used sparingly. Plain white background, no shadow,
> no text, no frame.

## Worth illustrating (static — pure gain)

| File | Subject |
|---|---|
| `art/heart.png` | a small plump red heart |
| `art/star.png` | a five-pointed golden star |
| `art/note.png` | a cream paper star with two written lines on it |
| `art/rose-pale.png` | a pale colourless rose, head on |
| `art/rose-red.png` | a crimson rose, head on, the only red thing |
| `art/thorn.png` | a dark angular thorn, sharp and unfriendly |
| `art/rock.png` | a small grey asteroid |
| `art/coin.png` | a gold coin |
| `art/caterpillar.png` | a small green caterpillar |
| `art/butterfly.png` | a pale violet butterfly, wings open |
| `art/seed.png` | a dark spiky baobab seed with a green sprout already coming out |
| `art/dome.png` | a glass cloche dome |
| `art/watch.png` | a brass pocket watch |
| `art/sun.png` | a small warm sun with rays |
| `art/sheep.png` | a little cream sheep, side on |
| `art/baobab.png` | a fat baobab tree with a wide crown |
| `art/fox.png` | a small orange desert fox sitting, side on, facing right |

## Think twice (animated — you lose something)

`art/prince.png` and `art/rose.png`. He has a walk cycle, a scarf with physics, a
squash when he catches, a blink, and a watering can that visibly fills. She leans
toward him and bounces when watered. A still image throws all of that away: better in
a screenshot, worse in motion. My recommendation is to illustrate the props and the
world and leave the two characters drawn in code — and to keep the rose for your own
hand-drawn one, which should be the one thing in the game no machine touched.

## Background

`art/sky.png` (1600×1000, no transparency needed) — a night sky with a band of stars,
deep teal-navy, nothing in the lower third. The planet surface and everything on it
stays procedural, because the horizon has to line up with where she walks.
