import { getProvider, callContract } from './skills/pharos-tracker/services/rpc.js';

const wallet = process.argv.find(a => a.startsWith('0x')) || '0x3e5fdbcbdeaeb5faffaba18332f39bc751af415d';

// Direct ethers send()
const provider = getProvider();
const addr = '0xc879c018db60520f4355c26ed1a6d572cdac1815';
const padded = '000000000000000000000000' + wallet.replace('0x', '').toLowerCase();
const raw1 = await provider.send('eth_call', [{ to: addr, data: '0x70a08231' + padded }, 'latest']);
console.log('Via send():    ', raw1);

// Via callContract()
const raw2 = await callContract(addr, '0x70a08231' + padded);
console.log('Via callContract:', raw2);

// Use provider.call()
const raw3 = await provider.call({ to: addr, data: '0x70a08231' + padded });
console.log('Via provider.call:', raw3);
