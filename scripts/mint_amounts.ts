import { ethers } from '@nomiclabs/buidler';
import { MintableErc20Factory } from '../typechain/MintableErc20Factory';
import { parseEthAddresses, parseEthAddress, parseBigNumbers } from '../test/shared/utilities';

async function main() {
  const account = (await ethers.getSigners())[0];
  const address = parseEthAddress('CONTRACT', process.env.CONTRACT);
  const mintable = await new MintableErc20Factory(account).attach(address);
  const decimals = await mintable.decimals();
  const accounts = parseEthAddresses('ACCOUNTS', process.env.ACCOUNTS);
  const amounts = parseBigNumbers('AMOUNTS', process.env.AMOUNTS, decimals);
  if (amounts.length == 0 || amounts.length !== accounts.length) {
    throw new Error(
      `MintableERC20: invalid length, amounts.length ${amounts.length}, accounts.length: ${accounts.length}`,
    );
  }
  const tx = await mintable.mintAmounts(accounts, amounts);
  console.log(`MintableERC20.mintAmounts([${accounts}], [${amounts}]) transaction with hash: `, tx.hash);
  console.log('MintableERC20: transaction hash:', tx.hash);
  console.log('MintableERC20: waiting for confirmation...');
  const receipt = await tx.wait();
  console.log(`Deployed MintableERC20.mintAmounts([${accounts}], [${amounts}]) transaction:`, receipt.blockHash);
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
