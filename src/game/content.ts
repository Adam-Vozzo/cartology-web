import catalog from './catalog.json' with { type: 'json' };

export const WIDTH = 61,
  HEIGHT = 35;
export type Mutation =
  | 'gills'
  | 'claws'
  | 'mimicry'
  | 'veil'
  | 'thermal'
  | 'echo'
  | 'pads'
  | 'acid';
export type BiomeId =
  | 'beach'
  | 'coral'
  | 'mycelium'
  | 'bog'
  | 'deep'
  | 'kelp'
  | 'thermal'
  | 'tideflats'
  | 'canopy'
  | 'bloom'
  | 'shelf'
  | 'underground';
export type Item = 'glowcap' | 'veilmoss' | 'nutrient' | 'nectar';
export interface Species {
  id: string;
  name: string;
  glyph: string;
  color: string;
  kind:
    | 'flora'
    | 'fauna'
    | 'gardener'
    | 'drifter'
    | 'calcified'
    | 'material'
    | 'signal'
    | 'fossil';
  biomes: BiomeId[];
  light?: number;
  mobile?: boolean;
  threat?: number;
  mutation?: Mutation;
  item?: Item;
  hint: string;
  text: string[];
}
const organism = (
  id: string,
  name: string,
  glyph: string,
  color: string,
  kind: Species['kind'],
  biomes: BiomeId[],
  hint: string,
  extra: Partial<Species> = {},
): Species => ({
  id,
  name,
  glyph,
  color,
  kind,
  biomes,
  hint,
  text: (catalog as Record<string, string[]>)[name] || [],
  ...extra,
});
export const SPECIES: Species[] = [
  organism(
    'glowcap',
    'Glowcaps',
    '*',
    '#efc974',
    'flora',
    ['beach', 'coral', 'mycelium', 'underground'],
    'Vibrations make the cap flare. A fragment might carry its light elsewhere.',
    { light: 7, item: 'glowcap' },
  ),
  organism(
    'pixie',
    'Pixie Cup Lichen',
    'u',
    '#9ed2b5',
    'flora',
    ['beach', 'mycelium', 'thermal', 'tideflats'],
    'Moisture pools in tiny cups. Its colour changes from place to place.',
  ),
  organism(
    'veilmoss',
    'Veilmoss',
    '"',
    '#a6cdb0',
    'flora',
    ['beach', 'bog', 'mycelium'],
    'Grazers turn away from the hanging moss.',
    { item: 'veilmoss' },
  ),
  organism(
    'fern',
    'Thermal Ferns',
    '♧',
    '#e79562',
    'flora',
    ['thermal', 'deep'],
    'The fronds grow toward heat, drawing chemistry from deep roots.',
    { light: 4 },
  ),
  organism(
    'duskweed',
    'Duskweed',
    ':',
    '#658888',
    'flora',
    ['coral', 'kelp'],
    'Dense leaves mark the edge of darkness.',
  ),
  organism(
    'chalk',
    'Chalkblooms',
    '✳',
    '#ece8dc',
    'flora',
    ['coral', 'thermal'],
    'A powdery bloom follows the flow of excess calcium.',
    { mutation: 'acid' },
  ),
  organism(
    'kelp',
    'Siphon Kelp',
    'ψ',
    '#7fc789',
    'flora',
    ['kelp'],
    'Hollow fronds carry a current upward. The roots repeat an old signal.',
  ),
  organism(
    'moss',
    'Sulphur Moss',
    '♣',
    '#d8d66d',
    'flora',
    ['thermal'],
    'The air is gentler here. Resting beside the moss slows accumulation.',
    { mutation: 'thermal', light: 4 },
  ),
  organism(
    'root',
    'Marrow Root',
    '√',
    '#dca1bc',
    'flora',
    ['underground', 'deep'],
    'A pink thread drinks directly from the Hearthroot. Rich data, a heavy cost.',
    { light: 5 },
  ),
  organism(
    'vine',
    'Signal Vine',
    '&',
    '#c4a9eb',
    'flora',
    ['mycelium', 'underground'],
    'A strand amplifies the signal beside it. Touch it near a Sporecaster.',
  ),
  organism(
    'tidebloom',
    'Tideblooms',
    '°',
    '#efd694',
    'flora',
    ['tideflats'],
    'Flowers open after flooding. Their nectar attracts small builders.',
    { item: 'nectar' },
  ),
  organism(
    'ember',
    'Ember Lichen',
    '❋',
    '#ef8f73',
    'flora',
    ['thermal', 'deep'],
    'A tiny red lichen on the root. Around it, the stuttering signal clears.',
    { light: 6 },
  ),
  organism(
    'moth',
    'Reef Moths',
    'm',
    '#cfb9e6',
    'fauna',
    ['beach', 'coral', 'kelp'],
    'It follows light, lands, and shakes spores loose.',
    { mobile: true },
  ),
  organism(
    'grazer',
    'Thalline Grazers',
    'g',
    '#a4ba85',
    'fauna',
    ['beach', 'coral', 'tideflats'],
    'A slow grazer follows algal patches. Hungry ones defend their feeding grounds.',
    { mobile: true, threat: 8 },
  ),
  organism(
    'slug',
    'Vessel Slugs',
    's',
    '#bbafd9',
    'fauna',
    ['tideflats', 'kelp', 'bog'],
    'It follows decaying nutrients. The water clears behind it.',
    { mobile: true },
  ),
  organism(
    'jelly',
    'Sporeveil Jellies',
    'j',
    '#a7d9ed',
    'fauna',
    ['beach', 'coral', 'kelp', 'shelf', 'deep'],
    'Its delayed light traces the direction of the current.',
    { mobile: true, light: 6 },
  ),
  organism(
    'brack',
    'Brackweavers',
    'w',
    '#af9ec5',
    'fauna',
    ['beach', 'tideflats', 'coral'],
    'The web filters water. Dark threads have captured more than minerals.',
  ),
  organism(
    'crab',
    'Echocrabs',
    'c',
    '#94cfca',
    'fauna',
    ['beach', 'coral', 'underground', 'shelf'],
    'Rhythmic clicks carry through the wall. Pause and listen.',
    { mutation: 'echo' },
  ),
  organism(
    'beetle',
    'Cling Beetles',
    'b',
    '#c0af8d',
    'fauna',
    ['mycelium', 'coral', 'kelp', 'underground'],
    'A living mat grips the wall. Touch it to learn its adhesive chemistry.',
    { mutation: 'pads' },
  ),
  organism(
    'toad',
    'Gulper Toads',
    'G',
    '#ef927f',
    'fauna',
    ['coral', 'mycelium', 'bog', 'thermal', 'tideflats'],
    'Breathing disturbs the ground. A motionless hunter; give it two tiles of space.',
    { threat: 100 },
  ),
  organism(
    'eel',
    'Lantern Eels',
    'L',
    '#93dbf1',
    'fauna',
    ['coral', 'kelp', 'shelf', 'deep'],
    'A beam sweeps the shallows. Its chemistry stimulates aquatic respiration.',
    { mobile: true, light: 9, threat: 24, mutation: 'gills' },
  ),
  organism(
    'weaver',
    'Vault Weavers',
    'v',
    '#90cb99',
    'fauna',
    ['kelp'],
    'Fibres hold back the overgrowth. Clearing nearby fronds lets the colony reinforce.',
  ),
  organism(
    'architect',
    'Tidepool Architects',
    'a',
    '#d8be89',
    'fauna',
    ['tideflats'],
    'Small builders follow nectar to the gaps between pools.',
    { mobile: true },
  ),
  organism(
    'worm',
    'Bone Worms',
    'o',
    '#c5c8b6',
    'fauna',
    ['shelf'],
    'A patient bore opens passages through the layered dead.',
    { mobile: true },
  ),
  organism(
    'wraith',
    'Spore Wraiths',
    'W',
    '#d5a3e6',
    'fauna',
    ['mycelium'],
    'A dense cloud drifts with apparent purpose. Its spores overwhelm your senses.',
    { mobile: true, threat: 12, mutation: 'veil' },
  ),
  organism(
    'runner',
    'Current Runners',
    'r',
    '#8ec5da',
    'fauna',
    ['coral', 'kelp'],
    'A sleek fish rides the current. Gills would let you follow.',
    { mobile: true },
  ),
  organism(
    'mire',
    'Mire Crabs',
    'q',
    '#b5ab87',
    'fauna',
    ['bog'],
    'Its broad feet find solid mud. Waste draws Rot Eels to the surface.',
    { mobile: true, item: 'nutrient' },
  ),
  organism(
    'fly',
    'Bloom Flies',
    'f',
    '#edb0b2',
    'fauna',
    ['bloom'],
    'Short lives trace the bloom. The oldest cells lie deeper.',
    { mobile: true },
  ),
  organism(
    'sweeper',
    'Tidesweepers',
    't',
    '#91c5bd',
    'gardener',
    ['beach', 'tideflats', 'bog'],
    'A broad body keeps the water circulating. Nutrients can redirect its circuit.',
    { mobile: true },
  ),
  organism(
    'caster',
    'Sporecasters',
    '♧',
    '#89c6c0',
    'gardener',
    ['beach', 'coral', 'mycelium', 'deep'],
    'The rhythm differs between biomes. It is trying to correct an imbalance.',
    { light: 4 },
  ),
  organism(
    'lattice',
    'Lattice Weavers',
    'H',
    '#a0c5c2',
    'gardener',
    ['coral', 'kelp'],
    'Living builders follow a signal that no longer makes sense.',
  ),
  organism(
    'chimerum',
    'Chimerum Moths',
    'n',
    '#c7a3cf',
    'drifter',
    ['mycelium'],
    'It eats a trail through the fog. Follow the clearing.',
    { mobile: true, light: 3 },
  ),
  organism(
    'hermit',
    'Calcite Hermits',
    'C',
    '#c8c5bf',
    'drifter',
    ['coral', 'shelf'],
    'Rings in the shell record calcium accumulation through time.',
  ),
  organism(
    'rot',
    'Rot Eels',
    'R',
    '#bb92b9',
    'drifter',
    ['bog', 'kelp'],
    'It feeds on decay. Its bacteria retain one fragment of an older partnership.',
    { mobile: true, threat: 15 },
  ),
  organism(
    'anemone',
    'Lure Anemones',
    'A',
    '#de92c1',
    'drifter',
    ['coral', 'bloom', 'kelp'],
    'A chemical imitation of clean water. Knowledge or a spore veil resists the pull.',
    { threat: 22 },
  ),
  organism(
    'thicket',
    'Shell Thickets',
    '▥',
    '#b5bcb9',
    'calcified',
    ['bog', 'coral'],
    'Life is sealed inside a mineral shell. Dissolving it exposes tissue that cannot survive outside.',
  ),
  organism(
    'chamber',
    'Sealed Chambers',
    '▣',
    '#dccfad',
    'calcified',
    ['coral'],
    'A pressurised world inside a wall. Study the seal, heat, and surviving symbionts before opening.',
  ),
  organism(
    'calcite',
    'Calcium carbonate',
    '≡',
    '#d4d1bd',
    'material',
    ['coral', 'shelf', 'thermal'],
    'A calcified barrier. Identify its chemistry before using corrosive secretion.',
    {
      text: [
        'Pale calcium carbonate seals the passage.',
        'Its mineral chemistry responds to targeted acid and to disturbed Glowcap spores.',
        'A light fragment draws a Reef Moth. The landing releases spores that soften the wall.',
      ],
    },
  ),
  organism(
    'substrate',
    'Compacted substrate',
    '▒',
    '#95a391',
    'material',
    ['beach', 'mycelium', 'underground'],
    'Soft mineral soil. Repeated digging stress hardens your forelimbs.',
    {
      mutation: 'claws',
      text: [
        'Dense but yielding substrate.',
        'A softer layer runs beneath the stone. Repeated digging primes burrowing claws.',
        'Burrowing connects isolated pockets of the world.',
      ],
    },
  ),
  organism(
    'core',
    'Bloom core',
    '◎',
    '#f4b078',
    'signal',
    ['bloom'],
    'Old algal cells continue to copy the first growth message.',
    {
      light: 7,
      text: [
        'An old core glows beneath the newest cells.',
        'The oldest cells preserve a growth signal from before the Fraying.',
        'This signal is a clean reference for the network’s language.',
      ],
    },
  ),
  organism(
    'frozen',
    'Frozen signals',
    '⌁',
    '#d1cc9f',
    'signal',
    ['canopy'],
    'Dried mycelium holds a message interrupted long ago.',
    {
      text: [
        'A dry strand stretches across empty air.',
        'Chemical messages stopped here when the upper tissue died.',
        'The preserved signal shows the Hearthroot’s last healthy state.',
      ],
    },
  ),
  organism(
    'hearth',
    'The Hearthroot',
    'Ω',
    '#e4abce',
    'signal',
    ['deep'],
    'An enormous root stutters with light. A gap in the pattern refuses to answer.',
    {
      light: 12,
      text: [
        'A single living body, vast enough to have reached the sky.',
        'The roots send contradictory signals. A foreign chemistry is concentrated in the central mass.',
        'The foreign element cannot speak the three kingdoms’ language. The almanac must reconstruct what can.',
      ],
    },
  ),
  organism(
    'thread',
    'Thread Corals',
    '∴',
    '#c9cbb1',
    'fossil',
    ['coral', 'shelf'],
    'Fossil structures point toward the network’s former source.',
  ),
  organism(
    'drifter',
    'Canopy Drifters',
    '§',
    '#d5c795',
    'fossil',
    ['canopy', 'tideflats'],
    'A whole vanished organism, preserved in resin.',
  ),
];
export const BY_ID = Object.fromEntries(
  SPECIES.map((s) => [s.id, s]),
) as Record<string, Species>;
export interface Biome {
  id: BiomeId;
  name: string;
  subtitle: string;
  description: string;
  color: string;
  water: string;
  floor: string;
  wall: string;
  ambient: number;
  toxicity: number;
  coord: [number, number];
  depth: number;
  fog?: boolean;
}
const b = (
  id: BiomeId,
  name: string,
  subtitle: string,
  description: string,
  color: string,
  water: string,
  floor: string,
  wall: string,
  ambient: number,
  toxicity: number,
  coord: [number, number],
  depth = 0,
  fog = false,
): Biome => ({
  id,
  name,
  subtitle,
  description,
  color,
  water,
  floor,
  wall,
  ambient,
  toxicity,
  coord,
  depth,
  fog,
});
export const BIOMES: Biome[] = [
  b(
    'beach',
    'The Bioluminescent Beach',
    'THE FIRST SHORE',
    'Warm water holds a small, working world. Here, the three kingdoms still share.',
    '#e2c285',
    '#407d82',
    '#718b65',
    '#849b87',
    0.35,
    0,
    [0, 0],
  ),
  b(
    'coral',
    'The Coral Shallows',
    'A CATHEDRAL, BLEACHED',
    'Immense coral structures keep building. The passages no longer agree with the water.',
    '#afceda',
    '#3d697e',
    '#648a92',
    '#b3bbaf',
    0.15,
    0.16,
    [1, 0],
  ),
  b(
    'mycelium',
    'The Enshrouded Mycelium',
    'THE NETWORK, SPEAKING OVER ITSELF',
    'Every spore is a message. None can be heard clearly. Moths cut brief trails through the fog.',
    '#cbb0d9',
    '#565274',
    '#77718c',
    '#9a859e',
    0.1,
    0.24,
    [0, -1],
    0,
    true,
  ),
  b(
    'bog',
    'The Bog',
    'AN ABSENCE OF ANSWERS',
    'Nothing returns to the cycle. Even the compass has lost the signal.',
    '#a6aa88',
    '#454f40',
    '#68654d',
    '#777761',
    0.07,
    0.22,
    [-1, -1],
  ),
  b(
    'deep',
    'The Deep Ocean',
    'WHERE THE LANGUAGE STOPS',
    'A root larger than a world. Something within it takes, and never gives.',
    '#bdaccb',
    '#273d54',
    '#485366',
    '#816a82',
    0.045,
    0.48,
    [2, -1],
    -2,
  ),
  b(
    'kelp',
    'The Kelp Vaults',
    'A SIGNAL THAT NEVER ENDS',
    'The forest was told to grow. It has never received another instruction.',
    '#a9cea0',
    '#32674f',
    '#57865b',
    '#8baf76',
    0.17,
    0.2,
    [-1, 0],
    -1,
  ),
  b(
    'thermal',
    'The Thermal Veins',
    'THE WORLD’S ENGINE ROOM',
    'Heat rises through mineral fractures. Islands of Sulphur Moss soften the air.',
    '#e6aa7c',
    '#925343',
    '#b77c58',
    '#a89670',
    0.24,
    0.28,
    [0, -2],
  ),
  b(
    'tideflats',
    'The Tideflats',
    'BETWEEN TWO TIDES',
    'Sunlight feeds the algae and strains the fungus. Shallow pools offer shelter from the bird.',
    '#e1d2a0',
    '#648f8b',
    '#c2b887',
    '#c8c5a2',
    0.5,
    0.12,
    [0, 1],
  ),
  b(
    'canopy',
    'The Canopy Ruins',
    'THE CROWN OF SOMETHING LOST',
    'Bone-white platforms and letters trapped in dried mycelium. Wind crosses the empty spaces.',
    '#dfd6b7',
    '#586473',
    '#969983',
    '#d4cbb4',
    0.4,
    0.14,
    [1, -1],
    1,
  ),
  b(
    'bloom',
    'The Bloom Scar',
    'TOO MUCH LIFE',
    'Colour overwhelms the air. The oldest cells lie at the centre of the excess.',
    '#eeafcb',
    '#924672',
    '#9fb26a',
    '#d28185',
    0.22,
    0.65,
    [-1, -2],
    0,
    true,
  ),
  b(
    'shelf',
    'The Graveyard Shelf',
    'THE SHAPE OF LOST TIME',
    'Layer upon layer of organisms that failed quietly. Bone Worms keep a little chemistry moving.',
    '#c5cbc2',
    '#3e5366',
    '#808e95',
    '#a9afa7',
    0.08,
    0.28,
    [2, 0],
    -1,
  ),
  b(
    'underground',
    'The Underground Pool',
    'A MEMORY TAKES ROOT',
    'Marrow Root threads through a warm chamber. Light, nutrients, and heat converge.',
    '#d7adc7',
    '#4e7b76',
    '#788d80',
    '#a78e9e',
    0.12,
    0.17,
    [0, 0],
    -1,
  ),
];
export const BIOME = Object.fromEntries(BIOMES.map((b) => [b.id, b])) as Record<
  BiomeId,
  Biome
