import { Wallet } from 'ethers';
import { Web3Provider } from 'ethers/providers';
import { expandTo18Decimals } from '../shared/utilities';
import { IndexHybridToken } from '../../typechain/IndexHybridToken';
import { IndexGovernance } from '../../typechain/IndexGovernance';
import { IndexHybridTokenFactory } from '../../typechain/IndexHybridTokenFactory';
import { IndexGovernanceFactory } from '../../typechain/IndexGovernanceFactory';

export interface IndexGovernanceFixture {
  indexHybridToken: IndexHybridToken;
  indexGovernance: IndexGovernance;
}

export const indexGovernanceMinDuration = 25; // blocks
const overrides = {
  gasLimit: 9999999,
  gasPrice: 1,
};
const IndexHybridTokenDeployParams = {
  totalSupply: expandTo18Decimals(1000000),
  maxMintedSupply: expandTo18Decimals(2000000),
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
  const indexGovernance = await new IndexGovernanceFactory(wallet).deploy(
    indexHybridToken.address,
    indexGovernanceMinDuration,
    overrides,
  );
  return {
    indexHybridToken,
    indexGovernance,
  };
}
