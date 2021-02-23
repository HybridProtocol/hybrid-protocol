import { ethers } from 'hardhat';
import { Overrides } from 'ethers';
import { parseBigNumber, parseEthAddress, parseWallet } from '../test/shared/parser';
import { AlphaPresale__factory } from '../typechain/factories/AlphaPresale__factory';
import { requestConfirmation } from '../test/shared/utilities';

async function main() {
  console.log(`
***************************
*** Start Alpha Presale ***
***************************
`);
  const wallet = parseWallet('PRIVATE_KEY');
  const gasPrice = parseBigNumber('GAS_PRICE_GWEI', 9);
  const alphaPresaleAddress = parseEthAddress('ALPHA_PRESALE');
  const overrides: Overrides = { gasPrice: gasPrice };

  const alphaPresale = AlphaPresale__factory.connect(alphaPresaleAddress, wallet);

  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log(`Alpha Presale address: ${alphaPresaleAddress}`);
  await requestConfirmation();

  console.log('Start Alpha Presale');
  const tx = await alphaPresale.start(overrides);
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
