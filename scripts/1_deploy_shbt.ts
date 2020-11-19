import { ethers } from 'hardhat';
import { Overrides } from 'ethers';
import { parseBigNumber, parseWallet } from '../test/shared/parser';
import { SaleHybridToken__factory } from '../typechain/factories/SaleHybridToken__factory';

const _overrides: Overrides = {
  gasLimit: 7000029,
};

async function main() {
  const wallet = parseWallet('PRIVATE_KEY');
  const gasPrice = parseBigNumber('GAS_PRICE_GWEI', 9);
  const overrides: Overrides = { ..._overrides, gasPrice: gasPrice };
  console.log('Network:', (await ethers.provider.getNetwork()).name);

  console.log('Deploy sHBT');
  const SHBT = await new SaleHybridToken__factory(wallet).deploy(overrides);
  console.log(`\x1b[32m${SHBT.address}\x1b[0m`);
  console.log(`Waiting for result of: \x1b[36m${SHBT.deployTransaction.hash}\x1b[0m`);
  await SHBT.deployTransaction.wait();
  console.log('Success');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
