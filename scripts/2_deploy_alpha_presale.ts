import { ethers } from 'hardhat';
import { Overrides } from 'ethers';
import { parseBigNumber, parseWallet, parseEthAddress } from '../test/shared/parser';
import { USDCAddress as _USDCAddress } from '../test/shared/utilities';
import { HybridToken__factory } from '../typechain/factories/HybridToken__factory';
import { AlphaPresale__factory } from '../typechain/factories/AlphaPresale__factory';
import { requestConfirmation } from '../test/shared/utilities';

const _overrides: Overrides = {
  gasLimit: 7000029,
};

async function main() {
  const wallet = parseWallet('PRIVATE_KEY');
  const gasPrice = parseBigNumber('GAS_PRICE_GWEI', 9);
  const SHBTAddress = parseEthAddress('SHBT');
  const duration = parseBigNumber('PRESALE_DURATION', 0);

  const overrides: Overrides = { ..._overrides, gasPrice: gasPrice };
  console.log('Network:', (await ethers.provider.getNetwork()).name);

  let USDCAddress = _USDCAddress;
  if (USDCAddress === ethers.constants.AddressZero) {
    const USDC = await new HybridToken__factory(wallet).deploy(
      'USDC Testnet',
      'USDC',
      await wallet.getAddress(),
      '1000000000000000000000',
      overrides,
    );
    USDCAddress = USDC.address;
  }

  console.log(`USDC address: ${USDCAddress}`);
  console.log(`sHBT address: ${SHBTAddress}`);
  console.log(`Deploy Wallet: ${await wallet.getAddress()}`);

  await requestConfirmation();

  console.log('Deploy Alpha Presale');
  const alphaPresale = await new AlphaPresale__factory(wallet).deploy(USDCAddress, SHBTAddress, duration, overrides);
  console.log(`\x1b[32m${alphaPresale.address}\x1b[0m`);
  console.log(`Waiting for result of: \x1b[36m${alphaPresale.deployTransaction.hash}\x1b[0m`);
  await alphaPresale.deployTransaction.wait();
  console.log('Success');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
