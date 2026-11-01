import { createConfig, http, fallback } from 'wagmi';
import { coinbaseWallet, injected } from 'wagmi/connectors';
import { sepolia } from 'wagmi/chains';
import { isAddress } from 'viem';
import type { SiteConfig } from './types';

export async function loadConfig(): Promise<SiteConfig> {
  const response = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Site configuration could not load (HTTP ${response.status}). Reload to retry.`);
  const config = await response.json();
  if (config.chainId !== sepolia.id || !/^https:\/\//.test(config.rpcUrl) || !/^https:\/\//.test(config.apiUrl)) throw new Error('The site configuration is invalid. Sepolia and HTTPS endpoints are required.');
  for (const key of ['votingAddress', 'expectedCore']) if (config[key] !== null && (!isAddress(config[key]) || /^0x0{40}$/i.test(config[key]))) throw new Error(`Invalid ${key} in config.json.`);
  if (config.votingAddress && (!config.expectedCore || !/^[1-9]\d*$/.test(config.votingDeploymentBlock ?? ''))) throw new Error('A voting deployment needs its real core address and deployment block in config.json.');
  return config;
}

export const makeWalletConfig = (config: SiteConfig) => createConfig({
  chains: [sepolia],
  multiInjectedProviderDiscovery: true,
  connectors: [injected(), coinbaseWallet({ appName: 'Squeek Tales', appLogoUrl: new URL(`${import.meta.env.BASE_URL}favicon.svg`, location.href).href, preference: { options: 'all' } })],
  transports: { [sepolia.id]: fallback([http(config.rpcUrl, { timeout: 12000 }), http('https://rpc.sepolia.org', { timeout: 12000 })]) },
});
