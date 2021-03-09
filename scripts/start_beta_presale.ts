import { ethers } from 'hardhat';
import { Overrides } from 'ethers';
import { parseBigNumber, parseEthAddress, parseWallet } from '../test/shared/parser';
import { BetaPresale__factory } from '../typechain/factories/BetaPresale__factory';
import { requestConfirmation } from '../test/shared/utilities';

async function main() {
  console.log(`
***************************
*** Start Beta Presale ***
***************************
`);
  const wallet = parseWallet('PRIVATE_KEY');
  const gasPrice = parseBigNumber('GAS_PRICE_GWEI', 9);
  const betaPresaleAddress = parseEthAddress('BETA_PRESALE');
  const overrides: Overrides = { gasPrice: gasPrice };

  const betaPresale = BetaPresale__factory.connect(betaPresaleAddress, wallet);

  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log(`Beta Presale address: ${betaPresaleAddress}`);
  await requestConfirmation();

  console.log('Start Beta Presale');
  const tx = await betaPresale.start(overrides);
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
