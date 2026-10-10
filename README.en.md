# Input Range

**Apex controller remap and combo trainer**

[Try it online](https://apex.efastt.store/) · [GitHub](https://github.com/reloadggg/apex-input-range) · [MIT License](LICENSE)

[中文](README.md) · **English** · [日本語](README.ja.md)

New bindings take time to become familiar. Input Range turns actions such as jumping, sliding, reloading and using abilities into browser-based button drills, helping you learn a new layout and connect those actions into sequences.

Supports **Xbox, DualShock 4 (PS4) and DualSense (PS5)**, with Chinese, English and Japanese interfaces. No installation or account required.

## Features

- **Import and compare bindings:** read Apex configuration files, compare old and new layouts, or enter bindings manually.
- **Remap practice:** emphasize frequent actions, changed bindings and old-button conflicts.
- **11 built-in combos:** basics, combat chains and simplified movement inputs, with complete steps on one page.
- **Mixed practice:** select combos across categories and switch randomly after each complete group.
- **My weak spots / Custom:** arrange your own steps and pauses, then practice them alone or in a mix.
- **Practice history:** review accuracy, reaction time, old-binding mistakes and action transitions; export JSON.

## Get started

1. Open **[apex.efastt.store](https://apex.efastt.store/)** in Chrome or Edge.
2. Connect your controller over USB or Bluetooth. Keep the page in the foreground and press a controller button to activate detection.
3. Open **Bindings** and import your configuration or enter your current bindings manually. **The bundled layout is an example; replace it with your own.**
4. Return to Practice, choose a combo or mode, and select **Start practice**.

Without a controller, try the keyboard demo in the controller monitor. Demo results are labeled separately and do not count toward the daily controller goal.

## Import Apex bindings

On Windows, press **Win + R**, paste this path and press Enter:

```text
%userprofile%\Saved Games\Respawn\Apex\profile
```

Drop `profile.cfg` into **After**. If you saved a configuration before remapping, such as `profile_backup.cfg`, import it into **Before**. Without a backup, enter your old bindings manually. Review the preview and warnings before applying.

Optional `settings.cfg` and `settings_backup.cfg` files are in:

```text
%userprofile%\Saved Games\Respawn\Apex\local
```

Custom layouts usually require `profile.cfg`; `settings.cfg` alone may contain only button slots. Standard layouts, custom layouts and recognized direct bindings are supported. Unsupported or incomplete configurations show warnings, and unresolved actions keep their existing settings. Import again after changing bindings in Apex.

Both layouts support manual editing and single-button capture from the controller. Ultimate defaults to **Tactical + Ping** and can be edited as a single button or two-button chord.

## Practice options

### Combos and mixed practice

| Category | Built-in drills |
| --- | --- |
| Basics | Slide jump, jump → reload, slide → reload, combat chain |
| Combat chains | Weapon swap → fire, crouch → reload → fire, slide jump → fire, tactical/ultimate transitions |
| Movement rehearsal | Simplified wall bounce, bunny hop and zipline jump inputs |

Select a group to preview every action and its current binding. Follow the highlighted step and wait for the next highlight before pressing. Repeated buttons require release and a new press.

The combat chain, for example, is:

**Tactical → Jump → Slide → Fire → Crouch → Fire → Reload → Swap weapon**

In **Mixed practice**, select built-in combos and saved custom groups. Each group is equally likely, and a group finishes before the next starts. With multiple available groups, the same group never repeats immediately. Disabled groups and groups containing disabled actions are excluded.

### My weak spots / Custom

Open **My weak spots / Custom → New sequence**, enter a name and choose each action. Add, remove or reorder steps and set pauses of **0–1.5 seconds**. Save up to **15 groups**, with **2–12 steps** each.

Select **Save and preview**, then start repeated practice, or include the group in Mixed practice. Every step uses your current action bindings.

The initial five groups are editable examples. You define your own weak spots; automatically generated drills use **conflicts between old and new bindings**. If the old jump button now triggers Tactical, the trainer creates Jump → Tactical → Jump. Results do not automatically change bindings or generate personal weak-spot groups.

### Individual actions and remap practice

| Mode | What you practice |
| --- | --- |
| Button recognition | Find the physical button shown |
| Action memory | Press your current binding for a named action, with optional hints |
| Remap practice | Mix individual actions, sequences and old-binding conflicts at your chosen frequencies |

Remap practice lets you adjust action frequencies and give changed bindings extra practice. Custom-group frequency affects random remap practice only; mixed combos remain equally likely.

Auto-sprint is assumed: **sprint is excluded from action and combo practice**, while its binding remains in the comparison.

## Controllers and practice behavior

- Xbox, DS4 and DualSense require the browser's `standard` mapping. If DS4Windows or Steam Input outputs a virtual Xbox controller, choose PS labels manually.
- Only new presses count; holding a button does not repeat it. Two-button chords require overlapping holds.
- Mistakes keep the prompt; correct inputs advance. Choose 30 / 60 / 120 seconds or unlimited practice. Esc, focus loss or controller disconnection pauses the session.
- Rear buttons are detected as the regular buttons they map to. Stick directions, system buttons, touchpad, vibration and adaptive trigger effects are outside the drills.
- Combos rehearse button order and rhythm, without simulating terrain, movement, weapon animations or ability cooldowns. Practice full movement techniques in-game; see the [combo research notes](docs/combo-research.md).

## Data and privacy

Configuration files are parsed in your browser. They are not uploaded, executed or modified. You choose files explicitly; the page cannot scan your game directory and never sends inputs to the game.

Settings, custom groups and the latest 50 sessions stay in the current browser. Clearing browser data or changing browsers or site addresses does not transfer that data automatically. Export JSON from History to keep a copy of your results.

## Local development

Built with React, TypeScript, Vite and the browser Gamepad API, without a backend. Requires **Node.js 22.6+**; **Node.js 24** is recommended.

```bash
git clone https://github.com/reloadggg/apex-input-range.git
cd apex-input-range
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**.

```bash
npm test           # Unit tests
npm run test:e2e   # Browser tests (currently configured for Microsoft Edge)
npm run build     # Type checks, translation checks and production build
```

Maintain translations in `src/locales/messages.tsv` using Chinese source, English and Japanese columns. Preserve placeholders and run `npm run i18n:build` to generate language files.

Report problems through [Issues](https://github.com/reloadggg/apex-input-range/issues) or submit a pull request. For controller compatibility reports, include the model, connection method and browser version.

## License

[MIT License](LICENSE) · Copyright (c) 2026 reloadggg.
