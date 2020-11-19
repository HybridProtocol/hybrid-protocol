import { ethers } from 'hardhat';
import { Overrides } from 'ethers';
import { parseBigNumber, parseWallet } from '../test/shared/parser';
import { HybridToken__factory } from '../typechain/factories/HybridToken__factory';
import { parseEther } from 'ethers/lib/utils';
import { requestConfirmation } from '../test/shared/utilities';

const _overrides: Overrides = {
  gasLimit: 7000029,
};

async function main() {
  const wallet = parseWallet('PRIVATE_KEY');
  const gasPrice = parseBigNumber('GAS_PRICE_GWEI', 9);
  const totalSupplyHBT = parseEther('HBT_TOTAL_SUPPLY');
  const overrides: Overrides = { ..._overrides, gasPrice: gasPrice };

  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log(`Total supply HBT: ${totalSupplyHBT}`);
  console.log(`Deploy Wallet: ${await wallet.getAddress()}`);

  await requestConfirmation();

  console.log('Deploy HBT');
  const HBT = await new HybridToken__factory(wallet).deploy(
    'Hybrid Token',
    'HBT',
    await wallet.getAddress(),
    totalSupplyHBT,
    overrides,
  );
  console.log(`\x1b[32m${HBT.address}\x1b[0m`);
  console.log(`Waiting for result of: \x1b[36m${HBT.deployTransaction.hash}\x1b[0m`);
  await HBT.deployTransaction.wait();
  console.log('Success');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
