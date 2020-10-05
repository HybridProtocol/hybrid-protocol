import { ethers } from '@nomiclabs/buidler';
import { SaleHybridTokenFactory } from '../typechain/SaleHybridTokenFactory';
import { Erc20Factory } from '../typechain/Erc20Factory';
import { AlphaPresaleFactory } from '../typechain/AlphaPresaleFactory';
import { BetaPresaleFactory } from '../typechain/BetaPresaleFactory';
import { GammaPresaleFactory } from '../typechain/GammaPresaleFactory';

async function main() {
  const account = (await ethers.getSigners())[0];
  const sHBT = await new SaleHybridTokenFactory(account).deploy();
  console.log(`Deployed SaleHybridToken contract to: ${sHBT.address}`);
  const USDC = await new Erc20Factory(account).deploy('USDC', 'USDC');
  console.log(`Deployed USDC contract to: ${USDC.address}`);
  const alphaPresale = await new AlphaPresaleFactory(account).deploy(USDC.address, sHBT.address);
  console.log(`Deployed AlphaPresale contract to: ${alphaPresale.address}`);
  const betaPresale = await new BetaPresaleFactory(account).deploy(USDC.address, sHBT.address);
  console.log(`Deployed BetaPresale contract to: ${betaPresale.address}`);
  const gammaPresale = await new GammaPresaleFactory(account).deploy(USDC.address, sHBT.address);
  console.log(`Deployed GammaPresale contract to: ${gammaPresale.address}`);
  const tx = await gammaPresale.mintPresale();
  await tx.wait();
  console.log('Tokens for A/B/G-presales were minted');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
