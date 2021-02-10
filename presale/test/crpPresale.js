/* eslint-env es6 */

const BFactory = artifacts.require('BFactory');
const BPool = artifacts.require('BPool');
const ConfigurableRightsPool = artifacts.require('ConfigurableRightsPool');
const CRPFactory = artifacts.require('CRPFactory');
const TToken = artifacts.require('TToken');
const { time } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');
const Decimal = require('decimal.js');

// Refer to this article for background:
// https://medium.com/balancer-protocol/building-liquidity-into-token-distribution-a49d4286e0d4

contract('Hybrid Presale', async accounts => {
  const admin = accounts[0];
  const { toWei, fromWei } = web3.utils;

  const MAX = web3.utils.toTwosComplement(-1);
  const SYMBOL = 'HPPT';
  const NAME = 'Hybrid Presale Pool Token';

  const permissions = {
    canPauseSwapping: false,
    canChangeSwapFee: false,
    canChangeWeights: true,
    canAddRemoveTokens: false,
    canWhitelistLPs: false,
    canChangeCap: false,
  };

  describe('Factory LBP', () => {
    let controller;
    let CONTROLLER;
    let USDC;
    let HBT;
    let hbt;
    let usdc;
    let i;

    const startWeights = [toWei('36'), toWei('4')];
    const startBalances = [toWei('177777'), toWei('1000000')];
    const swapFee = 10 ** 15;

    before(async () => {
      bFactory = await BFactory.deployed();
      crpFactory = await CRPFactory.deployed();
      usdc = await TToken.new('USDC', 'USDC Token', 6);
      hbt = await TToken.new('HBT Token', 'HBT', 18);

      USDC = usdc.address;
      HBT = hbt.address;

      // admin balances
      // These should be higher than the initial amount supplied
      // Changing weights pushes/pulls tokens as necessary to keep the prices stable
      await usdc.mint(admin, toWei('178000'));
      await hbt.mint(admin, toWei('10000000'));

      const poolParams = {
        poolTokenSymbol: SYMBOL,
        poolTokenName: NAME,
        constituentTokens: [USDC, HBT],
        tokenBalances: startBalances,
        tokenWeights: startWeights,
        swapFee: swapFee,
      };

      CONTROLLER = await crpFactory.newCrp.call(bFactory.address, poolParams, permissions);

      await crpFactory.newCrp(bFactory.address, poolParams, permissions);

      controller = await ConfigurableRightsPool.at(CONTROLLER);

      const CONTROLLER_ADDRESS = controller.address;

      await hbt.approve(CONTROLLER_ADDRESS, MAX);
      await usdc.approve(CONTROLLER_ADDRESS, MAX);

      await controller.createPool(toWei('100'));
    });

    describe('Presale LBP', () => {
      it('Should be able to update weights', async () => {
        let weightUSDC;
        let weightHBT;
        let pctUSDC;
        let pctHBT;
        let normUSDC;
        let normHBT;
        let blockElapsed;
        // get current block number
        let block = await web3.eth.getBlock('latest');
        const startBlock = block.number;
        console.log(`Start block for HBT bootstrapping: ${startBlock}`);

        blockElapsed = 0;
        for (i = 0; i < 11; i++) {
          // Calculate the percentages (rounded to 3 decimals to avoid numeric issues)
          pctUSDC = Math.pow(3, -blockElapsed / 32500) * 0.9;
          pctHBT = 1 - pctUSDC;

          // Convert the percentages to denormalized weights
          normUSDC = Math.floor(pctUSDC * 40 * 1000) / 1000;
          normHBT = Math.floor(pctHBT * 40 * 1000) / 1000;

          console.log(`\nNew weights: USDC weight: ${normUSDC}; HBT weight: ${normHBT}`);

          // Changing weghts transfers tokens!
          await controller.updateWeight(USDC, toWei(normUSDC.toFixed(4)));
          await controller.updateWeight(HBT, toWei(normHBT.toFixed(4)));

          weightUSDC = await controller.getDenormalizedWeight(USDC);
          weightHBT = await controller.getDenormalizedWeight(HBT);

          console.log(
            'Block elapsed: ' +
              blockElapsed +
              '. Weights -> USDC: ' +
              (fromWei(weightUSDC) * 2.5).toFixed(4) +
              '%\tHBT: ' +
              (fromWei(weightHBT) * 2.5).toFixed(4) +
              '%',
          );

          blockElapsed += 3250;
        }
      });
    });
  });
});
