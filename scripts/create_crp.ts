import { ethers } from 'hardhat';
import { Overrides, utils, BigNumber } from 'ethers';
import { parseBigNumber, parseEthAddress, parseWallet, parseETH } from '../test/shared/parser';
import { HybridToken__factory } from '../typechain/factories/HybridToken__factory';
import { TToken__factory } from '../typechain/factories/TToken__factory';
import CRPFactory from '../presale/build/contracts/CRPFactory.json';
import ConfigurableRightsPool from '../presale/build/contracts/ConfigurableRightsPool.json';
import { requestConfirmation } from '../test/shared/utilities';

async function main() {
  let startWeights;
  let startBalances;
  let swapFee;
  let startBlock;
  let tx;

  console.log(`
***********************************************
*** Create CRP for Delta presale **************
***********************************************
`);
  const POOL_TOKEN_SYMBOL = 'HPPT';
  const POOL_TOKEN_NAME = 'Hybrid Presale Pool Token';
  const wallet = parseWallet('PRIVATE_KEY');
  const gasPrice = parseBigNumber('GAS_PRICE_GWEI', 9);
  const USDC = parseEthAddress('USDC');
  const HBT = parseEthAddress('HBT');
  const CRPFactoryAddress = parseEthAddress('CRP_FACTORY');
  const bFactory = parseEthAddress('BFACTORY');
  const startBalanceUSDC = parseETH('CRP_START_BALANCE_USDC');
  const startBalanceHBT = parseETH('CRP_START_BALANCE_HBT');

  const overrides: Overrides = { gasPrice: gasPrice };

  // Settings for ganache-cli local environment
  // const url = "http://127.0.0.1:8545";
  // const provider = ethers.providers.getDefaultProvider(url);

  startBalances = [startBalanceUSDC, startBalanceHBT];
  startWeights = [utils.parseEther('36'), utils.parseEther('4')];
  swapFee = 10 ** 15;

  const poolParams = {
    poolTokenSymbol: POOL_TOKEN_SYMBOL,
    poolTokenName: POOL_TOKEN_NAME,
    constituentTokens: [USDC, HBT],
    tokenBalances: startBalances,
    tokenWeights: startWeights,
    swapFee: swapFee,
  };

  const permissions = {
    canPauseSwapping: false,
    canChangeSwapFee: false,
    canChangeWeights: true,
    canAddRemoveTokens: false,
    canWhitelistLPs: false,
    canChangeCap: false,
  };

  console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`Current wallet: ${wallet.address}`);

  // USDC Token
  const usdc = await new TToken__factory(wallet).attach(USDC);
  console.log(`USDC address: ${usdc.address}`);
  // HBT Token
  const hbt = await new HybridToken__factory(wallet).attach(HBT);
  console.log(`HBT address: ${hbt.address}`);
  // Presale from Truffle project
  const crpFactory = await new ethers.Contract(CRPFactoryAddress, CRPFactory.abi, ethers.provider);
  console.log(`CRP Factory address: ${crpFactory.address}`);
  // Balancer Factory address
  console.log(`Balancer Factory address: ${bFactory}`);

  console.log(`CRP start balances: ${startBalanceUSDC} USDC, ${startBalanceHBT} HBT`);

  await requestConfirmation();
  const CONTROLLER = await crpFactory.connect(wallet).callStatic.newCrp(bFactory, poolParams, permissions);
  tx = await crpFactory.connect(wallet).newCrp(bFactory, poolParams, permissions);
  await tx.wait();

  const controller = await new ethers.Contract(CONTROLLER, ConfigurableRightsPool.abi, ethers.provider);
  const CONTROLLER_ADDRESS = controller.address;
  console.log('Configurable Rights Pool address: ', CONTROLLER_ADDRESS);

  tx = await hbt.approve(CONTROLLER_ADDRESS, utils.parseEther('1000000'));
  console.log(`Waiting for result of: \x1b[36m${tx.hash}\x1b[0m`);
  tx = await usdc.approve(CONTROLLER_ADDRESS, utils.parseEther('177000'));
  console.log(`Waiting for result of: \x1b[36m${tx.hash}\x1b[0m`);
  await tx.wait();

  tx = await controller.connect(wallet)['createPool(uint256)'](utils.parseEther('100'));
  console.log(`Waiting for result of: \x1b[36m${tx.hash}\x1b[0m`);
  await tx.wait();

  // const block = await ethers.provider.getBlockNumber();
  // startBlock = block;
  // console.log(`Start block for HBT bootstrapping: ${startBlock}`);
  console.log('Success');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
