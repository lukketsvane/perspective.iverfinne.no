/**
 * WHAT A BUTTON IS, WHEN YOU HAVE FORGOTTEN.
 *
 * Nothing in this tool carries visible text. That is a decision the whole
 * interface is built on - there is no room for eight captions on a phone, a
 * label under a control is read once and never again, and the shape is what
 * you learn - and it has one honest cost: three weeks later, the difference
 * between the sphere and the endless band is a glyph you half remember.
 *
 * The tour answers that once, on the way in, for nine controls out of forty.
 * This answers it for all of them, whenever you ask: HOLD a control and its
 * name appears above it. Let go and it is gone, and the control does not fire
 * - reading what something is must never be the same gesture as doing it.
 *
 * WHY IT IS KEYED ON THE ARIA-LABEL. Those labels already exist, they are
 * already exact, and they are already the thing this app hangs its meaning on:
 * the tour rings a control by its label, the harness clicks one by its label,
 * and a screen reader reads it. Keying the hints on anything else would be a
 * second register of names to keep in step with the first. The one thing that
 * costs is that a label carrying a live value - `Snap to 0.25 m`, `Floor: 128
 * of 255 - drag to change` - has to be matched by its stem, which `hintFor`
 * does by taking the longest key the label starts with.
 *
 * THE TEXT IS NYNORSK, like the tour's cards and unlike the labels themselves:
 * the labels are machine-facing names, and this is the one place in the app
 * where a human is being told something in words. Two or three of them. A hint
 * that is a sentence is a hint nobody finishes reading with their thumb still
 * on the glass.
 */

/**
 * Keyed by the aria-label, or by the stem of one that carries a value.
 *
 * Ordered by nothing - `hintFor` sorts by length so that the longest match
 * wins, which is what makes `Height off the floor` and `Height` two different
 * answers rather than a race.
 */
