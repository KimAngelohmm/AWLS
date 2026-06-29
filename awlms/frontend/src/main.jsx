import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './sunnies-theme.css';
import './index.css';
import './admin-layout.css';
import './verification-page.css';
import './register-page.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
