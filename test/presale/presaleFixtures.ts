import { Contract, Signer } from 'ethers';
import { SaleHybridToken } from '../../typechain/SaleHybridToken';
import { AlphaPresale } from '../../typechain/AlphaPresale';
import { BetaPresale } from '../../typechain/BetaPresale';
import { GammaPresale } from '../../typechain/GammaPresale';
import { AlphaPresale__factory } from '../../typechain/factories/AlphaPresale__factory';
import { BetaPresale__factory } from '../../typechain/factories/BetaPresale__factory';
import { GammaPresale__factory } from '../../typechain/factories/GammaPresale__factory';
import { HybridToken__factory } from '../../typechain/factories/HybridToken__factory';
import { SaleHybridToken__factory } from '../../typechain/factories/SaleHybridToken__factory';
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
  const USDC = await new HybridToken__factory(wallet).deploy(
    USDCDeployParams.name,
    USDCDeployParams.symbol,
    await wallet.getAddress(),
    USDCDeployParams.initialBalance,
    overrides,
  );
  const sHBT = await new SaleHybridToken__factory(wallet).deploy(overrides);
  const alphaPresale = await new AlphaPresale__factory(wallet).deploy(
    USDC.address,
    sHBT.address,
    presaleDuration,
    overrides,
  );
  const betaPresale = await new BetaPresale__factory(wallet).deploy(
    USDC.address,
    sHBT.address,
    presaleDuration,
    overrides,
  );
  const gammaPresale = await new GammaPresale__factory(wallet).deploy(
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
