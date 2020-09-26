import { ethers } from '@nomiclabs/buidler';
import { MintableErc20Factory } from '../typechain/MintableErc20Factory';
import { BigNumber } from 'ethers/utils';
import { assertNotEmpty, assert, parseBigNumber } from '../test/shared/utilities';

async function main() {
  const account = (await ethers.getSigners())[0];
  const name = assertNotEmpty('NAME', process.env.NAME);
  const symbol = assertNotEmpty('SYMBOL', process.env.SYMBOL);
  const decimals = new BigNumber(assert('DECIMALS', process.env.DECIMALS)).toNumber();
  const totalSupply = parseBigNumber('TOTAL_SUPPLY', process.env.TOTAL_SUPPLY, decimals);

  const mintable = await new MintableErc20Factory(account).deploy(name, symbol, 0, decimals, totalSupply);
  console.log('MintableERC20: deployed to address:', mintable.address);
  console.log('MintableERC20: transaction id:', mintable.deployTransaction.hash);
  console.log('MintableERC20: waiting for confirmation...');
  const receipt = await mintable.deployTransaction.wait();
  console.log('MintableERC20: deployed transaction', receipt.blockHash);
  try {
    const [name, symbol, decimals, totalSupply, maxMintedSupply] = await Promise.all([
      mintable.name(),
      mintable.symbol(),
      mintable.decimals(),
      mintable.totalSupply(),
      mintable.maxMintedSupply(),
    ]);
    console.log('MintableERC20.name: ', name);
    console.log('MintableERC20.symbol: ', symbol);
    console.log('MintableERC20.decimals: ', decimals);
    console.log('MintableERC20.totalSupply: ', totalSupply.toString());
    console.log('MintableERC20.maxMintedSupply: ', maxMintedSupply.toString());
  } catch (e) {}
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
