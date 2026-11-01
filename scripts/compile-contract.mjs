import fs from 'node:fs';
import solc from 'solc';

const file = 'contracts/SqueekTalesVoting.sol';
const input = { language: 'Solidity', sources: { [file]: { content: fs.readFileSync(file, 'utf8') } }, settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'paris', outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } } } };
const output = JSON.parse(solc.compile(JSON.stringify(input)));
for (const error of output.errors ?? []) {
  if (error.severity === 'error') throw new Error(error.formattedMessage);
  console.warn(error.formattedMessage);
}
const c = output.contracts[file].SqueekTalesVoting;
const artifact = { contractName: 'SqueekTalesVoting', compiler: solc.version(), chainId: 11155111, abi: c.abi, bytecode: `0x${c.evm.bytecode.object}`, deployedBytecode: `0x${c.evm.deployedBytecode.object}` };
fs.mkdirSync('public/contracts', { recursive: true });
fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('public/contracts/SqueekTalesVoting.json', JSON.stringify(artifact, null, 2) + '\n');
fs.writeFileSync('artifacts/SqueekTalesVoting.abi.json', JSON.stringify(c.abi, null, 2) + '\n');
fs.writeFileSync('artifacts/SqueekTalesVoting.bytecode.txt', artifact.bytecode + '\n');
console.log(`Compiled SqueekTalesVoting: ${c.evm.bytecode.object.length / 2} bytes, ${solc.version()}`);
