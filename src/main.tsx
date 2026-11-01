import React, { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-600.css';
import './styles.css';
import App from './App';
import { loadConfig, makeWalletConfig } from './lib/config';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="boot-screen"><img src="./favicon.svg" width="64" height="64" alt="Pip the hamster" /><h1>The story needs a moment.</h1><p>Something stopped this page from opening. Reload to try again.</p><button className="primary" onClick={() => location.reload()}>Reload the story</button></div> : this.props.children; }
}

const root = createRoot(document.getElementById('root')!);
root.render(<div className="boot-screen" role="status"><img src="./favicon.svg" width="64" height="64" alt="" /><h1>Opening the storybook…</h1></div>);
loadConfig().then((config) => {
  const query = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true } } });
  root.render(<React.StrictMode><ErrorBoundary><WagmiProvider config={makeWalletConfig(config)}><QueryClientProvider client={query}><App config={config} /></QueryClientProvider></WagmiProvider></ErrorBoundary></React.StrictMode>);
}).catch((error: Error) => root.render(<div className="boot-screen"><img src="./favicon.svg" width="64" height="64" alt="Pip the hamster" /><h1>The story needs a moment.</h1><p>{error.message}</p><button className="primary" onClick={() => location.reload()}>Reload the story</button></div>));
