import { ethers } from 'hardhat';
import { Overrides } from 'ethers';
import { parseBigNumber, parseWallet, parseEthAddress } from '../test/shared/parser';
import { USDCAddress as _USDCAddress } from '../test/shared/utilities';
import { VestingSwap__factory } from '../typechain/factories/VestingSwap__factory';
import { requestConfirmation } from '../test/shared/utilities';

const _overrides: Overrides = {
  gasLimit: 7000029,
};

async function main() {
  const wallet = parseWallet('PRIVATE_KEY');
  const gasPrice = parseBigNumber('GAS_PRICE_GWEI', 9);
  const HBTAddress = parseEthAddress('HBT');
  const alphaPresaleAddress = parseEthAddress('ALPHA_PRESALE');
  const betaPresaleAddress = parseEthAddress('BETA_PRESALE');
  const gammaPresaleAddress = parseEthAddress('GAMMA_PRESALE');

  const overrides: Overrides = { ..._overrides, gasPrice: gasPrice };

  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log(`HBT address: ${HBTAddress}`);
  console.log(`Alpha Presale address: ${alphaPresaleAddress}`);
  console.log(`Beta Presale address: ${betaPresaleAddress}`);
  console.log(`Gamma Presale address: ${gammaPresaleAddress}`);

  await requestConfirmation();

  console.log('Deploy Vesting Swap');
  const vestingSwap = await new VestingSwap__factory(wallet).deploy(
    alphaPresaleAddress,
    betaPresaleAddress,
    gammaPresaleAddress,
    HBTAddress,
    overrides,
  );
  console.log(`\x1b[32m${vestingSwap.address}\x1b[0m`);
  console.log(`Waiting for result of: \x1b[36m${vestingSwap.deployTransaction.hash}\x1b[0m`);
  await vestingSwap.deployTransaction.wait();
  console.log('Success');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
