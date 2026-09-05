# Cartology

A playable web adaptation of Adam Vozzo’s Cartology design: a small lichen symbiont explores a failing ecosystem, and an almanac carries its discoveries across lives.

**[Play Cartology](https://cartology-game13.silly-newt-5996.chatgpt.site)** — the Sites deployment is initially private to its owner.

## Play

Hatch at the Beach. Explore with **WASD** or **arrow keys**, or use the on-screen direction pad. Tap/click a visible organism to select and observe it. Stand next to it before absorbing or touching it.

| Key            | Action                                                                    |
| -------------- | ------------------------------------------------------------------------- |
| O              | Observe without advancing time or contamination                           |
| E              | Absorb chemistry and energy; contamination rises outside the Beach        |
| F              | Touch, harvest, ride a current, or interact with a known structure        |
| Space / period | Rest, recovering vitality and energy at a slower metabolic cost           |
| I              | Place carried light, moss, nutrients, or nectar                           |
| J / M          | Open the almanac / atlas                                                  |
| 1 / 2 / 3 / 4  | Spore veil / mimicry / echolocation / corrosive secretion, once developed |

Walk into passage arrows to change regions. The almanac’s Adaptations section explains how environmental exposure changes your body. Knowledge, compass discoveries, Choir fragments, and biological priming survive death. Physical adaptations must develop again.

Progress saves automatically in this browser on this device. No account or server is needed by the game itself. Audio is optional, starts only when enabled, and is synthesised locally. The game respects reduced-motion preferences.

## Implemented

- Twelve locations, including all eleven main biomes and the discoverable underground spawning pool.
- Seeded terrain that changes between lives, with stable regional relationships and compass orientation per save.
- Glyph-based exploration, occluded coloured light, biome palettes, spores, fog, sonar, and contamination reflected in the player’s colour.
- Eight exposure-driven mutations with persistent priming and fresh bodies after death.
- Forty-four organism, material, fossil, and signal entries, populated from the design’s prose and revealed in knowledge layers.
- Automatic ecological and chemical cross-references, including the Weft reconstruction, clean signal, network topology, and Hearthroot anatomy.
- Moth-baited barriers, nutrient-following slugs, moss deterrents, architectural feeding, currents, coral dissolution, sealed specimens, and an alternate spawning pool.
- Territorial predators, chemical lures, exposure, sunlight/UV tension, tides, canopy falls, energy, and calcium accumulation.
- Escape, Cure, and Renewal, each requiring the relevant accumulated knowledge and a choice at its world location.

This edition compresses the design’s long campaign into compact regional maps and shorter mutation thresholds. See [adaptation notes](docs/implementation.md) for exact scope and validation limits.

## Develop

Use Node.js **24 or newer** and npm.

```sh
npm ci
npm run dev
```

The local address is printed by the development server. Validation:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The static game is exported to `dist/client`. Host that directory at a domain’s root with any static HTTP host. The game does not require a running Node server. `npm start` can also serve the production build locally.

The build script uses Vinext’s build and prerender APIs directly, avoiding an immediate process exit that triggers a native shutdown assertion on Windows. Errors are propagated; the export is checked for the actual game route.

## Structure

- `src/game/engine.ts`: deterministic world generation, turns, ecology, progression, endings, and validated saves.
- `src/game/content.ts`: species, biomes, mutations, connections, and ending rules.
- `src/game/catalog.json`: field-guide prose adapted from the Cartology vault.
- `src/game/renderer.ts`: canvas lighting, glyphs, particles, and responsive camera.
- `app/game.tsx`: keyboard/touch controls, almanac, audio, persistence, and optional WebMCP registration.
- `tests/engine.test.ts`: game-rule and world-reachability tests.
- `.openai/hosting.json`: the existing Sites project identity; reuse it for subsequent deployments.

The original private vault files and character moodboard are not published in this repository. The game includes the writing needed for its field guide.
