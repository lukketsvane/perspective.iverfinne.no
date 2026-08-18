import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';

/**
 * The room you are actually in, faintly, under the drawing.
 *
 * This tool's whole subject is a view you set up and then draw from, and the
 * one view it could never set up is the one in front of you. Sighting a real
 * corridor to work out where its vanishing points are is a thing anybody with
 * a pencil does by holding the pencil up; doing it here meant guessing at a
 * room's proportions, building it out of boxes, and checking the result
 * against a memory.
 *
 * So the back camera goes under the picture. Hold the phone up, turn it - the
 * scene turns with you, because it is the same gesture the orientation sensor
 * already drives - and the ruled sphere, the horizon and the five points land
 * over the real room. Then you build the room against its own edges, or simply
 * read where its points are off the lines the tool is already drawing.
 *
 * IT IS FAINT, AND IT FADES OUT AT THE CORNERS. Two reasons, and neither is
 * decoration. A camera feed at full strength is a photograph with a drawing
 * lost somewhere in it - the construction is a hairline, and a hairline over a
 * lit room is invisible. And the corners are where a phone camera is least
 * like an eye: the lens is wide, so the corners are stretched by a distortion
 * this app's own projection knows nothing about, and lining a construction up
 * against a bent corner would be lining it up against a lie. The mask is
 * strongest where the two agree.
 *
 * Not AR. Nothing is tracked, nothing is anchored, and the feed is not scaled
 * to the field of view - it is a backing sheet you are drawing over, which is
 * what a reference photograph taped behind a layout has always been.
 */

/** How much of the feed comes through in the middle of the frame. */
const STRENGTH = 0.42;

export const CameraFeed: React.FC = () => {
  const on = useStore((s) => s.cameraFeed);
  const stop = useStore((s) => s.setCameraFeed);
  const video = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!on) return;
    let stream: MediaStream | null = null;
    let dropped = false;

    const open = async () => {
      try {
        /*
         * The back camera, and only if there is one. `exact` would throw on a
         * laptop, where there is one camera and it faces you - and a laptop is
         * where this gets tried first. So it is a preference: a phone gives
         * the world-facing lens, everything else gives what it has.
         */
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 } },
          audio: false,
        });
        if (dropped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play().catch(() => {
            // Autoplay refused. The element is muted and inline, so this is
            // rare; either way the frame simply stays empty.
          });
        }
        setLive(true);
      } catch {
        // Refused, or no camera at all. Say so by switching back off rather
        // than leaving a control lit over a black rectangle.
        setLive(false);
        stop(false);
      }
    };

    void open();
    return () => {
      dropped = true;
      setLive(false);
      if (video.current) video.current.srcObject = null;
      // The light on the phone goes out when the feed does. A track left
      // running behind a hidden element is a camera nobody knows is on.
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [on, stop]);

  if (!on) return null;

  /*
   * The mask: full strength through the middle two thirds, gone by the
   * corners. Written twice because Safari still wants the prefix, and given
   * to the element rather than to a wrapper so the fade applies to the video
   * itself and not to a rectangle over it.
   */
  const mask = 'radial-gradient(ellipse 78% 78% at 50% 50%, #000 34%, rgba(0,0,0,0.55) 62%, transparent 92%)';

  return (
    <video
      ref={video}
      autoPlay
      playsInline
      muted
      aria-hidden
      className="fixed inset-0 w-full h-full object-cover pointer-events-none z-20 transition-opacity duration-500"
      style={{
        opacity: live ? STRENGTH : 0,
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    />
  );
};
