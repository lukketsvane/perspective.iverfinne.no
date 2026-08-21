/**
 * The objects the tool ships with: one drum, and one character in fourteen
 * attitudes.
 *
 * They are true to life - measured, they come in at the sizes the real things
 * are, so anything drawn against one is drawn against a real body.
 *
 * IT WAS SIX TIMES THIS SIZE, AND THE CUT IS THE POINT - twice over now.
 *
 * The first cut took out two chairs, a car, four horses, a platypus, three
 * crowded studies, a bowser, a rack, a trolley and a bell: twenty megabytes of
 * shelf, most of it there because it was interesting rather than because a
 * drawing needed it. What survived was one subject and the yard around it - a
 * 1935 racer at nineteen megabytes, the four men who worked on it, and three
 * astronauts built openly out of spheres and capsules.
 *
 * The second cut took THOSE, and it is the harder one to argue for, because
 * every one of them was good. The racer was the best hard drawing in the
 * library and the only solid of revolution on it; the crew were real anatomy at
 * real sizes. The argument against them is not quality. A shelf is a claim
 * about who the tool is for, and a shelf carrying three separate casts makes
 * three claims at once: a viewer met an aeroplane mechanic at the front door,
 * a jetpacked cartoon on the sixth card and a hare on the seventh, and had to
 * work out for themselves that only one of them was the measuring stick. One
 * body, in every attitude a drawing needs, says it without being said.
 *
 * It also took twenty-eight megabytes off the shelf and left two and a half.
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
   * PERSPEKTIVHAREN: one character, fourteen poses, and the only thing on this
   * shelf that belongs to the tool rather than to whoever made it.
   *
   * Everything that used to stand here was found and cut down to size, and that
   * showed in what it could be asked to do: four men who work on an aeroplane
   * and three demonstrations of an armature, and not one of them anybody. A
   * hare in a bunny-eared suit who is waving at you when the tool opens, who
   * turns up on the fifth card and the seventh and the seventeenth, and who is
   * sitting beside the cube you are left drawing at the end, is something else -
   * the person the lesson is addressed to, and therefore the MEASURING STICK,
   * which has to be one recognisable body or it is only more furniture standing
   * about.
   *
   * A HUNDRED AND SEVENTY CENTIMETRES, SOLE TO CROWN, ALL FOURTEEN - and that
   * is not the number the files measure. The ears go a good twenty centimetres
   * past the top of the head, so a standing hare's box is 1.88 to 1.94 tall and
   * the HEAD is at 1.70. None of them carries a height, because the size is
   * baked in - and a file that measures itself beats a file plus a correction
   * somebody has to be right about. The gap between
   * the two numbers is not a rounding error either, it is a thing the lesson
   * uses: the deck stands you at 1.70, so the horizon lands on the crown of
   * every standing hare in the frame, near one and far one alike, with the ears
   * over the line.
   *
   * The tool's own default eye is 1.9 - a tall standing one - so at the front
   * door the line sits a hand's width ABOVE her head instead. That is not a
   * contradiction, it is the reading the fifth card teaches: the line is your
   * height, and where it crosses somebody tells you how much taller or shorter
   * than you they are.
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
