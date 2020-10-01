import { ethers } from '@nomiclabs/buidler';
import { CrpFactoryFactory } from '../typechain/CrpFactoryFactory';
import { TTokenFactory } from '../typechain/TtokenFactory';
import { BFactoryFactory } from '../typechain/BfactoryFactory';

async function main() {
  const account = (await ethers.getSigners())[0];

  // TODO: Link libraries
  const crpFactory = await new CrpFactoryFactory(account).deploy();

  const permissions = {
    canPauseSwapping: true,
    canChangeSwapFee: true,
    canChangeWeights: true,
    canAddRemoveTokens: false,
    canWhitelistLPs: false,
    canChangeCap: false,
    canRemoveAllTokens: false,
  };

  const startWeights = [ethers.utils.parseUnits('1'), ethers.utils.parseUnits('39')];
  const startBalances = [ethers.utils.parseUnits('80000'), ethers.utils.parseUnits('40')];
  const swapFee = 10 ** 15;
  const MAX = ethers.utils.parseUnits('1000000000000');

  const weth = await new TTokenFactory(account).deploy('Wrapped Ether', 'WETH', 18);
  const xyz = await new TTokenFactory(account).deploy('XYZ', 'XYZ', 18);
  const BFactory = await new BFactoryFactory(account).deploy();

  // admin balances
  await weth.mint(account.getAddress(), ethers.utils.parseUnits('100000000'));
  await xyz.mint(account.getAddress(), ethers.utils.parseUnits('100000000'));

  const poolParams = {
    poolTokenSymbol: 'AYE',
    poolTokenName: 'AYE',
    constituentTokens: [weth.address, xyz.address],
    tokenBalances: startBalances,
    tokenWeights: startWeights,
    swapFee: swapFee,
  };

  // TODO: Get CRP contract correctly
  const crp = await crpFactory.newCrp(BFactory.address, poolParams, permissions);
  await weth.approve(crp.address, MAX);
  await xyz.approve(crp.address, MAX);
  await crp.createPool(ethers.utils.parseUnits('100'), 10, 10);

  try {
    await crp.pokeWeights();
  } catch (e) {}
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