const HINTS: Record<string, string> = {
  // ---------------------------------------------------------------- the dock
  'Add model': 'Hylla: ting å setje ned',
  Scenes: 'Prosjekta dine',
  'Field of view': 'Synsfelt. Blått er innanfor menneskesyn',
  'Camera height': 'Augehøgd over golvet',
  'Construction guides': 'Rommet sin konstruksjon: horisont og punkt',
  Undo: 'Angre',
  Redo: 'Gjer om',
  Tools: 'Alt det andre',

  // -------------------------------------------------------------- the panel
  'Floor lines': 'Golvlinjene: bort, på tvers, begge',
  'Floor:': 'Golvet. Dra for tone',
  'Snap to': 'Fest til rutenettet',
  'Snap off': 'Fest til rutenettet',
  'Construction around': 'Kassar rundt tinga',
  'Paper tone': 'Arket. Dra for tone',
  'Page behind the drawing': 'Bakgrunnen bak arket',
  Lights: 'Lyset',
  'Stand the scene in the room around you': 'Sjå det i rommet ditt (AR)',
  'Save the scene as USDZ for an AR device': 'Lagre som USDZ for AR',
  'Projection: rectilinear': 'Flat plate: eitt, to og tre punkt',
  'Projection: cylindrical': 'Sylinder: fire punkt, rette loddrette',
  'Projection: equidistant': 'Kule: fem punkt, det rula arket',
  'Projection: stereographic': 'Stereografisk: vinkelrett overalt',
  'Lens reach': 'Kor vidt linsa får opnast',
  'Frame the view as a lens': 'Sjå det som eit kamera',
  'Lens:': 'Objektivet. Trykk for å leggje det bort',
  Aperture: 'Blenderen. Kor tynt fokuset er',
  Shutter: 'Lukkartida. Kor lenge lyset slepp inn',
  Sensitivity: 'ISO. Kor følsam brikka er',
  'Aperture priority': 'Lukkaren held lysmengda når du opnar blenderen',
  'Manual exposure': 'Manuelt: blenderen endrar lysmengda',
  Focus: 'Kva avstand som er skarp',
  'Gate:': 'Forma på biletet',
  'Room,': 'Rommet rundt. Dra for storleik',
  'Measure distances in the scene': 'Målebandet',
  'Look by turning the phone': 'Snu telefonen for å sjå. Dobbelttrykk for rommet under',
  'Save the view as a picture': 'Lagre biletet',
  'Learn how perspective works': 'Leksjonen: kvifor perspektiv verkar',
  'Take the tour again': 'Ta omvisinga på nytt',

  // ------------------------------------------------------------- the lights
  //
  // The one panel in the tool with no words anywhere near it and the most to
  // say: four knobs that are the same four knobs for every light there is, and
  // then a whole sky behind them.
  'The key light': 'Hovudlyset, altså sola',
  'The fill light': 'Utfyllingslys, utan skygge',
  'The sky, the hour and the weather': 'Himmelen: stad, tid og vêr',
  Bearing: 'Kva leid lyset kjem frå',
  'Height above the horizon': 'Kor høgt over horisonten',
  Strength: 'Kor sterkt lyset er',
  'Colour temperature': 'Fargen på lyset, varm til kald',
  'Cast shadows': 'Skygge: av, hard, mjuk',
  'Lamp on': 'Slå lampa av og på',
  'A spot, throwing a cone': 'Spot, som kastar ein kjegle',
  'A bulb, shining every way': 'Pære, som lyser alle vegar',

  // --------------------------------------------------------- the real sky
  'Aim the sun from a place and a moment': 'Lat stad og tid styre sola',
  'Time of day': 'Klokkeslettet',
  'Day of the year': 'Datoen',
  'Let the hour run': 'Lat tida gå',
  'Stop the clock': 'Stopp tida',
  'How fast the hour runs': 'Kor fort tida går',
  'Use where this device is': 'Bruk staden du er på',
  'Using where this device is': 'Bruk staden du er på',
  'Draw the sky': 'Teikn himmelen bak',
  'the real conditions here': 'Hent det verkelege vêret her',
  'Asking what the sky is doing': 'Spør kva vêret gjer',
  'The conditions could not be fetched - try again': 'Fekk ikkje tak i vêret',
  Air: 'Kor mykje luft — botnen er vakuum',
  Stars: 'Alle stjerner eit auge kan sjå',
  'Constellation figures': 'Stjernebileta, teikna opp',
  'How much of the sky is covered': 'Kor mykje av himmelen er dekt',
  'How high the cloud sits': 'Kor høgt skyene ligg',
  Wind: 'Vinden. Kor fort skyene driv',
  'Which way the wind comes from': 'Kva leid vinden kjem frå',

  // ------------------------------------------------------- the drawn page
  'How the hatching is ruled': 'Korleis jatteringa er rula',
  "The marker's own settings": 'Tusjen sine innstillingar',
  'The pen this page is drawn with': 'Pennen sida er teikna med',
  "Draw this with the page's own settings again": 'Fylg sida igjen',

  // ------------------------------------------------------ the model shelf
  'Add light': 'Set ned ei lyskjelde',
  'Add cube': 'Målekube på ein meter',
  'Deal a field of cubes to draw': 'Ei side med kassar å teikne',
  'Draw boxes on the ground': 'Teikn kassar: dra grunnflate, dra høgd',
  'Import a mesh into the library': 'Hent inn di eiga fil',

  // ------------------------------------------------------ the scene shelf
  'Save this scene': 'Lagre prosjektet',
  Update: 'Skriv over det opne prosjektet',
  'Save this as a new scene': 'Lagre som eit nytt prosjekt',
  'Export scene file': 'Skriv prosjektet til fil',
  'Import scene file': 'Hent inn ei prosjektfil',
  'Clear the scene': 'Tøm scena',
  Rename: 'Gje det eit namn',

  // ----------------------------------------------------- the selection bar
  Height: 'Høgd i meter. Dra',
  'Height, locked': 'Høgda er låst',
  'Height off the floor': 'Høgd over golvet. Dra',
  'Lock the size': 'Lås storleiken',
  'Size locked': 'Storleiken er låst',
  'Construction on this one': 'Punkt, diagonalar, firedelt golv',
  Delete: 'Slett',
  'things in hand': 'Så mange du held. Hald på ein til for å leggje han i handa',
  'metres away': 'Så langt unna',
};

/*
 * TWO CONTROLS ARE DELIBERATELY ABSENT FROM THE LIST ABOVE.
 *
 * The rung seats - "Surface of everything" and "Surface of this one" - open
 * their own settings on a hold, so a hold on them cannot also put a name in a
 * bubble. That is the trade useHoldable describes and it is the right one: a
 * drawer that opens and shows you the knobs is a better answer to "what is
 * this" than two words, and a control whose hold does something must never be
 * a control whose hold explains something.
 *
 * Anything else missing from the list is missing by omission and should be
 * added. These two are missing on purpose, and adding them would silently take
 * the drawer away.
 */

/** The keys, longest first, so a stem never wins over a fuller match. */
const KEYS = Object.keys(HINTS).sort((a, b) => b.length - a.length);

/** What to say about the control carrying this label, if anything. */
export const hintFor = (label: string | null | undefined): string | null => {
  if (!label) return null;
  const key = KEYS.find((k) => label === k || label.startsWith(k) || label.endsWith(k));
  return key ? HINTS[key] : null;
};
