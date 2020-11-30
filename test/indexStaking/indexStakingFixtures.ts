import { Signer } from 'ethers';
import { HybridToken } from '../../typechain/HybridToken';
import { IndexStaking } from '../../typechain/IndexStaking';
import { HybridToken__factory, IndexStaking__factory } from '../../typechain';
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
  duration: 40, // blocks
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

export async function indexStakingFixture([wallet]: Signer[]): Promise<IndexStakingFixture> {
  const stakingToken = await new HybridToken__factory(wallet).deploy(
    StakingTokenDeployParams.name,
    StakingTokenDeployParams.symbol,
    await wallet.getAddress(),
    StakingTokenDeployParams.initialBalance,
    overrides,
  );
  const rewardToken = await new HybridToken__factory(wallet).deploy(
    RewardTokenDeployParams.name,
    RewardTokenDeployParams.symbol,
    await wallet.getAddress(),
    RewardTokenDeployParams.initialBalance,
    overrides,
  );
  const indexStaking = await new IndexStaking__factory(wallet).deploy(
    stakingToken.address,
    rewardToken.address,
    IndexStakingParams.duration,
    IndexStakingParams.totalSupply,
    IndexStakingParams.rewardSupply,
    overrides,
  );
  return {
    stakingToken,
    rewardToken,
    indexStaking,
  };
}
