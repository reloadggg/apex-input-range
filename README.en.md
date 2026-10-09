# Input Range · Apex Controller Practice

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

[Source on GitHub](https://github.com/reloadggg/apex-input-range) · [MIT License](LICENSE)

A React, TypeScript and Vite app for adapting to new Apex controller bindings, available online or locally. Compare old and new layouts, practice frequent actions, and rehearse complete button sequences on one page. Supports Xbox, DualShock 4 and DualSense through the browser Gamepad API. No account or backend required.

## License

Released under the [MIT License](LICENSE). Copyright (c) 2026 reloadggg. Use, modification, redistribution and commercial use are permitted with the copyright and permission notices retained. The software is provided as is, without warranty.

## Run

Use the public site at **https://apex.efastt.store/** without installing anything ([alternative address](https://apex-input-range.pages.dev/)). Connect your controller and import your own Apex profile in **Bindings**. The bundled layout is an example. Files are parsed locally; settings and history stay in each browser. Data from localhost does not automatically move to the public site.

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

The home page offers **Mixed practice**, **My weak spots / Custom**, and **11 built-in combo drills** in three categories:

- Basics: slide jump, jump → reload, slide → reload, and the eight-step combat chain.
- Combat chains: weapon swap → fire, crouch → reload → fire, slide jump → fire, and tactical/ultimate transitions.
- Movement rehearsal: simplified wall bounce, bunny hop and zipline jump inputs, with community tutorial dates and chapter links.

Select a drill to see its complete sequence and current buttons, then select **Start practice**. Follow the highlighted step. The eight-step chain is **Tactical → Jump → Slide → Fire → Crouch → Fire → Reload → Swap weapon**, with pauses of 0.2–0.45 seconds. Wait for the next highlight before pressing. Repeated jumps require release and a new press.

**Mixed practice:** select groups from any category, including your saved custom sequences. All 11 built-in groups are selected initially. Each group has the same chance of being drawn; a group finishes before the next starts, and multiple available groups never repeat immediately. The selection persists. An empty selection cannot start; disabled groups, disabled actions and sprint sequences are excluded. Remap weights and sequence share do not affect this mode.

**My weak spots / Custom:** choose **New sequence**, enter a name, add or remove steps, move them up or down, and set pauses between steps (0–1.5 seconds). Save up to 15 groups of 2–12 steps. **Save and preview** selects the group for repeated practice; select **Start practice** below. Saved groups can also be checked in Mixed practice. Changes stay in your browser.

The initial five editable groups are examples, **not weaknesses inferred from your results**. Automatic conflict groups compare old and new bindings: if the old jump button now triggers Tactical, the trainer creates Jump → Tactical → Jump. History records performance without changing bindings or generating personal weak spots. Custom steps use your current action bindings; enter them manually in **Bindings** if you have no configuration file. A custom group's remap-practice frequency affects only random remap practice; mixed groups remain equally likely.

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

### Cloudflare Pages (current deployment)

The `apex-input-range` project uses Cloudflare Pages **Direct Upload** at **https://apex-input-range.pages.dev/**. Free static hosting is sufficient; the app needs no Functions, database or server.

The custom domain **https://apex.efastt.store/** is active. Its configuration under `efastt.store` → **DNS → Records** is shown below. Cloudflare issues and renews its HTTPS certificate automatically.

| Type | Name | Target | Proxy status | TTL |
| --- | --- | --- | --- | --- |
| CNAME | `apex` | `apex-input-range.pages.dev` | Proxied (orange cloud) | Auto |

Maintainers should sign in to the Cloudflare account that owns the project before their first deployment:

```powershell
npx wrangler@4.149.0 login --scopes account:read user:read pages:write
```

For each update, run these commands from the repository root, continuing only after each command succeeds:

```powershell
npm ci
npm test
$env:VITE_BASE_PATH = '/'
npm run build
npx wrangler@4.149.0 pages deploy dist --project-name apex-input-range --branch main
```

Pushing to GitHub **does not update this Direct Upload site automatically**; build and upload with the commands above. For automatic builds, create a separate Pages project with Git integration: production branch `main`, build command `npm run build`, output directory `dist`, and `NODE_VERSION=24`. Leave `VITE_BASE_PATH` unset. An existing Direct Upload project cannot be switched to Git integration.

### GitHub Pages (optional manual deployment)

`.github/workflows/pages.yml` is retained as an alternative and runs only when triggered manually. With GitHub Actions available, select **Settings → Pages → Build and deployment → Source → GitHub Actions**, then **Actions → Deploy GitHub Pages (optional) → Run workflow**, choosing `main`. It runs unit tests, builds and deploys, and passes the repository base path to Vite. The current Cloudflare site does not depend on this workflow.

Browser settings and history are separate for each domain and do not sync automatically.

### Local checks

```powershell
npm run build
npm test
npm run test:e2e
node scripts/smoke-site.mjs https://apex.efastt.store/
```

The public-site smoke check uses an isolated browser and simulated gamepad to verify assets, combos, bindings and languages. Set `SMOKE_PROXY` to a proxy address if your network requires one.

Browser tests run headless Edge with simulated standard gamepads. They cover imports, remaps, combo progression, chords, pauses, controller labels, language persistence, clipboard fallback and mobile layouts. They do not replace physical-device testing.

Translations are maintained in `src/locales/messages.tsv` as Chinese source / English / Japanese columns, separated by tabs. Preserve every `{{0}}` placeholder. `npm run i18n:build` extracts required messages, validates translations and generates JSON dictionaries; production builds run it automatically. Rendering translates UI text without rewriting stored IDs or bindings. File names use `translate="no"`.
