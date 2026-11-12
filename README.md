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

## Hosting on Netlify

The repo is a static site with no build step, so Netlify needs no configuration
beyond the `netlify.toml` already here (`publish = "."`, no build command).

Two ways:

1. **Link the repo** at app.netlify.com → *Add new site* → *Import an existing project*
   → GitHub → `kartofelsalat/hallo`. **Set *Branch to deploy* to the branch holding the
   game** — the repo's default branch does not have it. Every push then redeploys,
   so editing `content.js` on GitHub updates the live game by itself.
2. **Drag and drop** the project folder onto app.netlify.com/drop. No account needed
   for the first deploy, but future changes mean dropping the folder again.

Then rename the site in *Site configuration* so the link is something like
`catchmylove.netlify.app`, and open that on the iPad.
