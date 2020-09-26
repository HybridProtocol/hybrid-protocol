import { Wallet } from 'ethers';
import { Web3Provider } from 'ethers/providers';
import { MintableErc20 } from '../../typechain/MintableErc20';
import { MintableErc20Factory } from '../../typechain/MintableErc20Factory';
import { ContractDetails } from './ContractDetails';
export interface MintableFixture {
  mintable: MintableErc20;
}

const overrides = {
  gasLimit: 9999999,
  gasPrice: 1,
};

export async function mintableFixture(provider: Web3Provider, [wallet]: Wallet[]): Promise<MintableFixture> {
  const contractDetails = new ContractDetails();
  const mintable = await new MintableErc20Factory(wallet).deploy(
    contractDetails.name,
    contractDetails.symbol,
    contractDetails.totalSupply,
    contractDetails.decimals,
    contractDetails.maxMintedSupply,
    overrides,
  );
  return { mintable };
}
