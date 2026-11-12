# Catch My Love

A little arcade game for Flor. iPad, landscape, offline, installable.

Design: [CATCH-MY-LOVE.md](CATCH-MY-LOVE.md) · A later, separate project: [KISS-THE-ROSE.md](KISS-THE-ROSE.md)

## The only file you edit

**`content.js`** — her name, the anniversary date, the notes hidden in stars, both
letters, the trinket names, the things the rose says. Nothing else needs touching.
Everything in it marked `TODO` is a placeholder.

## Running it

Any static web server:

```sh
python3 -m http.server 8000      # then open http://localhost:8000
```

Add `?debug` to the URL to expose `window.__CML` for poking at the game state.

## On the iPad

Open the link in Safari → Share → **Add to Home Screen**. It then runs fullscreen with
no browser chrome, and works with no connection at all.

## How to play

Drag anywhere to walk. Catch hearts and stars to fill the watering can. **Stand still
on the rose to pour** — that is where the points come from, multiplied by your catch
streak. Anything you miss sprouts a baobab; three grown baobabs end the run. Pouring
weeds one. Stand still near the fox to tame him.
