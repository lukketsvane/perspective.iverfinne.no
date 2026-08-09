/**
 * Keep the screen on while the tool is in front of you.
 *
 * This app's whole job is to be propped up and drawn from, and a reference
 * that dims itself every minute is a reference you keep touching with a
 * charcoal hand. The lock holds only while the page is visible: the browser
 * releases it the moment the app is backgrounded or the phone is locked by
 * hand, and it is asked for again on the way back. Where the API does not
 * exist, nothing changes.
 */
let started = false;

export const keepAwake = () => {
  // Once for the life of the page - a second call (strict mode mounts twice)
  // would hold a second lock and re-request in pairs forever.
  if (started || !('wakeLock' in navigator)) return;
  started = true;

  let holding = false;
  const hold = async () => {
    if (holding || document.visibilityState !== 'visible') return;
    holding = true;
    try {
      const lock = await navigator.wakeLock.request('screen');
      // Released by the OS - backgrounded, or power pressed - not by us:
      // nothing here ever lets go on purpose while the page is up.
      lock.addEventListener('release', () => {
        holding = false;
      });
    } catch {
      // The OS said no - low power mode does. It is right, and it will be
      // asked again on the next return to the foreground.
      holding = false;
    }
  };

  hold();
  document.addEventListener('visibilitychange', hold);
};
