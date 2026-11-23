import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

(window as unknown as Record<string, unknown>).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
};

const _origConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  _origConsoleError(...args);
  if (
    args.some(
      (a) =>
        typeof a === 'string' &&
        (a.includes('OverQuotaMapError') || a.includes('QuotaExceededError'))
    )
  ) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
};

createRoot(document.getElementById('root')!).render(<App />);

