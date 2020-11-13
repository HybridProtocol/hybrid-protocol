import { Contract, Signer } from 'ethers';
import { SaleHybridToken } from '../../typechain/SaleHybridToken';
import { AlphaPresale } from '../../typechain/AlphaPresale';
import { BetaPresale } from '../../typechain/BetaPresale';
import { GammaPresale } from '../../typechain/GammaPresale';
import { SaleHybridTokenFactory } from '../../typechain/SaleHybridTokenFactory';
import { AlphaPresaleFactory } from '../../typechain/AlphaPresaleFactory';
import { BetaPresaleFactory } from '../../typechain/BetaPresaleFactory';
import { GammaPresaleFactory } from '../../typechain/GammaPresaleFactory';
import { HybridTokenFactory } from '../../typechain/HybridTokenFactory';
import { expandTo18Decimals } from '../shared/utilities';

export interface PresaleFixture {
  USDC: Contract;
  sHBT: SaleHybridToken;
  alphaPresale: AlphaPresale;
  betaPresale: BetaPresale;
  gammaPresale: GammaPresale;
}

export const presaleDuration = 25; // blocks
const overrides = {
  gasLimit: 9999999,
  gasPrice: 1,
};
const USDCDeployParams = {
  name: 'USDC',
  symbol: 'USDC',
  initialBalance: expandTo18Decimals(10000000),
};

export async function presaleFixture([wallet]: Signer[]): Promise<PresaleFixture> {
  const USDC = await new HybridTokenFactory(wallet).deploy(
    USDCDeployParams.name,
    USDCDeployParams.symbol,
    await wallet.getAddress(),
    USDCDeployParams.initialBalance,
    overrides,
  );
  const sHBT = await new SaleHybridTokenFactory(wallet).deploy(overrides);
  const alphaPresale = await new AlphaPresaleFactory(wallet).deploy(
    USDC.address,
    sHBT.address,
    presaleDuration,
    overrides,
  );
  const betaPresale = await new BetaPresaleFactory(wallet).deploy(
    USDC.address,
    sHBT.address,
    presaleDuration,
    overrides,
  );
  const gammaPresale = await new GammaPresaleFactory(wallet).deploy(
    USDC.address,
    sHBT.address,
    presaleDuration,
    overrides,
  );
  return {
    USDC,
    sHBT,
    alphaPresale,
    betaPresale,
    gammaPresale,
  };
}
