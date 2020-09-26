import { ethers } from '@nomiclabs/buidler';
import { MintableErc20Factory } from '../typechain/MintableErc20Factory';
import { parseEthAddresses, parseEthAddress, parseBigNumber } from '../test/shared/utilities';

async function main() {
  const account = (await ethers.getSigners())[0];
  const address = parseEthAddress('CONTRACT', process.env.CONTRACT);
  const mintable = await new MintableErc20Factory(account).attach(address);
  const decimals = await mintable.decimals();
  const accounts = parseEthAddresses('ACCOUNTS', process.env.ACCOUNTS);
  const amount = parseBigNumber('AMOUNT', process.env.AMOUNT, decimals);
  const tx = await mintable.mintAmount(accounts, amount);
  console.log(`MintableERC20.mintAmount([${accounts}], ${amount})`);
  console.log('MintableERC20: transaction hash:', tx.hash);
  console.log('MintableERC20: waiting for confirmation...');
  const receipt = await tx.wait();
  console.log(`Deployed MintableERC20.mintAmount([${accounts}], ${amount}) transaction:`, receipt.blockHash);
  try {
    const [totalSupply, maxMintedSupply] = await Promise.all([mintable.totalSupply(), mintable.maxMintedSupply()]);
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
