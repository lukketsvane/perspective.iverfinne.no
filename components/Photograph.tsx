import React from 'react';
import { useStore } from '../store';

/**
 * A photograph under the drawing: the reference sheet taped behind the layout.
 *
 * The camera feed next door answers "what does the room I am standing in look
 * like"; this answers the other half of the same question, which is the one an
 * illustrator actually has - "what does THIS look like", where this is a
 * corridor somebody photographed once, a street from a book, a still off a
 * film, or the room you were in yesterday. Put it under the ruled sheet and the
 * whole construction the tool already draws lands over it: the eye level, the
 * principal point, the six rings. Then you do not deduce where the picture's
 * horizon is, you slide your own until they agree - and the moment they do, the
 * photograph has told you where the person holding the camera was standing.
 *
 * THAT IS THE ONLY THING IT IS FOR, and it is why nothing here tracks, scales,
 * warps or corrects. It is not AR and it is not a fit: a phone lens has a
 * distortion this app's projection knows nothing about, and lining a
 * construction up against a bent corner is lining it up against a lie. It is a
 * backing sheet. You move the sheet until it agrees with the picture.
 *
 * FAINT, AND GONE AT THE CORNERS, on the feed's own two numbers and for the
 * feed's own two reasons. A photograph at full strength is a photograph with a
 * drawing lost somewhere in it, because the construction is a hairline over a
 * lit room. And the corners are where a lens is least like an eye, so the mask
 * is strongest where the two agree.
 *
 * It sits in the same slot as the feed - over the WebGL frame, under the
 * construction overlays - because the canvas paints an opaque page behind the
 * scene every render, so "behind the grid" has to mean "over the render,
 * dimmed". See components/CameraFeed.tsx, which argues the same case.
 */

/** How much of the picture comes through in the middle of the frame. */
const STRENGTH = 0.42;

export const Photograph: React.FC = () => {
  const src = useStore((s) => s.photograph);
  if (!src) return null;

  const mask = 'radial-gradient(ellipse 78% 78% at 50% 50%, #000 34%, rgba(0,0,0,0.55) 62%, transparent 92%)';

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      /*
       * `contain` rather than `cover`, which is the one place this parts
       * company with the feed. A live camera IS the frame - cropping it is
       * what a viewfinder does. A photograph has edges somebody composed, and
       * cropping them off cuts away exactly the corners the card is about.
       */
      className="fixed inset-0 w-full h-full object-contain pointer-events-none z-20 transition-opacity duration-500"
      style={{ opacity: STRENGTH, maskImage: mask, WebkitMaskImage: mask }}
    />
  );
};
