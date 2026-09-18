import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/providers';
import { SessionGate } from './app/SessionGate';
import { router } from './app/router';
import './styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <SessionGate>
        <RouterProvider router={router} />
      </SessionGate>
    </AppProviders>
  </StrictMode>,
);
