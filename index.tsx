import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useStore } from './store';
import { walkInput } from './lib/walkInput';
import { pickGround, pickObject, project, projectView } from './lib/pick';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

// A handle on the store while developing. Nearly all of this app's state ends
// up as pixels on a canvas, so there is otherwise nothing to read it off - not
// from the console, and not from a browser driving the page. Stripped from the
// production bundle.
//
// The picker is here for the same reason and one more: a test that wants to tap
// a chair has to be told where on the glass the chair is, and only the
// projection knows. Reaching for the module from outside is not the same thing
// - a dev server that has hot-reloaded the file hands out a second copy of it,
// with nothing registered in it - so the running app publishes its own.
if (import.meta.env.DEV) {
  const debug = window as unknown as {
    __store: typeof useStore;
    __walk: typeof walkInput;
    __pick: {
      project: typeof project;
      projectView: typeof projectView;
      pickObject: typeof pickObject;
      pickGround: typeof pickGround;
    };
  };
  debug.__store = useStore;
  debug.__walk = walkInput;
  debug.__pick = { project, projectView, pickObject, pickGround };
}

// The page saved to a phone's home screen should open like an app: instantly,
// and without asking the network first. The rules live in public/sw.js. Not in
// dev - a worker caching hashed assets over a server that rewrites them on
// every save would be a bug factory.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // A browser that refuses (private mode does) gets the plain page.
    });
  });
}

/*
 * PAINT THE MOUNT BEFORE REACT DOES.
 *
 * index.html carries one hardcoded colour for the page and the status bar, and
 * it has to: it is served before any of this runs. The app then mounts on the
 * opening page, whose mount is flat black, and a launch that paints a warm
 * near-white and snaps to near-black on the first React commit is a blink under
 * the Safari chrome and the ENTIRE SCREEN when it is opened from the home
 * screen, every time, as the first thing the tool ever shows you.
 *
 * It mattered more when the page was dealt off a deck whose sheets run from 18
 * to 252, and it still matters with one fixed page, because the fixed page is
 * not the colour in the HTML either. A stored setup can move it again.
 *
 * The page is already decided by the time this module runs - `store.ts` settles
 * it at evaluation - so the colour is simply written now, before the root is
 * created and therefore before anything is painted. App.tsx goes on keeping the
 * bar in step with the live page from an effect; this is only about the gap
 * before there is a live page to be in step with.
 *
 * The MOUNT rather than the sheet, because the mount is what is behind
 * everything - the sheet has the drawing on it and does not reach the edges.
 */
{
  const opening = useStore.getState();
  const tone = opening.backdrop === 'paper' ? opening.backgroundGray : opening.backdrop;
  const hex = `#${[tone, tone, tone].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
  document.documentElement.style.backgroundColor = hex;
  document.body.style.backgroundColor = hex;
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute('content', hex));
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
