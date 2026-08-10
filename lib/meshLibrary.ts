/**
 * The objects the tool ships with.
 *
 * They are true to life - measured, they come in at the sizes the real things
 * are, so anything drawn against one is drawn against a real chair. Two chairs
 * and a car, which between them cover the range a study needs something known
 * to be measured against: a knee-high thing, a seat-high thing and a six-metre
 * thing. Then four animals, which cover the other range - the forms that are
 * not square to anything.
 *
 * Everything else in the library is the viewer's own. A file dropped in is kept
 * in the browser and listed beside these from then on, so a mesh is imported
 * once and placed as often as the drawing wants - see `lib/assets.ts`.
 *
 * Meshes are fetched on demand rather than bundled, so opening the app pays for
 * one.
 */

export interface LibraryMesh {
  id: string;
  /** Never drawn: this is the accessible name, and the placed model's own. */
  name: string;
  url: string;
  /**
   * The real height of the thing, in metres. Absent for anything authored at
   * its true size, which is placed exactly as it comes.
   */
  height?: number;
  /**
   * A room rather than an object.
   *
   * The difference is not size, it is what you do with it. An object is
   * something you stand a known distance from and draw; a scene is something
   * you walk into and draw from inside. So a scene lands on the origin instead
   * of beside whatever is already there, and carries no construction cage and
   * no vanishing points of its own - one box round fifteen figures, a desk and
   * a wolf answers nothing, and its three axes are the world's, which the
   * construction sheet already marks.
   */
  kind?: 'object' | 'scene';
}

