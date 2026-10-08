# Input Range · Apex Controller Practice

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

A local React, TypeScript and Vite app for adapting to new Apex controller bindings. Compare old and new layouts, practice frequent actions, and rehearse complete button sequences on one page. Supports Xbox, DualShock 4 and DualSense through the browser Gamepad API. No account or backend required.

## Run

Use the public site at **https://reloadggg.github.io/apex-input-range/** without installing anything. Connect your controller and import your own Apex profile in **Bindings**. The bundled layout is an example. Files are parsed locally; settings and history stay in each browser. Data from localhost does not automatically move to the public site.

Use Node.js 22.6 or later (Node.js 24 recommended).

```powershell
npm install
npm run dev
```

Open **http://127.0.0.1:5173** in Chrome or Edge. On Windows, you can also double-click `启动训练器.cmd`. Connect your controller, keep the page in the foreground, and press any controller button to let the browser detect it.

The menu at the top right switches between **中文 / English / 日本語**. Your choice is saved locally. Switching language preserves bindings, session progress and history.

## Import your Apex configuration

Open **Bindings**. The guide at the top includes selectable paths and copy buttons.

1. Copy the profile path below. Press **Win + R**, paste it and press Enter, or use the File Explorer address bar.
   ```text
   %userprofile%\Saved Games\Respawn\Apex\profile
   ```
2. Drop `profile.cfg` into the **After** panel. If you saved an old `profile_backup.cfg`, drop it into **Before**. If you have no backup, enter the old buttons manually. A backup must have been saved before changing your layout.
3. Review the detected bindings and warnings, then click **Apply to Before/After profile**. Importing affects only this trainer.

For optional `settings.cfg` and `settings_backup.cfg` files, expand the additional-settings guide and open:

```text
%userprofile%\Saved Games\Respawn\Apex\local
```

If the browser blocks clipboard access, the path is selected automatically; press **Ctrl + C**. The web page cannot scan your local directory automatically. Files are parsed in your browser and are not uploaded or executed.

In custom layouts, `settings.cfg` often contains only `+ability` slots. The active permutation comes from `profile.cfg`: `gamepad_custom_pilot`, enabled by `gamepad_button_layout`. Import the matching profile as well. Supported layouts are standard `0`, custom `6`, and recognized direct bindings. Unsupported layouts, southpaw options or incomplete data produce warnings; unresolved actions retain their existing settings. Held bindings are ignored. Ultimate is derived from **Tactical + Ping** and can be edited manually.

The bundled sanitized snapshot seeds the initial Before/After layouts. Use the snapshot restore button to restore it; it does not read your live game files. Import again after changing Apex bindings.

## Controllers

**Controller labels** detects Xbox / DS4 / DualSense automatically and offers a manual choice. If DS4Windows or Steam Input presents a virtual Xbox controller, choose your PS labels manually. This changes labels and the diagram, while keeping the same action bindings. History keeps the controller labels used during each session.

| Xbox | DS4 / DualSense |
| --- | --- |
| A / B / X / Y | × / ○ / □ / △ |
| LB / RB | L1 / R1 |
| LT / RT | L2 / R2 |
| LS / RS | L3 / R3 (stick clicks) |
| View | Share / Create |
| Menu | Options |

USB or Bluetooth requires the browser's `standard` mapping. Manual label selection does not enable unsupported raw input. System buttons, touchpad, microphone, vibration and adaptive trigger effects are outside the drills. Rear buttons are seen as the regular buttons they map to.

## Practice

The home page has **11 combo drills**:

- Basics: slide jump, jump → reload, slide → reload, and the eight-step combat chain.
- Combat chains: weapon swap → fire, crouch → reload → fire, slide jump → fire, and tactical/ultimate transitions.
- Movement rehearsal: simplified wall bounce, bunny hop and zipline jump inputs, with community tutorial dates and chapter links.

Select a drill to see its complete sequence and current buttons, then select **Start practice**. Follow the highlighted step. The eight-step chain is **Tactical → Jump → Slide → Fire → Crouch → Fire → Reload → Swap weapon**, with pauses of 0.2–0.45 seconds. Wait for the next highlight before pressing. Repeated jumps require release and a new press.

These drills rehearse button order. They do not simulate terrain, movement, landing, sustained crouching, weapon animations or ability cooldowns. Practice the full technique in-game. See [research notes](docs/combo-research.md) for community sources and their scope.

- **Button recognition:** find the physical button shown.
- **Action memory:** press your current binding for the named action; hints are optional.
- **Remap practice:** emphasize frequent actions and changed bindings. Frequency weights are 0 / 1 / 3 / 5, with an optional ×3 boost for remapped actions. Old-button conflicts generate return sequences automatically.

Auto-sprint is assumed: **sprint is excluded from action and combo practice**, including old saved sequences. Its real binding remains in the comparison, and the physical button can still appear in button-recognition mode.

Expand the sequence settings to edit actions, weights, enabled status and pauses. The default 80% sequence share is the probability of choosing a sequence, not the fraction of all button presses. Fixed drills ignore the random weighting.

## Input and results

Only new presses count. Holding a button does not repeat it; analog triggers use 0.55 press and 0.35 release thresholds. Two-button chords require overlapping holds. A partial chord waits without scoring; an unrelated new press is a mistake.

Mistakes keep the prompt. Reaction time includes corrections and excludes pauses. Choose 30 / 60 / 120 seconds or unlimited practice. Esc, focus loss or controller disconnection pauses the session. History keeps the latest 50 sessions, including old-binding errors and sequence transitions, and exports JSON.

Keyboard demo is available in the controller monitor. A/B/X/Y use the same letters, LB/RB use Q/E, LT/RT use 1/3, LS/RS use F/J, D-pad uses arrow keys, and View/Menu use V/M. Demo sessions are labeled separately and do not count toward the daily controller target.

Settings and history live in localStorage for the current browser and address. Clearing browser data or changing the address affects persistence. Optional remote fonts fall back to system fonts. The trainer never sends inputs to the game.

## Development and validation

### Publish with GitHub Pages

The workflow in `.github/workflows/pages.yml` builds and deploys `main` automatically. In **Settings → Pages → Build and deployment**, select **GitHub Actions**. Pull requests run unit tests and build checks without publishing. The workflow uses Node.js 24 and passes the Pages base path to Vite, so assets work under the repository subdirectory. Manual redeploys are available under **Actions → Deploy GitHub Pages → Run workflow**.

### Alternative: Cloudflare Pages

In Cloudflare, open **Workers & Pages → Create application → Pages → Import an existing Git repository** and authorize `reloadggg/apex-input-range`. Use production branch `main`, build command `npm run build`, output directory `dist`, and environment variable `NODE_VERSION=24`. Keep the root directory at the repository root and leave `VITE_BASE_PATH` unset. Select **Save and Deploy** to receive an HTTPS `*.pages.dev` address. Future pushes to `main` rebuild the site automatically. This app uses static hosting only; no Functions, database, or custom domain is required.

### Local checks

```powershell
npm run build
npm test
npm run test:e2e
```

Browser tests run headless Edge with simulated standard gamepads. They cover imports, remaps, combo progression, chords, pauses, controller labels, language persistence, clipboard fallback and mobile layouts. They do not replace physical-device testing.

Translations are maintained in `src/locales/messages.tsv` as Chinese source / English / Japanese columns, separated by tabs. Preserve every `{{0}}` placeholder. `npm run i18n:build` extracts required messages, validates translations and generates JSON dictionaries; production builds run it automatically. Rendering translates UI text without rewriting stored IDs or bindings. File names use `translate="no"`.
