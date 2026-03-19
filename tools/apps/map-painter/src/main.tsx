import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { registerTestStore } from '@vulkan-game-tools/test-harness/register';
import { useMapStore } from './store/useMapStore.js';

if (import.meta.env.DEV) {
  registerTestStore(useMapStore);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
