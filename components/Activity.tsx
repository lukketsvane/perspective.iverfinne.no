import React, { useEffect, useState } from 'react';
import { useActivity } from '../lib/activity';

/**
 * The one thing the tool says out loud, and it says it without words.
 *
 * A hairline along the very top edge: a segment running across it while
 * something is being fetched, parsed or written, and the whole line in red for a
 * moment when that came back as nothing. Two pixels at the edge of the frame is
 * about the most a drawing reference can afford to spend on its own state.
 */

/** How long the failure mark stays up. Long enough to be seen, not read. */
const FAILURE_MS = 1600;

export const Activity: React.FC = () => {
  const { busy, failedAt } = useActivity();
  const [failing, setFailing] = useState(false);

  useEffect(() => {
    if (!failedAt) return;
    setFailing(true);
    const timer = setTimeout(() => setFailing(false), FAILURE_MS);
    return () => clearTimeout(timer);
  }, [failedAt]);

  if (!busy && !failing) return null;

  return (
    <div
      className="fixed top-0 inset-x-0 h-[2px] z-[60] pointer-events-none overflow-hidden"
      aria-hidden
    >
      {failing ? (
        <div className="w-full h-full bg-red-500 animate-[perspective-fade_1.6s_ease-out_forwards]" />
      ) : (
        <div className="w-1/3 h-full bg-sky-500 animate-[perspective-sweep_1.1s_ease-in-out_infinite]" />
      )}
    </div>
  );
};
