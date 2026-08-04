import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useStore } from './store';
import { walkInput } from './lib/walkInput';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

// A handle on the store while developing. Nearly all of this app's state ends
// up as pixels on a canvas, so there is otherwise nothing to read it off - not
// from the console, and not from a browser driving the page. Stripped from the
// production bundle.
if (import.meta.env.DEV) {
  const debug = window as unknown as { __store: typeof useStore; __walk: typeof walkInput };
  debug.__store = useStore;
  debug.__walk = walkInput;
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
