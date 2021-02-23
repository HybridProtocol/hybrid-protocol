import { ethers } from 'hardhat';
import { Overrides } from 'ethers';
import { parseBigNumber, parseEthAddress, parseWallet } from '../test/shared/parser';
import { SaleHybridToken__factory } from '../typechain/factories/SaleHybridToken__factory';
import { requestConfirmation } from '../test/shared/utilities';

async function main() {
  console.log(`
***************************
*** Mint sHBT for presales contracts ***
***************************
`);
  const wallet = parseWallet('PRIVATE_KEY');
  const gasPrice = parseBigNumber('GAS_PRICE_GWEI', 9);
  const SHBTAddress = parseEthAddress('SHBT');
  const alphaPresaleAddress = parseEthAddress('ALPHA_PRESALE');
  const betaPresaleAddress = parseEthAddress('BETA_PRESALE');
  const gammaPresaleAddress = parseEthAddress('GAMMA_PRESALE');
  const overrides: Overrides = { gasPrice: gasPrice };

  const SHBT = SaleHybridToken__factory.connect(SHBTAddress, wallet);

  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log(`Alpha Presale address: ${alphaPresaleAddress}`);
  console.log(`Beta Presale address: ${betaPresaleAddress}`);
  console.log(`Gamma Presale address: ${gammaPresaleAddress}`);
  await requestConfirmation();

  console.log('Minting sHBT for presales');
  const tx = await SHBT.mintForPresales(alphaPresaleAddress, betaPresaleAddress, gammaPresaleAddress, overrides);
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
