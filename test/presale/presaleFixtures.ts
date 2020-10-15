import { Wallet } from 'ethers';
import { Web3Provider } from 'ethers/providers';
import { SaleHybridToken } from '../../typechain/SaleHybridToken';
import { AlphaPresale } from '../../typechain/AlphaPresale';
import { BetaPresale } from '../../typechain/BetaPresale';
import { GammaPresale } from '../../typechain/GammaPresale';
import { PresaleConstants } from '../../typechain/PresaleConstants';
import { SaleHybridTokenFactory } from '../../typechain/SaleHybridTokenFactory';
import { AlphaPresaleFactory } from '../../typechain/AlphaPresaleFactory';
import { BetaPresaleFactory } from '../../typechain/BetaPresaleFactory';
import { GammaPresaleFactory } from '../../typechain/GammaPresaleFactory';
import { PresaleConstantsFactory } from '../../typechain/PresaleConstantsFactory';
import { HybridTokenFactory } from '../../typechain/HybridTokenFactory';
import { HybridToken } from '../../typechain/HybridToken';
import { expandTo18Decimals } from '../shared/utilities';

export interface PresaleFixture {
  testUSDC: HybridToken;
  sHBT: SaleHybridToken;
  presaleConstants: PresaleConstants;
  alphaPresale: AlphaPresale;
  betaPresale: BetaPresale;
  gammaPresale: GammaPresale;
}

const overrides = {
  gasLimit: 9999999,
  gasPrice: 1,
};
const testUSDCDeployParams = {
  name: 'USDC',
  symbol: 'USDC',
  initialBalance: expandTo18Decimals(10000000),
};

export async function presaleFixture(provider: Web3Provider, [wallet]: Wallet[]): Promise<PresaleFixture> {
  const testUSDC = await new HybridTokenFactory(wallet).deploy(
    testUSDCDeployParams.name,
    testUSDCDeployParams.symbol,
    wallet.address,
    testUSDCDeployParams.initialBalance,
    overrides,
  );
  const sHBT = await new SaleHybridTokenFactory(wallet).deploy(overrides);
  const presaleConstants = await new PresaleConstantsFactory(wallet).deploy(overrides);
  const alphaPresale = await new AlphaPresaleFactory(wallet).deploy(testUSDC.address, sHBT.address, overrides);
  const betaPresale = await new BetaPresaleFactory(wallet).deploy(testUSDC.address, sHBT.address, overrides);
  const gammaPresale = await new GammaPresaleFactory(wallet).deploy(testUSDC.address, sHBT.address, overrides);
  return {
    testUSDC,
    sHBT,
    presaleConstants,
    alphaPresale,
    betaPresale,
    gammaPresale,
  };
}