>;
export const ADAPTATIONS: {
  id: Mutation;
  name: string;
  glyph: string;
  threshold: number;
  source: string;
  effect: string;
}[] = [
  {
    id: 'gills',
    name: 'Gills',
    glyph: '≈',
    threshold: 16,
    source:
      'Wade in water within three tiles of a Lantern Eel. Its light stimulates your algae.',
    effect: 'Enter deep water and descend to the Graveyard Shelf.',
  },
  {
    id: 'claws',
    name: 'Burrowing claws',
    glyph: '⋔',
    threshold: 12,
    source: 'Press against soft substrate (▒), or absorb from it.',
    effect: 'Dig through soft walls and reach underground passages.',
  },
  {
    id: 'mimicry',
    name: 'Bioluminescent mimicry',
    glyph: '✧',
    threshold: 16,
    source:
      'Study Lantern Eel chemistry, carry two Choir fragments, and return to the Mycelium.',
    effect: 'Flash a predator pattern to hold nearby fauna still.',
  },
  {
    id: 'veil',
    name: 'Spore veil',
    glyph: '░',
    threshold: 12,
    source: 'Survive within three tiles of a Spore Wraith in the Mycelium.',
    effect: 'Hide your chemical signature for twelve turns.',
  },
  {
    id: 'thermal',
    name: 'Thermal regulation',
    glyph: '♨',
    threshold: 14,
    source: 'Rest near, touch, or absorb Sulphur Moss in the Thermal Veins.',
    effect: 'Cross steam corridors and the thermal descent to the Deep Ocean.',
  },
  {
    id: 'echo',
    name: 'Echolocation',
    glyph: '◌',
    threshold: 14,
    source: 'Spend turns near Echocrabs. Their rhythms calibrate your senses.',
    effect: 'Send a pulse through walls to reveal hidden geometry.',
  },
  {
    id: 'pads',
    name: 'Adhesive pads',
    glyph: '⋮',
    threshold: 12,
    source: 'Touch Cling Beetle colonies, or linger beside them.',
    effect: 'Climb to the Canopy Ruins and cross vertical surfaces.',
  },
  {
    id: 'acid',
    name: 'Corrosive secretion',
    glyph: '∴',
    threshold: 14,
    source:
      'Absorb Chalkbloom chemistry and an acid-water or Bloom Scar sample.',
    effect: 'Dissolve identified calcium barriers, shell thickets, and kelp.',
  },
];
export interface Link {
  id: string;
  name: string;
  needs: string[];
  text: string;
  requireBiomes?: number;
}
export const LINKS: Link[] = [
  {
    id: 'moth-chain',
    name: 'Light → moth → passage',
    needs: ['glowcap', 'moth', 'calcite'],
    text: 'Light attracts a moth. A landing releases spores. The spores soften a calcified wall.',
  },
  {
    id: 'calcium',
    name: 'A landscape of excess calcium',
    needs: ['chalk', 'hermit'],
    text: 'Chalkbloom dispersal maps space; shell rings map time. Together they record the reef’s destabilisation.',
  },
  {
    id: 'gradient',
    name: 'Contamination convergence',
    needs: ['pixie', 'brack', 'fern', 'root'],
    requireBiomes: 3,
    text: 'Land, water, and living tissue carry the same foreign signature. Every gradient points into the Hearthroot.',
  },
  {
    id: 'weft',
    name: 'The Weft, reconstructed',
    needs: ['rot', 'slug', 'chamber', 'moss'],
    text: 'Four surviving pathways are fragments of one lost mutualism. Reunited, they can metabolise the foreign element.',
  },
  {
    id: 'clean',
    name: 'A message before the Fraying',
    needs: ['core', 'kelp', 'frozen'],
    text: 'Copied algae, kelp roots, and dried mycelium preserve the same coherent language. The failure is in transmission.',
  },
  {
    id: 'network',
    name: 'The network’s topology',
    needs: ['caster', 'crab', 'vine'],
    requireBiomes: 3,
    text: 'Spore patterns, tapping rhythms, and amplified signals reveal the order in which the network must be restored.',
  },
  {
    id: 'neutralise',
    name: 'A small, working cure',
    needs: ['ember', 'moss', 'fern'],
    text: 'Ember Lichen proves that neutralisation is possible. Its chemistry can guide the reconstructed Weft.',
  },
  {
    id: 'rootsinger',
    name: 'A light that remembers',
    needs: ['eel', 'frozen', 'caster'],
    text: 'Your markings carry Rootsinger chemistry. With the Choir’s memories, light can become a delivery language.',
  },
  {
    id: 'anatomy',
    name: 'One organism, from roots to sky',
    needs: ['root', 'hearth', 'frozen'],
    text: 'The world’s infrastructure is a single body. The almanac now holds the biochemical profile needed to treat it.',
  },
  {
    id: 'lifecycle',
    name: 'The unfinished cycle',
    needs: ['worm', 'mire', 'drifter', 'thicket'],
    text: 'The deep past, the present dead, the empty crown, and the sealed survivors tell one story: decomposition was interrupted.',
  },
  {
    id: 'tides',
    name: 'A broken clock',
    needs: ['tidebloom', 'architect', 'sweeper'],
    text: 'The builders follow yesterday’s signals. Irregular root contractions now move the tides.',
  },
  {
    id: 'circulation',
    name: 'The water’s remaining paths',
    needs: ['runner', 'jelly', 'sweeper'],
    text: 'Jellies map local water; runners connect it; Tidesweepers keep stagnant edges in motion.',
  },
];
export const CURE_LINKS = [
  'gradient',
  'weft',
  'clean',
  'network',
  'neutralise',
  'rootsinger',
  'anatomy',
];
export const CHOIR = [
  'Warmth without a boundary. Someone receives what you have seen.',
  'An impression of three hungers, learning to feed each other.',
  'The roots reach down. A canopy reaches up. For a moment, both are you.',
  'Ten thousand relationships held in one memory. No eyes left to see them change.',
  'We thought that knowing was enough. We forgot that a body could touch.',
  'A filament and an alga, once inseparable. Their chemistry made strangers into neighbours.',
  'Before the crown, before the roots: a small basin, a spore, a beginning.',
  'Death fed growth. What frightened us was never an ending, only the loss of the cycle.',
];
export const ENDINGS = {
  escape: {
    title: 'Beyond the last signal',
    text: 'The final Sporecaster fires into silence. You carry the map beyond the reach of the roots. Behind you, the world continues its long, unfinished dying. You are alive. The network cannot follow.',
  },
  cure: {
    title: 'A language remembered',
    text: 'The reconstructed Weft takes hold. In a small circle around the root, the stuttering stops. For the first time in generations, the three kingdoms hear each other. It will take lifetimes to spread. You have given them a beginning.',
  },
  renewal: {
    title: 'What the light leaves behind',
    text: 'The Hearthroot pulses once. Across the world, every living light answers. Its tissue becomes chemistry, and the foreign element loses its hold. Somewhere, eventually, something will hatch. The almanac will be waiting.',
  },
};
