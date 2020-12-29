import { Signer } from 'ethers';
import { HybridToken, VestingSwap, AlphaPresale, BetaPresale, GammaPresale, SaleHybridToken } from '../../typechain';
import { HybridToken__factory, VestingSwap__factory } from '../../typechain';
import { expandTo18Decimals } from '../shared/utilities';

export interface VestingSwapFixture {
  HBT: HybridToken;
  vestingSwap: VestingSwap;
}

const overrides = {
  gasLimit: 9999999,
  gasPrice: 1,
};
const HBTDeployParams = {
  name: 'Hybrid Token',
  symbol: 'HBT',
  initialBalance: expandTo18Decimals(10000000),
};

export async function vestingSwapFixture(
  [wallet]: Signer[],
  alphaPresale: AlphaPresale,
  betaPresale: BetaPresale,
  gammaPresale: GammaPresale,
  sHBT: SaleHybridToken,
): Promise<VestingSwapFixture> {
  const HBT = await new HybridToken__factory(wallet).deploy(
    HBTDeployParams.name,
    HBTDeployParams.symbol,
    await wallet.getAddress(),
    HBTDeployParams.initialBalance,
    overrides,
  );
  const vestingSwap = await new VestingSwap__factory(wallet).deploy(
    alphaPresale.address,
    betaPresale.address,
    gammaPresale.address,
    HBT.address,
    sHBT.address,
    overrides,
  );
  return {
    HBT,
    vestingSwap,
  };
}
