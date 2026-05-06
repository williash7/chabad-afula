import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register service worker — auto-updates when new version is deployed
registerSW({
  onNeedRefresh() {
    // New content available — update silently on next navigation
    if (confirm('גרסה חדשה זמינה. לרענן?')) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log('האפליקציה מוכנה לעבודה אופליין');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
