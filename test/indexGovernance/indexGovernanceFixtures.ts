import { Wallet } from 'ethers';
import { Web3Provider } from 'ethers/providers';
import { expandTo18Decimals } from '../shared/utilities';
import { IndexHybridToken } from '../../typechain/IndexHybridToken';
import { IndexGovernance } from '../../typechain/IndexGovernance';
import { HybridToken } from '../../typechain/HybridToken';
import { IndexHybridTokenFactory } from '../../typechain/IndexHybridTokenFactory';
import { IndexGovernanceFactory } from '../../typechain/IndexGovernanceFactory';
import { HybridTokenFactory } from '../../typechain/HybridTokenFactory';

export interface IndexGovernanceFixture {
  indexHybridToken: IndexHybridToken;
  stakingToken: HybridToken;
  indexGovernance: IndexGovernance;
}

export const indexGovernanceMinDuration = 12; // blocks
const overrides = {
  gasLimit: 9999999,
  gasPrice: 1,
};
const IndexHybridTokenDeployParams = {
  totalSupply: expandTo18Decimals(1000000),
  maxMintedSupply: expandTo18Decimals(2000000),
};
const StakingTokenDeployParams = {
  name: 'sToken',
  symbol: 'sToken',
  initialBalance: expandTo18Decimals(10000000),
};

export async function indexGovernanceFixture(
  provider: Web3Provider,
  [wallet]: Wallet[],
): Promise<IndexGovernanceFixture> {
  const indexHybridToken = await new IndexHybridTokenFactory(wallet).deploy(
    IndexHybridTokenDeployParams.totalSupply,
    IndexHybridTokenDeployParams.maxMintedSupply,
    overrides,
  );
  const stakingToken = await new HybridTokenFactory(wallet).deploy(
    StakingTokenDeployParams.name,
    StakingTokenDeployParams.symbol,
    wallet.address,
    StakingTokenDeployParams.initialBalance,
    overrides,
  );
  const indexGovernance = await new IndexGovernanceFactory(wallet).deploy(
    indexHybridToken.address,
    stakingToken.address,
    indexGovernanceMinDuration,
    overrides,
  );
  return {
    indexHybridToken,
    stakingToken,
    indexGovernance,
  };
}
