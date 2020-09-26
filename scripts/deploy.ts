import { ethers } from '@nomiclabs/buidler';
import { MintableErc20Factory } from '../typechain/MintableErc20Factory';
import { ContractDetails } from '../test/shared/ContractDetails';

async function main() {
  const account = (await ethers.getSigners())[0];
  const contractDetails = new ContractDetails();
  const mintable = await new MintableErc20Factory(account).deploy(
    contractDetails.name,
    contractDetails.symbol,
    contractDetails.totalSupply,
    contractDetails.decimals,
    contractDetails.maxMintedSupply,
  );
  console.log('Deployed MintableERC20 contract to:', mintable.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
