
import React from 'react';
import { createRoot } from 'react-dom/client';
import './globals.css';
import App from './App';

console.log("index.tsx: Script loaded");

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
