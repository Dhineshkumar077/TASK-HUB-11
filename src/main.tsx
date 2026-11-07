import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle Vite WebSocket and HMR connection rejections cleanly
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = reason?.message || String(reason || '');
  if (
    msg.includes('WebSocket') ||
    msg.includes('websocket') ||
    msg.includes('failed to connect to websocket')
  ) {
    event.preventDefault();
  }
});

// Google Maps Platform Quota Defense & Global Error Tap
(window as any).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
};
const origError = console.error;
console.error = (...args: unknown[]) => {
  const msg = args.map((a) => String(a)).join(' ');
  // Suppress Vite WebSocket closed without opened in cloud/preview runtimes
  if (
    msg.includes('[vite] failed to connect to websocket') ||
    msg.includes('WebSocket closed without opened')
  ) {
    return;
  }
  origError.apply(console, args);
  if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
};

createRoot(document.getElementById('root')!).render(<App />);
