import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AccountApp from './cloud/AccountApp';
import { LanguageProvider } from './i18n';
import './styles.css';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AccountApp />
    </LanguageProvider>
  </StrictMode>,
);
