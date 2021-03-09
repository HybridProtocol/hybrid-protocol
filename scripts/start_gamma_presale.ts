import { ethers } from 'hardhat';
import { Overrides } from 'ethers';
import { parseBigNumber, parseEthAddress, parseWallet } from '../test/shared/parser';
import { GammaPresale__factory } from '../typechain/factories/GammaPresale__factory';
import { requestConfirmation } from '../test/shared/utilities';

async function main() {
  console.log(`
***************************
*** Start Gamma Presale ***
***************************
`);
  const wallet = parseWallet('PRIVATE_KEY');
  const gasPrice = parseBigNumber('GAS_PRICE_GWEI', 9);
  const gammaPresaleAddress = parseEthAddress('GAMMA_PRESALE');
  const overrides: Overrides = { gasPrice: gasPrice };

  const gammaPresale = GammaPresale__factory.connect(gammaPresaleAddress, wallet);

  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log(`Gamma Presale address: ${gammaPresaleAddress}`);
  await requestConfirmation();

  console.log('Start Gamma Presale');
  const tx = await gammaPresale.start(overrides);
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
