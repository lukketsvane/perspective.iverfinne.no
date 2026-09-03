/**
 * WHERE THE SKY STANDS, AND WHOSE CLOCK IS BESIDE IT.
 *
 * One place and one clock, and they have to be the same one. The tool has no
 * map pin - it asks the browser for no location and makes no network request -
 * so the place is a decision made here, once, and the hour beside it has to be
 * that place's own hour or the two hands disagree: somebody setting half past
 * three on a clock the sun is not keeping is shown the sun as it stood at some
 * other time entirely, and the raking hour the front door asks for arrives a
 * good deal higher or lower than it meant to.
 *
 * IT WAS GREENWICH, in UTC, and the argument for it was that the prime
 * meridian is the one longitude where clock time and sun time agree, which
 * makes the whole simulation checkable by eye: set it to twelve and the sun is
 * due south. That is a fine property and it was bought with the wrong thing -
 * the place. A drawing tool's sky should be the sky the person drawing under it
 * knows, and this one is written, used and read in Oslo. The invariant survives
 * the move nearly intact: Oslo sits four degrees west of the meridian its own
 * clock is cut from, so the sun is due south at about seventeen minutes past
 * noon in winter and an hour and seventeen past in summer - which is what a
 * sundial in the city says too, and is exactly the discrepancy anybody who has
 * ever wondered why the sun is not overhead at lunch is wondering about.
 *
 * SO THE HOUR IS OSLO'S, DAYLIGHT SAVING AND ALL, and that is the reason this
 * file is not four lines. A fixed offset would be wrong for half the year, and
 * `Date`'s own accessors give either UTC or whatever zone the machine happens
 * to be in - neither of which is the zone the sun is standing over. The IANA
 * database is already in the browser, behind `Intl`, so it is asked.
 */

/** The place, and the clock it keeps. */
export const PLACE = {
  name: 'Oslo',
  latitude: 59.9139,
  longitude: 10.7522,
  zone: 'Europe/Oslo',
} as const;

/** A moment as a person reads it off a wall: the zone's own numbers. */
export interface Reading {
  year: number;
  /** One to twelve, because that is how a date is written. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/*
 * en-GB and two digits everywhere, so the parts come back as numbers with no
 * era, no month name and no am/pm to parse around. Built once: constructing a
 * DateTimeFormat is the expensive half of this, and the clock is read on every
 * commit of a drag.
 */
const FACE = new Intl.DateTimeFormat('en-GB', {
  timeZone: PLACE.zone,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** What the clock in that place says at this instant. */
export const reading = (time: number): Reading => {
  const said: Record<string, number> = {};
  for (const { type, value } of FACE.formatToParts(new Date(time))) {
    if (type !== 'literal') said[type] = Number(value);
  }
  return {
    year: said.year,
    month: said.month,
    day: said.day,
    // Midnight comes back as 24 from some engines under hour12: false.
    hour: said.hour % 24,
    minute: said.minute,
    second: said.second,
  };
};

/** How far the zone is ahead of UTC at a given instant, in minutes. */
const offsetAt = (time: number) => {
  const said = reading(time);
  const flat = Date.UTC(said.year, said.month - 1, said.day, said.hour, said.minute, said.second);
  return (flat - Math.floor(time / 1000) * 1000) / 60000;
};

/**
 * The instant at which the clock there says this.
 *
 * The offset depends on the answer, so it is asked twice: once at the reading
 * taken as though it were UTC - never more than a couple of hours out, which
 * is close enough to land in the right side of a changeover in every case but
 * one - and once at the answer that gives. The exception is the hour that does
 * not exist, the one skipped on the last Sunday in March, and it comes out as
 * the hour after it, which is what setting that time on a real clock does too.
 * The hour that happens TWICE, in October, resolves to the second of them -
 * unavoidably, since a wall clock cannot tell them apart either, and nothing
 * in this tool can see the difference between two skies an hour apart at half
 * past two in the morning.
 */
export const momentOf = (want: Omit<Reading, 'second'>): number => {
  const flat = Date.UTC(want.year, want.month - 1, want.day, want.hour, want.minute, 0);
  const near = flat - offsetAt(flat) * 60000;
  return flat - offsetAt(near) * 60000;
};

/** The same day there, at a different hour of it. */
export const atHour = (time: number, hour: number, minute = 0) => {
  const said = reading(time);
  return momentOf({ ...said, hour, minute });
};
