import hre, { ethers } from 'hardhat';
import { BigNumber, Overrides, utils } from 'ethers';
import { parseBigNumber, parseWallet, parseETH, parseEthAddress } from '../test/shared/parser';
import { TToken__factory } from '../typechain/factories/TToken__factory';

const _overrides: Overrides = {
  gasLimit: 7000029,
};

async function main() {
  let tx;
  const wallet = parseWallet('PRIVATE_KEY');
  const gasPrice = parseBigNumber('GAS_PRICE_GWEI', 9);
  const alice = parseEthAddress('TESTNET_ALICE');
  const supply = parseETH('HBT_TOTAL_SUPPLY');
  const overrides: Overrides = { ..._overrides, gasPrice: gasPrice };
  console.log('Network:', (await ethers.provider.getNetwork()).name);

  console.log('Deploy USDC');
  const USDC = await new TToken__factory(wallet).deploy('USDC Testnet', 'USDC', BigNumber.from(6), overrides);
  console.log(`\x1b[32m${USDC.address}\x1b[0m`);
  console.log(`Waiting for result of: \x1b[36m${USDC.deployTransaction.hash}\x1b[0m`);
  await USDC.deployTransaction.wait();
  console.log('USDC token was successfully deployed');

  console.log('Start minting to the Alice wallet');
  tx = await USDC.connect(wallet).mint(alice, supply);
  console.log(`Waiting for result of: \x1b[36m${tx.hash}\x1b[0m`);
  await tx.wait();

  console.log('Success');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
