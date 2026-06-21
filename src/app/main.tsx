import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { LandingPage } from './LandingPage';
import '@/styles/globals.css';
import '@/styles/graph.css';

const root = window.location.pathname.startsWith('/landing') ? <LandingPage /> : <App />;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {root}
  </React.StrictMode>
);
