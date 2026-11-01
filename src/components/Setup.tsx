import { useState } from 'react';
import { useConnection, useDeployContract, usePublicClient } from 'wagmi';
import { type Abi, type Hex } from 'viem';
import { ArrowRight, Download, ExternalLink } from 'lucide-react';
import { explorerTx, friendlyError } from '../lib/chain';
import type { CoreFeed, SiteConfig } from '../lib/types';

export function Setup({ feed, config }: { feed?: CoreFeed; config: SiteConfig }) {
  const account = useConnection();
  const client = usePublicClient();
  const deploy = useDeployContract();
  const [error, setError] = useState('');
  const [result, setResult] = useState<SiteConfig | null>(null);
  const [working, setWorking] = useState(false);
  const [agreed, setAgreed] = useState(false);
  async function doDeploy() {
    if (!account.address || account.chainId !== 11155111 || !feed || !client || !agreed) return;
    setWorking(true); setError('');
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}contracts/SqueekTalesVoting.json`);
      if (!response.ok) throw new Error(`Contract artifact returned HTTP ${response.status}.`);
      const artifact = await response.json() as { abi: Abi; bytecode: Hex };
      const hash = await deploy.mutateAsync({ abi: artifact.abi, bytecode: artifact.bytecode, args: [feed.identities.core], chainId: 11155111 });
      const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 2, timeout: 180000 });
      if (receipt.status !== 'success' || !receipt.contractAddress) throw new Error('The deployment did not succeed. Check the transaction on Etherscan.');
      setResult({ ...config, votingAddress: receipt.contractAddress, votingDeploymentBlock: receipt.blockNumber.toString(), expectedCore: feed.identities.core });
    } catch (e) { setError(friendlyError(e)); } finally { setWorking(false); }
  }
  function download() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2) + '\n'], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'config.json'; a.click(); URL.revokeObjectURL(url);
  }
  return <section className="setup-section" id="setup" aria-labelledby="setup-heading">
    <details><summary id="setup-heading">{config.votingAddress ? 'Voting contract & deployment' : 'For the story keeper: enable on-chain voting'}<ArrowRight size={16} /></summary>
      <div className="setup-content"><p>{config.votingAddress ? 'This site is configured with a Sepolia voting contract. Its identity and round clock are checked before voting.' : 'The voting contract has not been deployed. A funded Sepolia wallet is required. The source, ABI and compiled bytecode are included; no private key is needed by this site.'}</p>
      {config.votingAddress ? <p className="full-value">{config.votingAddress}</p> : <>
        <p>Connect a deployer wallet, switch to Sepolia, and review the deployment in your wallet. Then download the resulting configuration, replace <code>public/config.json</code>, and rebuild the site to enable voting for everyone.</p>
        <p className="small">Official core discovered from the API: <span className="full-value">{feed?.identities.core ?? 'Waiting for the official feed.'}</span></p>
        <label className="check-label"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />I intend to deploy this voting contract and pay the Sepolia network fee.</label>
        <button className="secondary" disabled={!feed || !account.isConnected || account.chainId !== 11155111 || working || !agreed} onClick={() => void doDeploy()}>{working ? 'Waiting for deployment…' : 'Deploy voting contract' }<ArrowRight size={16} /></button>
        {deploy.data && <a className="full-value small" href={explorerTx(deploy.data)} target="_blank" rel="noreferrer">{deploy.data}<ExternalLink size={14} /></a>}
        {result && <><p role="status">Contract deployed and confirmed. Download its configuration and rebuild to activate it.</p><button className="secondary" onClick={download}><Download size={16} />Download config.json</button></>}
        {error && <p className="error-text" role="alert">{error}</p>}
      </>}
      <a className="text-link" href={`${import.meta.env.BASE_URL}contracts/SqueekTalesVoting.json`} download>Download ABI & bytecode<Download size={14} /></a>
      </div>
    </details>
  </section>;
}
