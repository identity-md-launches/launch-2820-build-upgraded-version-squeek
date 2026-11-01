import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import solc from 'solc';
import ganache from 'ganache';
import { createPublicClient, createWalletClient, custom, decodeEventLog } from 'viem';
import { sepolia } from 'viem/chains';

// In-memory test chain only. No machine accounts, real keys, or network signing.
export async function localChain() {
  const provider = ganache.provider({ chain: { chainId: 11155111, hardfork: 'shanghai' }, logging: { quiet: true }, wallet: { totalAccounts: 3 } });
  const rpcRequest = async (args) => {
    try { return await provider.request(args); }
    catch (error) {
      // Ganache uses -32000 for execution reverts; normalize its hex revert data to EIP-1474 code 3.
      if (typeof error.data === 'string' && error.data.startsWith('0x')) throw Object.assign(new Error(error.message), { code: 3, data: error.data });
      throw error;
    }
  };
  const publicClient = createPublicClient({ transport: custom({ request: rpcRequest }), chain: sepolia, pollingInterval: 20 });
  const accounts = await provider.request({ method: 'eth_accounts', params: [] });
  const wallet = createWalletClient({ account: accounts[0], transport: custom(provider), chain: sepolia });
  const source = fs.readFileSync('contracts/SqueekTalesVoting.sol', 'utf8');
  const mock = `pragma solidity ^0.8.28; import "Voting.sol"; contract MockCore { bool public paused; uint64 public genesis; constructor() { genesis = uint64(block.timestamp - 120); } function setPaused(bool value) external { paused = value; } function configuration() external view returns (ISqueekCore.CoreConfiguration memory c) { c.genesisTimestamp = genesis; c.roundDuration = 600; } }
  contract ReadBatch { struct Call3 { address target; bool allowFailure; bytes callData; } struct Result { bool success; bytes returnData; } function aggregate3(Call3[] calldata calls) external payable returns (Result[] memory results) { results = new Result[](calls.length); for (uint256 i; i < calls.length; i++) { (bool ok, bytes memory data) = calls[i].target.call(calls[i].callData); require(ok || calls[i].allowFailure); results[i] = Result(ok, data); } } }`;
  const output = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources: { 'Voting.sol': { content: source }, 'Mock.sol': { content: mock } }, settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'paris', outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } } } })));
  if (output.errors?.some((e) => e.severity === 'error')) throw new Error('Test contract compilation failed.');
  const core = output.contracts['Mock.sol'].MockCore;
  const voting = output.contracts['Voting.sol'].SqueekTalesVoting;
  const deploy = async (contract, args = []) => {
    const hash = await wallet.deployContract({ abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}`, args, gas: 3000000n });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    assert.equal(receipt.status, 'success');
    return receipt.contractAddress;
  };
  const coreAddress = await deploy(core);
  const address = await deploy(voting, [coreAddress]);
  // Only the ephemeral chain: provide real compiled aggregate3 behavior at viem's configured read-batch address.
  await provider.request({ method: 'evm_setAccountCode', params: [sepolia.contracts.multicall3.address, `0x${output.contracts['Mock.sol'].ReadBatch.evm.deployedBytecode.object}`] });
  return { provider, rpcRequest, publicClient, wallet, accounts, core, voting, coreAddress, address };
}

