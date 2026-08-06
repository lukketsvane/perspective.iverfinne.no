import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useStore } from './store';
import { walkInput } from './lib/walkInput';
import { pickGround, pickObject, project } from './lib/pick';
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
    __pick: { project: typeof project; pickObject: typeof pickObject; pickGround: typeof pickGround };
  };
  debug.__store = useStore;
  debug.__walk = walkInput;
  debug.__pick = { project, pickObject, pickGround };
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
