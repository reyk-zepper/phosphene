import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { LandingPage } from './LandingPage';
import { getAppRoute } from './routing';
import '@/styles/globals.css';
import '@/styles/graph.css';

const root = getAppRoute(window.location.pathname, import.meta.env.BASE_URL) === 'landing' ? <LandingPage /> : <App />;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {root}
  </React.StrictMode>
);
