/**
 * main.tsx — browser entry point. Mounts <App /> into #root.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// StrictMode double-invokes some logic in development to surface side-effect bugs early.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
