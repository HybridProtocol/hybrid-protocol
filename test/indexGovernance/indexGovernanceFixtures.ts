import { Signer } from 'ethers';
import { expandTo18Decimals } from '../shared/utilities';
import { IndexHybridToken } from '../../typechain/IndexHybridToken';
import { IndexGovernance } from '../../typechain/IndexGovernance';
import { HybridToken } from '../../typechain/HybridToken';
import { HybridToken__factory, IndexGovernance__factory, IndexHybridToken__factory } from '../../typechain';

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

export async function indexGovernanceFixture([wallet]: Signer[]): Promise<IndexGovernanceFixture> {
  const indexHybridToken = await new IndexHybridToken__factory(wallet).deploy(
    IndexHybridTokenDeployParams.totalSupply,
    IndexHybridTokenDeployParams.maxMintedSupply,
    overrides,
  );
  const stakingToken = await new HybridToken__factory(wallet).deploy(
    StakingTokenDeployParams.name,
    StakingTokenDeployParams.symbol,
    await wallet.getAddress(),
    StakingTokenDeployParams.initialBalance,
    overrides,
  );
  const indexGovernance = await new IndexGovernance__factory(wallet).deploy(
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
