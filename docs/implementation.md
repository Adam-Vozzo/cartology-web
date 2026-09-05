# Web adaptation notes

The game implements the central loop in the supplied Cartology vault: observe a living world, spend a finite life collecting chemistry, carry knowledge into the hivemind, adapt a new body, and use understanding to choose a future.

## Deliberate scale choices

Each biome is a generated 61 × 35 tile region. Depth and height are linked regions and mutation-gated passages, rather than a continuous three-dimensional simulation. Regional relationships and compass rotation are fixed per save; terrain, source positions, and hazard placements regenerate each life. Guaranteed corridors prevent required sources from becoming unreachable.

Mutations develop in a handful of focused exposures, with faster redevelopment after accumulated priming. This preserves the design’s loop while making traversal available within short web sessions. The design’s suggested 50-plus-life pacing is not enforced.

Observation and reading the almanac are free. Turns advance only on physical actions. Rest slows ambient contamination, and no action reduces accumulated contamination in the current body. The Beach and the Still have zero ambient accumulation. Vitality is separate from contamination.

Ecological relationships use local, deterministic rules. Light attracts moths, disturbed spores dissolve nearby calcification, nutrients draw slugs and circulating fauna, nectar draws builders, and moss deters grazers. Faction identities are represented through organism behaviour, not a political or dialogue system. The simulation does not reproduce every speculative multi-organism cascade in the vault at world scale.

The canopy uses grid movement, climbing, and falls. The draft’s additional aerial-lichen/gliding concept is not a ninth mutation. The eight fully specified mutations are implemented. Firefly taming and pre-mutation shadow puppetry are not separate systems in this edition. The Still, quiet spaces, and the underground pool use stable local features inside otherwise regenerated maps.

The almanac contains the design’s living species plus fossil, material, and signal sources. The extinct Rootsingers and Weft appear in cross-references, chamber evidence, and Choir memories rather than as living entities. Biome descriptions and map relationships are separate from the species index.

The world does not run an extended post-ending simulation. Choosing a future records the ending and presents its epilogue. “Return to the memory” lets the player revisit the pre-choice world with their accumulated knowledge and recorded ending intact.

## Ending evidence

- **Escape:** catalogue at least two sources in each of six surface biomes, then reach the Tideflats’ outward passage.
- **Cure:** complete contamination convergence, Weft reconstruction, clean signal, network topology, neutralisation chemistry, Rootsinger lineage, and Hearthroot anatomy; carry at least two Choir fragments and reach the Hearthroot.
- **Renewal:** satisfy the Cure evidence, complete the lifecycle connection, visit the Bog and Canopy Ruins, carry at least five Choir fragments, and reach the Hearthroot.

Cross-references require two chemical readings from every constituent source. The contamination-gradient and network-topology connections additionally require evidence spanning three biomes. All criteria operate on the same saved game state as normal keyboard and touch play.

## Validation

The automated suite verifies seeded generation, source/exit reachability across several seeds, early adaptation access, free observation, absorption costs, mutation development, knowledge persistence, both deep-ocean routes, knowledge-gated dissolution, moth and slug chains, Still/Moss accumulation, sealed specimens, alternate spawning, all three endings, threat responses, light occlusion, and save validation.

Type checking, authored-source lint, and a static production export passed locally. The example workflow in `docs/ci-workflow.yml` runs those checks on GitHub when installed under `.github/workflows/`. The current GitHub CLI authorization does not include workflow-writing permission, so the workflow is supplied as a template. Lint excludes the generated component catalogue and generated hooks, retaining their upstream implementations. The imperative canvas game is not compiled with React Compiler; its mutable simulation is explicitly shared by the renderer and input handlers.

Browser interaction/visual QA was not performed in this implementation session. The production route is rendered by the static exporter, and local HTTP delivery is checked. Long-session pacing remains a playtesting area.

The optional `read_cartology` and `play_cartology` WebMCP tools use the same engine as visible controls, validate action batches before applying them, and unregister on lifecycle cleanup. No supported WebMCP validation context was available in this session; registration and execution in a supporting browser remain unverified. Unsupported browsers simply play normally.

## Deployment

`npm run build` exports static assets to `dist/client`. Only that public output and the hosting manifest are packaged for Sites. Server intermediates, local saves, source credentials, original vault documents, and source code are excluded from the deployment archive.

Sites source and the GitHub repository should be updated from the same commit. Reuse the project ID in `.openai/hosting.json`. Source credentials are temporary and must never be committed or embedded in remote URLs.

