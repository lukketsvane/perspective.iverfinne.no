/**
 * The objects the tool ships with: an aeroplane, the four men working on it,
 * a drum, a small astronaut in a bunny-eared spacesuit three times, and the
 * hare the lesson is addressed to, fourteen times.
 *
 * They are true to life - measured, they come in at the sizes the real things
 * are, so anything drawn against one is drawn against a real man.
 *
 * IT WAS THREE TIMES THIS SIZE, and the cut is the point. There were two
 * chairs, a car, four horses, a platypus, three crowded studies, a bowser, a
 * rack, a trolley and a bell - twenty megabytes of shelf, most of which was on
 * it because it was interesting rather than because this drawing needed it.
 * What is left is one subject and the yard around it, which is the thing the
 * tool actually opens on and the thing a page gets drawn from.
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
   * How far off the floor the pose actually is, in metres.
   *
   * Everything the loader puts down is grounded on its own lowest point, which
   * is right for anything standing and wrong for anything in the air: a figure
   * caught mid-jump has a boot as its lowest point, so grounding it stands the
   * jump ON that boot and the leap becomes a man on tiptoe. This is the height
   * the pose was caught at, and the only three entries that carry one are the
   * two jumps and the run.
   */
  lift?: number;
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
   *
   * It survived the cut because it is not a file: it is lathed on the spot from
   * eleven lines in loadModel.ts, so it costs the shelf nothing to keep.
   */
  { id: 'cylinder', name: 'Cylinder', url: 'primitive:cylinder' },

  /*
   * The Hughes H-1, 1935: the one form on the shelf that is a solid of
   * revolution with things hung off it.
   *
   * Every vehicle that used to be here was a long box with wheels, which is a
   * box lesson. A racer's fuselage is a lathe-turned body tapering in two
   * directions at once, and its wings are one aerofoil section swept and
   * stretched - so the cross-section changes along the length in a way no box
   * construction predicts, and the ellipse the cowling presents changes its
   * openness continuously from nose to tail. That is the drawing this shelf did
   * not have, and it is why this is the one thing on it that was never in
   * question.
   *
   * Measured, it is 9.7 across the wings and 8.8 long, standing 3.2 on its own
   * gear with the tail down.
   *
   * IT IS NINETEEN MEGABYTES, twelve times the heaviest figure here and four
   * fifths of the shelf on its own. Nothing loads until it is tapped, so it
   * costs a first visit nothing - but it is a real cost to whoever taps it, and
   * on a phone it is the single heaviest thing this tool will ever ask a
   * browser to parse.
   */
  // No height: this one is authored at its real size and squarely aligned, so
  // it is placed exactly as it comes. The first copy needed 2.4 m forced onto
  // it, which is a number somebody has to be right about; a file that measures
  // itself is better than a file plus a correction.
  { id: 'hughes-h1', name: 'Hughes H-1 Racer', url: '/meshes/hughes-h1.glb' },

  /*
   * THE FOUR MEN: what turns one aeroplane into an airfield.
   *
   * An aircraft alone on an infinite grid is a beautiful object and a poor
   * subject. Nothing in the frame says how big it is except the ruling, which
   * is a convention you have to already believe; nothing is at a different
   * depth from it; and there is no second form for its own to be drawn
   * against. Four men fix all three at once - they are the size every viewer
   * knows best, they stand at four separate distances, and not one of them is
   * a shape the aeroplane is.
   *
   * They are also the ordinary reason a 1935 racer is sitting still: it is
   * being checked over, worked on and waited beside. The pages this is after are
   * full of exactly this - the vehicle is never the drawing, the yard is.
   *
   * FOUR POSES, chosen so that no two are the same drawing problem. Two upright
   * with the mass stacked, one folded down on one knee, one folded right up on
   * its heels - and the last of those is the hardest thing here to draw, a
   * whole body compressed into a metre and a bit with every limb foreshortened
   * at once.
   *
   * NONE OF THEM CARRIES A HEIGHT, for the same reason the racer does not: the
   * real size is baked into the file. Measured, they are 0.62 x 1.72 x 0.56,
   * 0.62 x 1.70 x 0.81, 0.85 x 1.68 x 1.21 and 0.81 x 1.20 x 0.71 metres.
   *
   * HOW THOSE SIZES WERE ARRIVED AT, since all four arrived normalised to 0.978
   * and so said nothing about how big the man was. The one standing upright was
   * read straight off a ruled post - 1.72 to the top of his cap, a man of about
   * 1.75 with his head down - and the other three were hung off him by standing
   * all four against the same post and matching them. Weighing them, which is
   * how the animals that used to be here were checked, does not work on these:
   * it puts the man in the leather flying jacket at four times the volume of
   * the man in a shirt, because a flying jacket is four times the coat.
   *
   * AND EVERY ONE OF THEM FACES +Z. Three of the four were authored looking the
   * other way, which is exactly the mix that once put a marshaller signalling
   * at nobody with his back to the aeroplane. The quarter turns are baked into
   * the files rather than carried as a note, so the scene that stands them up
   * has one rule instead of a table of exceptions.
   *
   * They arrive at ninety thousand triangles apiece with photographic maps.
   * Shipped, the maps and the UVs are gone entirely and the geometry is welded
   * on position and re-normalled - four of the five drawing surfaces are ink
   * and never sample a texture, the fifth is not improved by a photograph of
   * somebody's face, and a welded mesh is what the contour shader needs to draw
   * a clean edge. Each is about 1.6 MB.
   */
  { id: 'crew-clipboard', name: 'Ground crew, with a clipboard', url: '/meshes/crew-clipboard.glb' },
  { id: 'crew-standing', name: 'Ground crew, standing', url: '/meshes/crew-standing.glb' },
  { id: 'crew-kneeling', name: 'Ground crew, kneeling', url: '/meshes/crew-kneeling.glb' },
  { id: 'pilot-crouched', name: 'Pilot, crouched', url: '/meshes/pilot-crouched.glb' },

  /*
   * THE THREE ASTRONAUTS: one small character in a bunny-eared spacesuit,
   * three poses, and a different kind of figure from the men on purpose.
   *
   * The crew are anatomy - real proportions, real clothes, the sizes people
   * are. These are CONSTRUCTION: a body built openly out of spheres, capsules
   * and tubes, which is how every figure is blocked in before it is anybody.
   * Drawing the crew is drawing what you see; drawing these is drawing the
   * armature itself, and a beginner can actually finish one.
   *
   * The poses are three drawing problems the yard does not pose. Flat on the
   * back with everything in the air is the feet-first foreshortening study -
   * the pose every figure course sets and no standing figure can teach. The
   * walk is a figure in MOTION, weight mid-transfer, nothing symmetrical. And
   * the one with the jetpack is the same body standing, which is what the
   * other two are measured against.
   *
   * They are generated meshes, not scans, and it shows in the numbers: they
   * arrive at twenty-five thousand triangles - sixteen scanned crewmen - with
   * one flat-colour map, no photograph anywhere on them. So unlike the crew
   * the base colour is kept, at 1024 like everything else: on the solid page
   * it is the suit's own cream and leather, and the ink pages never sample it.
   * The normal and metallic-roughness maps went the way of the animals', with
   * the factors owned in the file (metallic 0 - the glTF default of 1 would
   * draw them black the day the app's own override stopped covering for it).
   *
   * NO REAL SIZE EXISTS FOR A CARTOON, so each is sized for its job. The
   * walker stands at 1.80, because he is the lesson's measuring stick: a
   * figure in grown-up height that the horizon cuts just under the top -
   * exactly where it would cut you. The other two stay character-sized, a
   * metre and a bit standing and 0.9 to the raised mitten, children beside
   * the 1.72 m crewman.
   *
   * And they face +Z like everything here - one arrived facing away and one
   * lying with its feet across the ruling, and both quarter-turns are baked
   * into the files, same rule as the crew, no table of exceptions.
   */
  { id: 'astro-back', name: 'Astronaut, on their back', url: '/meshes/astro-back.glb', height: 0.9 },
  { id: 'astro-jetpack', name: 'Astronaut, with a jetpack', url: '/meshes/astro-jetpack.glb', height: 1.15 },
  { id: 'astro-walking', name: 'Astronaut, walking', url: '/meshes/astro-walking.glb', height: 1.8 },

  /*
   * PERSPEKTIVHAREN: one character, fourteen poses, and the first thing on this
   * shelf that belongs to the tool rather than to whoever made it.
   *
   * Everything above was found and cut down to size, and that shows in what it
   * can be asked to do: the crew are four men who work on an aeroplane and the
   * astronauts are three demonstrations of an armature. Neither is anybody. A
   * hare in a bunny-eared suit who turns up on the sixth card, again on the
   * twelfth, and again in the field you are left drawing at the end is
   * something else - the person the lesson is addressed to, and therefore the
   * MEASURING STICK, which has to be one recognisable body or it is only more
   * furniture standing about.
   *
   * A HUNDRED AND SEVENTY CENTIMETRES, SOLE TO CROWN, ALL FOURTEEN - and that
   * is not the number the files measure. The ears go a good twenty centimetres
   * past the top of the head, so a standing hare's box is 1.88 to 1.94 tall and
   * the HEAD is at 1.70. None of them carries a height for the same reason the
   * racer does not: the size is baked in, and a file that measures itself beats
   * a file plus a correction somebody has to be right about. The gap between
   * the two numbers is not a rounding error either, it is a thing the lesson
   * uses: stand at the tool's own eye height and the horizon lands on the crown
   * of every standing hare in the frame, near one and far one alike, with the
   * ears over the line.
   *
   * WHAT EACH POSE IS WORTH, in metres to the crown, because this is the table
   * the eye-level cards are built out of:
   *
   *   standing        1.70, 1.70, 1.70, 1.66, 1.68
   *   jumping         1.64, 1.66      (folded up, and off the ground - see lift)
   *   running         1.49            (folded forward, not crouched)
   *   crouched        1.23
   *   kneeling        1.13
   *   sitting         1.10, 1.13, 0.96
   *   lying           0.65 tall, 1.79 long
   *
   * Which is the second thing they are for. A body you know the height of, in
   * seven attitudes you also know the height of, is a ruler you can lay against
   * anything: a seated person's head is two thirds of a standing one's, and
   * nobody who has drawn that once has to be told it again.
   *
   * FIVE OF THEM STAND, and that is the one count on this shelf that is not
   * about drawing problems. Every other rule here says no two poses may be the
   * same problem - and five standing hares are five copies of one problem. They
   * are here because a FLOCK is a card: a dozen figures at a dozen distances
   * with one line landing at the same place on every one of them, which is the
   * most useful sentence in perspective said with bodies instead of posts. A
   * flock built from one model is not a flock, it is a texture, and the eye
   * reads the repetition instead of the rule. Five bodies with folded arms,
   * hands on hips, a raised thumb, a wave and nothing at all is a crowd.
   *
   * THE OTHER NINE ARE THE USUAL ARGUMENT: no two the same drawing. Two jumps
   * with everything in the air, a run with the weight nowhere, a crouch and a
   * kneel that fold a whole body into a metre, three ways of sitting that put
   * the legs at three different angles to the eye, and one flat out with the
   * feet toward you, which is the foreshortening study no standing figure can
   * teach.
   *
   * AND THEY ALL FACE +Z, like everything here. Twelve arrived facing +X, one
   * facing -X and one facing -Z, which is exactly the mix that once put a
   * marshaller signalling at nobody with his back to the aeroplane. The turns
   * are baked into the files rather than carried as a table of exceptions, and
   * a quarter turn about Y is a swap and a sign in floating point, so not one
   * vertex was resampled to do it.
   *
   * THE COST, since the shelf's whole story is the cut: 190 KB apiece and 2.6 MB
   * for all fourteen, which is an eighth of the racer alone. Ten thousand
   * triangles each, one flat grey material, and no maps whatsoever - no
   * photograph, no normal map, nothing to sample - so they are the cheapest
   * things here to draw as well as to fetch, and nothing loads until it is
   * tapped.
   */
  { id: 'hare-standing-1', name: 'Perspektivharen, arms folded', url: '/meshes/hare-standing-1.glb' },
  { id: 'hare-standing-2', name: 'Perspektivharen, standing', url: '/meshes/hare-standing-2.glb' },
  { id: 'hare-standing-3', name: 'Perspektivharen, thumb up', url: '/meshes/hare-standing-3.glb' },
  { id: 'hare-standing-4', name: 'Perspektivharen, hands on hips', url: '/meshes/hare-standing-4.glb' },
  { id: 'hare-standing-5', name: 'Perspektivharen, waving', url: '/meshes/hare-standing-5.glb' },
  /*
   * The three that are off the ground, and the reason `lift` exists.
   *
   * A jump is a crown ABOVE where the head stands, not a body resting on the
   * boot it happens to hang lowest from: a third of a metre is what an ordinary
   * person's head gains at the top of an ordinary hop, so each jump is lifted
   * until its crown reaches 2.0 - a shade over the 1.70 it stands at. The run
   * is not that arithmetic and does not get it: a runner's crown is low because
   * the body is folded forward, not because it is down, so what it needs is the
   * ground clearance of a stride's float phase, which is about a hand's width.
   */
  { id: 'hare-jumping-1', name: 'Perspektivharen, mid-jump', url: '/meshes/hare-jumping-1.glb', lift: 0.36 },
  { id: 'hare-jumping-2', name: 'Perspektivharen, mid-jump, arms wide', url: '/meshes/hare-jumping-2.glb', lift: 0.34 },
  { id: 'hare-running', name: 'Perspektivharen, running', url: '/meshes/hare-running.glb', lift: 0.1 },
  { id: 'hare-crouched', name: 'Perspektivharen, crouched', url: '/meshes/hare-crouched.glb' },
  { id: 'hare-kneeling', name: 'Perspektivharen, kneeling', url: '/meshes/hare-kneeling.glb' },
  { id: 'hare-sitting-1', name: 'Perspektivharen, sitting with a box', url: '/meshes/hare-sitting-1.glb' },
  { id: 'hare-sitting-2', name: 'Perspektivharen, sitting, leaning back', url: '/meshes/hare-sitting-2.glb' },
  { id: 'hare-sitting-3', name: 'Perspektivharen, sitting, knees up', url: '/meshes/hare-sitting-3.glb' },
  { id: 'hare-lying', name: 'Perspektivharen, flat out', url: '/meshes/hare-lying.glb' },
];

/*
 * There is no openingMesh any more. The tool used to stand the racer up on
 * the empty grid - the H-1 earned it, a solid of revolution no box
 * construction predicts - but the opening is a STREET now, composed in
 * App.tsx, and the racer waits on the shelf for whoever wants the harder
 * drawing. The `__forceMesh` dev hook went with it: it existed to point the
 * opening at each library object in turn, and there is no single opening
 * object left to point.
 */
