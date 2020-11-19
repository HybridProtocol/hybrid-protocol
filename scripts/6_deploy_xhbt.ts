import { ethers } from 'hardhat';
import { Overrides } from 'ethers';
import { parseBigNumber, parseWallet } from '../test/shared/parser';
import { IndexHybridToken__factory } from '../typechain/factories/IndexHybridToken__factory';
import { parseEther } from 'ethers/lib/utils';
import { requestConfirmation } from '../test/shared/utilities';

const _overrides: Overrides = {
  gasLimit: 7000029,
};

async function main() {
  const wallet = parseWallet('PRIVATE_KEY');
  const gasPrice = parseBigNumber('GAS_PRICE_GWEI', 9);
  const initSupplyXHBT = parseEther('XHBT_INIT_SUPPLY');
  const maxSupplyXHBT = parseEther('MAX_XHBT_TOTAL_SUPPLY');
  const overrides: Overrides = { ..._overrides, gasPrice: gasPrice };

  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log(`Initial supply xHBT: ${initSupplyXHBT}`);
  console.log(`Maximum supply xHBT: ${maxSupplyXHBT}`);
  console.log(`Deploy Wallet: ${await wallet.getAddress()}`);

  await requestConfirmation();

  console.log('Deploy xHBT');
  const XHBT = await new IndexHybridToken__factory(wallet).deploy(initSupplyXHBT, maxSupplyXHBT, overrides);
  console.log(`\x1b[32m${XHBT.address}\x1b[0m`);
  console.log(`Waiting for result of: \x1b[36m${XHBT.deployTransaction.hash}\x1b[0m`);
  await XHBT.deployTransaction.wait();
  console.log('Success');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
