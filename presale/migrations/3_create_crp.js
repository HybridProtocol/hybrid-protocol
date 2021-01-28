const CRPFactory = artifacts.require('CRPFactory');
const BFactory = artifacts.require('BFactory');
const ConfigurableRightsPool = artifacts.require('ConfigurableRightsPool');
const TToken = artifacts.require('TToken');

require('dotenv').config();

module.exports = async function (deployer, network, accounts) {
  const admin = accounts[0];
  const { toWei } = web3.utils;
  const MAX = web3.utils.toTwosComplement(-1);
  const SYMBOL = 'HPPT';
  const NAME = 'Hybrid Presale Pool Token';

  let bFactoryAddress;
  let crpFactory;
  let usdc;
  let hbt;
  let USDC;
  let HBT;
  let startWeights;
  let startBalances;
  let swapFee;

  if (network === 'development'  ||
      network === 'coverage'     ||
      network === 'ropsten-fork' ||
      network === 'rinkeby-fork'
  ) {
  
    usdc = await TToken.new('USDC', 'USDC Token', 6);
    hbt = await TToken.new('HBT Token', 'HBT', 18);

    bFactoryAddress = BFactory.address;
    USDC = usdc.address;
    HBT = hbt.address;
    // admin balances
    await usdc.mint(admin, toWei('100000000'));
    await hbt.mint(admin, toWei('100000000'));
  } else {
    bFactoryAddress = process.env.BALANCER_FACTORY;
    USDC = process.env.USDC;
    HBT = process.env.HBT;
    usdc = await TToken.at(USDC);
    hbt = await TToken.at(HBT);
  }

  startWeights = [toWei('36'), toWei('4')];
  startBalances = [toWei('300000'), toWei('1000000')];
  swapFee = 10 ** 15;

  const poolParams = {
    poolTokenSymbol: SYMBOL,
    poolTokenName: NAME,
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

  crpFactory = await CRPFactory.at(CRPFactory.address);
  CONTROLLER = await crpFactory.newCrp.call(bFactoryAddress, poolParams, permissions);
  await crpFactory.newCrp(bFactoryAddress, poolParams, permissions);
  controller = await ConfigurableRightsPool.at(CONTROLLER);
  const CONTROLLER_ADDRESS = controller.address;
  await hbt.approve(CONTROLLER_ADDRESS, toWei('100000000'));
  await usdc.approve(CONTROLLER_ADDRESS, toWei('100000000'));
  await controller.createPool(toWei('100'));
  console.log('Configurable Rights Pool at: ', CONTROLLER);
  console.log('USDC at: ', USDC);
  console.log('HBT at: ', HBT);
};

