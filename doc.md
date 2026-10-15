### **• re: panel (fork-only):**

This fork adds a small launcher in the bottom-left corner called **re:**. It opens
a panel listing extra features on top of the original homepage. It's the home for
everything this fork adds, so future toggles just appear here without needing
more UI.

Right now it has one entry: **Wallpaper mirror**.

```json
"re": {
  "menu": true,
  "mirror": {
    "enabled": false,
    "blur": 28,
    "dim": 0.55,
    "scale": 1.08
  }
}
```

| Key | What it does | Default |
|---|---|---|
| `menu` | Show the "re:" launcher at all. Set to `false` and the panel disappears completely. | `true` |
| `mirror.enabled` | Start state on first load. Ignored after the user flips the switch once — their choice is remembered locally. | `false` |
| `mirror.blur` | Blur applied to the live desktop capture, in pixels. | `28` |
| `mirror.dim` | Black overlay opacity on top of the mirror, `0` to `1`. | `0.55` |
| `mirror.scale` | Slight overscan to hide blur bleed at the edges. | `1.08` |

**How the mirror works:** it uses `getDisplayMedia()`, the same API as "Share
your screen" in video calls. When you flip the toggle on, your browser will ask
which screen/window to share. You pick one (or the whole screen), and the page
draws it behind everything, blurred and dimmed. Turn the toggle off and the
original wallpaper comes back instantly.

**Permissions reset every session.** Browsers deliberately don't let a page
auto-start a screen capture, so every time you reload `index.html` you'll need
to click the toggle again. The panel remembers that you *wanted* it on and shows
a little hint so you know to re-enable it.

**When it's off, nothing changes.** The regular `background` block still runs
exactly as documented above. The mirror is additive.

### FAQ

- **The mirror asks permission every time I reload.** That's not a bug, browsers
  refuse to auto-start a screen capture without a user click, for obvious reasons.
  The re: panel remembers your preference and shows a hint, but you have to
  re-enable it per session.
- **The mirror shows a "sharing your screen" banner in the browser.** Also not a
  bug. Every browser that supports `getDisplayMedia` shows a persistent indicator
  so you can't secretly capture someone. There's no way around it from a webpage.
- **The mirror doesn't work on `file://`.** Some browsers block `getDisplayMedia`
  on local files. Serve the folder via a tiny local server (`python -m http.server`)
  if you want to use it.
