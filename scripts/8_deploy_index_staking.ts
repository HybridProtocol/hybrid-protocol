import { ethers } from 'hardhat';
import { Overrides } from 'ethers';
import { parseBigNumber, parseWallet, parseEthAddress } from '../test/shared/parser';
import { IndexStaking__factory } from '../typechain/factories/IndexStaking__factory';
import { requestConfirmation } from '../test/shared/utilities';

const _overrides: Overrides = {
  gasLimit: 7000029,
};

async function main() {
  const wallet = parseWallet('PRIVATE_KEY');
  const gasPrice = parseBigNumber('GAS_PRICE_GWEI', 9);
  const HBTAddress = parseEthAddress('HBT');
  const XHBTAddress = parseEthAddress('XHBT');
  const totalSupplyHBT = parseBigNumber('HBT_TOTAL_SUPPLY', 0);
  const stakingDuration = parseBigNumber('STAKING_DURATION', 0);
  const percentages = parseBigNumber('STAKING_REWARD_SUPPLY_PERCENTAGES', 0);
  const rewardSupply = percentages.mul(totalSupplyHBT).div(100);

  const overrides: Overrides = { ..._overrides, gasPrice: gasPrice };
  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log(`HBT address: ${HBTAddress}`);
  console.log(`xHBT address: ${XHBTAddress}`);
  console.log(`Total supply HBT: ${totalSupplyHBT}`);
  console.log(`Staking duration: ${stakingDuration} blocks`);
  console.log(`Percentages of total supply for staking: ${percentages}%`);
  console.log(`Reward supply: ${rewardSupply}`);

  await requestConfirmation();

  console.log('Deploy Index Staking');
  const indexStaking = await new IndexStaking__factory(wallet).deploy(
    XHBTAddress,
    HBTAddress,
    stakingDuration,
    totalSupplyHBT,
    rewardSupply,
    overrides,
  );
  console.log(`\x1b[32m${indexStaking.address}\x1b[0m`);
  console.log(`Waiting for result of: \x1b[36m${indexStaking.deployTransaction.hash}\x1b[0m`);
  await indexStaking.deployTransaction.wait();
  console.log('Success');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