export const MESH_LIBRARY: LibraryMesh[] = [
  /*
   * The ellipse lesson. A circle in perspective is an ellipse, its openness
   * set by how far it stands from the eye line - the fact every wheel, cup
   * and arch is drawn with, and the one thing a scene of boxes cannot show.
   * A metre round and a metre tall, so both of its circles read against the
   * grid.
   */
  { id: 'cylinder', name: 'Cylinder', url: 'primitive:cylinder' },
  { id: 'ekstrem', name: 'Ekstrem', url: '/meshes/ekstrem.glb' },
  { id: 'balans-variabel', name: 'Balans Variabel', url: '/meshes/balans-variabel.glb' },
  { id: 'il-tempo-gigante', name: 'Il Tempo Gigante', url: '/meshes/il-tempo-gigante.glb' },
  /*
   * The Hughes H-1, 1935: the one form on the shelf that is a solid of
   * revolution with things hung off it.
   *
   * Every other vehicle here is a long box with wheels, which is a box lesson.
   * A racer's fuselage is a lathe-turned body tapering in two directions at
   * once, and its wings are one aerofoil section swept and stretched - so the
   * cross-section changes along the length in a way no box construction
   * predicts, and the ellipse the cowling presents changes its openness
   * continuously from nose to tail. That is the drawing this shelf did not
   * have.
   *
   * Height 2.4 m is the aircraft standing on its own gear with the tail down,
   * measured over the whole of it the way the animals are - not the wingspan,
   * which is 7.6, and not the length, which is 8.2.
   *
   * IT IS NINETEEN MEGABYTES, which is seven times the largest thing that was
   * here and half the shelf again on its own. Nothing loads until it is
   * tapped, so it costs a first visit nothing - but it is a real cost to
   * whoever taps it, and on a phone it is the single heaviest thing this tool
   * will ever ask a browser to parse.
   */
  { id: 'hughes-h1', name: 'Hughes H-1 Racer', url: '/meshes/hughes-h1.glb', height: 2.4 },

  /*
   * Four horses and a platypus: the half of the shelf that does not hold
   * still.
   *
   * A chair is a box with legs and a car is a long box, and both are things a
   * construction can be checked against - but neither of them ever asks the
   * question a body asks, which is how a form behaves when it is not square to
   * anything. A horse is the classical answer to that and has been since
   * Uccello: four legs at four different depths, a barrel that is a
   * foreshortened cylinder from every angle worth drawing, and a neck that
   * turns the whole mass. Kim Jung Gi drew them constantly for exactly that
   * reason.
   *
   * Four, because one horse is a shape and four are a lesson, and each is
   * named for the pose it is actually in rather than the pose that would round
   * the set off. Trotting, the foal is the plain case and the one to measure
   * the others against: four legs at four depths, the barrel square to the
   * spine, nothing folded. Lying, it is folded down on itself and the whole
   * barrel is read across the back. Leaping, it is off the ground with the
   * forelegs up, so the near foreleg comes almost straight at the eye and the
   * perspective does all the work. Rising, the adult horse has its hind end
   * still down and its neck already vertical, which turns the spine through
   * nearly a right angle inside one form - the deepest foreshortening on the
   * shelf, and the reason it is here.
   *
   * The platypus is not a joke. It is the one thing here with no straight
   * lines and no symmetry to lean on - a soft closed form of the kind that has
   * to be drawn by its contour and its cross-contour or not at all, which is
   * precisely what the drawn rungs are built to show.
   *
   * Four of them arrive from Tripo at 433,000 triangles and three 4096-square
   * maps apiece: 268 MB of GPU memory each, on a tool that only samples a
   * texture on one rung out of five. Shipped, the normal and metallic-roughness
   * maps are gone entirely, the base colour is 1024, the geometry is down to
   * 60,000 triangles, and each is about 1.5 MB - in line with the chairs. The
   * trotting foal is a hand-built mesh rather than a scan and came in clean at
   * 50,000, so it is not decimated at all; only its maps are dropped, and it
   * ships at 1.07 MB, the smallest thing on the shelf that is not a primitive.
   *
   * The heights are the animal in that pose, measured across the whole of it,
   * not the standing height of the species: a couched foal is not as tall as a
   * standing one and would be wrong on the grid if it were told it was. The
   * leaping foal's is a diagonal, hind hoof to ear tip, because that is what
   * its box measures when it is off the ground.
   *
   * Checked by WEIGHT, not by eye. A height is easy to argue about and easy to
   * be a foot wrong about; the volume a closed mesh encloses is not, and at
   * the density of an animal it comes out in kilogrammes. These five displace
   * 92, 90, 91, 456 and 39 kg - three foals of the same weight, which is the
   * whole claim of having three of them, and a horse in the middle of the 450
   * to 550 an adult riding horse weighs. They shipped once with the leaping
   * foal at 1.35 m and the horse at 1.9, which is 60 kg and 314: a foal half
   * the weight of the foal beside it, and a pony. The trotting foal's own
   * authored size is 1.5 m, which would have made it 104 - a heavier animal
   * than the two it is meant to be the same one as.
   */
  { id: 'foal-trotting', name: 'Foal, trotting', url: '/meshes/foal-trotting.glb', height: 1.44 },
  { id: 'foal-lying', name: 'Foal, lying', url: '/meshes/foal-lying.glb', height: 0.9 },
  { id: 'foal-leaping', name: 'Foal, leaping', url: '/meshes/foal-leaping.glb', height: 1.55 },
  { id: 'horse-rising', name: 'Horse, rising', url: '/meshes/horse-rising.glb', height: 2.15 },
  { id: 'platypus', name: 'Platypus', url: '/meshes/platypus.glb', height: 0.95 },

  /*
   * Three studies, reconstructed from Kim Jung Gi pages.
   *
   * Each is a single sculpted mesh - the figures, the furniture they are on and
   * the animals among them, welded into one - so there is nothing in them to
   * take apart and nothing to select inside. That is the point: they are not a
   * kit, they are a piece of a room at the density of incident he actually
   * drew at.
   *
   * Placed exactly as authored, like everything else here. Measured, they are
   * 1.77 x 1.69 x 1.68, 3.00 x 2.22 x 3.01 and 1.70 x 1.05 x 1.33 metres - so
   * they are objects by this library's own definition, things you stand a known
   * distance from and draw, and they carry the cage and their own vanishing
   * points like anything else. A group of figures at arm's length is the best
   * subject here for a blocking box, a footprint and a pair of points; marking
   * them as rooms was telling the only figures in the tool that the tool's own
   * construction did not apply to them.
   */
  { id: 'kjg-18', name: 'Study 18', url: '/meshes/kjg-18.glb' },
  { id: 'kjg-25', name: 'Study 25', url: '/meshes/kjg-25.glb' },
  { id: 'kjg-27', name: 'Study 27', url: '/meshes/kjg-27.glb' },
];

/**
 * What the tool stands up on the empty grid - when it opens, and again whenever
 * the scene is reset.
 *
 * The car, always. It used to be whichever of them the dice picked, on the
 * reasoning that a different object each time is a different exercise, but
 * opening on something different every time is not a room you know - and the
 * three are not equal for this. A chair is a box with legs. The car is curved
 * where the box is flat, six metres long so its far end is visibly smaller than
 * its near one, and turned enough that all three of its axes run off to three
 * separate points. It is the object here with the most perspective in it, which
 * makes it the one worth finding on the grid.
 */
export const openingMesh = (): LibraryMesh => {
  if (import.meta.env.DEV) {
    // A browser test needs to be able to look at each of them in turn.
    const forced = (window as unknown as { __forceMesh?: string }).__forceMesh;
    const wanted = MESH_LIBRARY.find((mesh) => mesh.id === forced);
    if (wanted) return wanted;
  }
  return MESH_LIBRARY.find((mesh) => mesh.id === 'il-tempo-gigante') ?? MESH_LIBRARY[0];
};
