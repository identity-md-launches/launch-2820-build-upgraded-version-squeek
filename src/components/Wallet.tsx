import { useState } from 'react';
import { useConnection, useConnect, useConnectors, useDisconnect, useSwitchChain, type Connector } from 'wagmi';
import { Wallet, ChevronDown, ExternalLink, LogOut } from 'lucide-react';
import { getAddress } from 'viem';
import { sepolia } from 'wagmi/chains';
import { Modal } from './Modal';
import { OPEN_IN, isMobileBrowser } from '../lib/open-in';
import { explorerAddress, friendlyError, shortAddress } from '../lib/chain';

const mark = (id: string) => `${import.meta.env.BASE_URL}wallets/${id}.svg`;

export function WalletControl() {
  const account = useConnection();
  const connect = useConnect();
  const connectors = useConnectors();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const [open, setOpen] = useState(false);
  const mobile = isMobileBrowser();
  const named = connectors.some((c) => c.type === 'injected' && c.id !== 'injected');
  const listed = [...connectors.filter((c) => c.type === 'injected'), ...connectors.filter((c) => c.type !== 'injected')].filter((c) => !(named && c.id === 'injected') && !(mobile && c.type === 'injected'));
  const label = (c: Connector) => c.id === 'injected' ? 'Browser wallet' : c.id === 'coinbaseWalletSDK' ? mobile ? 'Coinbase Smart Wallet' : 'Coinbase Wallet' : c.name;
  const isWrong = account.isConnected && account.chainId !== sepolia.id;
  return <>
    <button className="wallet-control" onClick={() => { connect.reset(); switchChain.reset(); setOpen(true); }}>
      <Wallet size={17} /><span>{account.isConnected && account.address ? isWrong ? 'Switch to Sepolia' : shortAddress(getAddress(account.address)) : 'Connect'}<span className="desktop-word">{!account.isConnected ? ' wallet' : ''}</span></span>{account.isConnected && <ChevronDown size={15} />}
    </button>
    {open && <Modal title={account.isConnected ? 'Your wallet' : 'Connect a wallet'} onClose={() => setOpen(false)}>
      {account.isConnected && account.address ? <>
        <p className="muted">Connected wallet</p><p className="full-value">{getAddress(account.address)}</p>
        {isWrong && <><p className="notice">Switch to Ethereum Sepolia to vote. Voting uses test ETH for the network fee.</p><button className="primary full" disabled={switchChain.isPending} onClick={() => switchChain.mutate({ chainId: sepolia.id })}>{switchChain.isPending ? 'Switching network…' : 'Switch to Sepolia'}</button></>}
        {switchChain.error && <p role="alert" className="error-text">{friendlyError(switchChain.error)}</p>}
        <a className="wallet-row" href={explorerAddress(account.address)} target="_blank" rel="noreferrer"><ExternalLink size={20} />View wallet on Etherscan</a>
        <button className="wallet-row" onClick={() => { disconnect.mutate(); setOpen(false); }}><LogOut size={20} />Disconnect</button>
      </> : <>
        <p className="modal-description">A wallet lets you record a vote on Ethereum Sepolia. You can read and preview the story without one.</p>
        <div className="wallet-list">
          {mobile && OPEN_IN.map((w) => <a key={w.id} className="wallet-row" href={w.href(location.href)}><img width="28" height="28" src={mark(w.id)} alt="" /><span>Open in {w.name}</span><ExternalLink size={16} /></a>)}
          {listed.map((c) => <button key={c.uid} className="wallet-row" disabled={connect.isPending} onClick={() => connect.mutate({ connector: c }, { onSuccess: () => setOpen(false) })}>
            {c.icon ? <img width="28" height="28" src={c.icon} alt="" /> : c.id === 'coinbaseWalletSDK' ? <img width="28" height="28" src={mark('coinbase')} alt="" /> : <Wallet size={28} />}
            <span>{label(c)}{connect.isPending && connect.variables?.connector === c ? ' · opening…' : ''}</span>
          </button>)}
        </div>
        {connect.error && <p role="alert" className="error-text">{friendlyError(connect.error)}</p>}
        <p className="small muted">No wallet installed? Coinbase can create a passkey wallet. Mobile app links open this page in your wallet’s browser.</p>
      </>}
    </Modal>}
  </>;
}
