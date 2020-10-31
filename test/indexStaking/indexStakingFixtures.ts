import { Wallet } from 'ethers';
import { Web3Provider } from 'ethers/providers';
import { HybridToken } from '../../typechain/HybridToken';
import { IndexStaking } from '../../typechain/IndexStaking';
import { HybridTokenFactory } from '../../typechain/HybridTokenFactory';
import { IndexStakingFactory } from '../../typechain/IndexStakingFactory';
import { expandTo18Decimals } from '../shared/utilities';

export interface IndexStakingFixture {
  stakingToken: HybridToken;
  rewardToken: HybridToken;
  indexStaking: IndexStaking;
}

const overrides = {
  gasLimit: 9999999,
  gasPrice: 1,
};
export const IndexStakingParams = {
  duration: 3 * 365 * 6500, // blocks
  totalSupply: expandTo18Decimals(100000000),
  rewardSupply: expandTo18Decimals((48 * 100000000) / 100),
};
const StakingTokenDeployParams = {
  name: 'sToken',
  symbol: 'sToken',
  initialBalance: IndexStakingParams.totalSupply,
};
const RewardTokenDeployParams = {
  name: 'rToken',
  symbol: 'rToken',
  initialBalance: IndexStakingParams.rewardSupply,
};

export async function indexStakingFixture(provider: Web3Provider, [wallet]: Wallet[]): Promise<IndexStakingFixture> {
  const stakingToken = await new HybridTokenFactory(wallet).deploy(
    StakingTokenDeployParams.name,
    StakingTokenDeployParams.symbol,
    wallet.address,
    StakingTokenDeployParams.initialBalance,
    overrides,
  );
  const rewardToken = await new HybridTokenFactory(wallet).deploy(
    RewardTokenDeployParams.name,
    RewardTokenDeployParams.symbol,
    wallet.address,
    RewardTokenDeployParams.initialBalance,
    overrides,
  );
  const indexStaking = await new IndexStakingFactory(wallet).deploy(
    stakingToken.address,
    rewardToken.address,
    overrides,
  );
  return {
    stakingToken,
    rewardToken,
    indexStaking,
  };
}
