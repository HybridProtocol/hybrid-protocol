import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { BigNumber, Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { presaleDuration, presaleFixture } from '../presale/presaleFixtures';
import { SaleHybridToken } from '../../typechain/SaleHybridToken';
import { HybridToken } from '../../typechain/HybridToken';
import { VestingSwap } from '../../typechain/VestingSwap';
import { AlphaPresale } from '../../typechain/AlphaPresale';
import { BetaPresale } from '../../typechain/BetaPresale';
import { GammaPresale } from '../../typechain/GammaPresale';
import { expandTo18Decimals, mineBlock } from '../shared/utilities';
import { vestingSwapFixture } from './vestingSwapFixtures';

const ERRORS = {
  IS_NOT_OWNER: 'Ownable: caller is not the owner',
  HBT_NOT_ALLOCATED_FOR_ALPHA: 'VestingSwap: HBT_NOT_ALLOCATED_FOR_ALPHA',
  HBT_NOT_ALLOCATED_FOR_BETA: 'VestingSwap: HBT_NOT_ALLOCATED_FOR_BETA',
  HBT_NOT_ALLOCATED_FOR_GAMMA: 'VestingSwap: HBT_NOT_ALLOCATED_FOR_GAMMA',
  VESTING_LIMIT: 'VestingSwap: VESTING_LIMIT',
};

describe('VestingSwap', async () => {
  let ownerWallet: SignerWithAddress;
  let aliceWallet: SignerWithAddress;
  let bobWallet: SignerWithAddress;
  let eveWallet: SignerWithAddress;
  let vestingSwap: VestingSwap;
  let alphaPresale: AlphaPresale;
  let betaPresale: BetaPresale;
  let gammaPresale: GammaPresale;
  let HBT: HybridToken;
  let USDC: Contract;
  let sHBT: SaleHybridToken;

  beforeEach(async () => {
    // activate all presales and make a purchases

    // get signers
    [ownerWallet, aliceWallet, bobWallet, eveWallet] = await hre.ethers.getSigners();

    // load fixtures
    const pFixtures = await presaleFixture([ownerWallet]);
    sHBT = pFixtures.sHBT;
    USDC = pFixtures.USDC;
    alphaPresale = pFixtures.alphaPresale;
    betaPresale = pFixtures.betaPresale;
    gammaPresale = pFixtures.gammaPresale;
    const vsFixtures = await vestingSwapFixture([ownerWallet], alphaPresale, betaPresale, gammaPresale, sHBT);
    HBT = vsFixtures.HBT;
    vestingSwap = vsFixtures.vestingSwap;

    // init test actions
    await sHBT.mintPresale(alphaPresale.address, betaPresale.address, gammaPresale.address); // send sHBT tokens to alphaPresale, betaPresale and gammaPresale addresses
    await sHBT.addAddressesToMainteiners([
      alphaPresale.address,
      betaPresale.address,
      gammaPresale.address,
      vestingSwap.address,
    ]);
    await USDC.transfer(aliceWallet.address, expandTo18Decimals(1000000)); // transfer USDC tokens to Alice address
    await USDC.transfer(bobWallet.address, expandTo18Decimals(2000000)); // transfer USDC tokens to Bob address
    await USDC.transfer(alphaPresale.address, expandTo18Decimals(3000000)); // transfer USDC tokens to presaleContract address
    await alphaPresale.start();
    await betaPresale.start();
    await gammaPresale.start();
    const amountUSDC = expandTo18Decimals(150);
    await USDC.connect(aliceWallet).increaseAllowance(alphaPresale.address, amountUSDC);
    await USDC.connect(aliceWallet).increaseAllowance(betaPresale.address, amountUSDC);
    await USDC.connect(aliceWallet).increaseAllowance(gammaPresale.address, amountUSDC);
    await alphaPresale.connect(aliceWallet).buy(amountUSDC);
    await betaPresale.connect(aliceWallet).buy(amountUSDC);
    await gammaPresale.connect(aliceWallet).buy(amountUSDC);
  });

  describe('startAlphaSwap', () => {
    it('fail - not an owner', async () => {
      await checkAddressContractOwner(aliceWallet.address, alphaPresale, false);
      await expect(alphaPresale.connect(aliceWallet).start()).to.be.revertedWith(ERRORS.IS_NOT_OWNER);
    });
    it('fail - HBT are not allocated', async () => {
      await expect(vestingSwap.startAlphaSwap()).to.be.revertedWith(ERRORS.HBT_NOT_ALLOCATED_FOR_ALPHA);
    });
    it('success - HBT allocated', async () => {
      const totalAlphaSold = await alphaPresale.totalSold();
      await HBT.transfer(vestingSwap.address, totalAlphaSold);
      await vestingSwap.startAlphaSwap();
      const startBlock = (await vestingSwap.swap(alphaPresale.address)).start;
      await expect(startBlock).gt(0);
    });
  });

  describe('startBetaSwap', () => {
    it('fail - not an owner', async () => {
      await checkAddressContractOwner(aliceWallet.address, betaPresale, false);
      await expect(betaPresale.connect(aliceWallet).start()).to.be.revertedWith(ERRORS.IS_NOT_OWNER);
    });
    it('fail - HBT are not allocated', async () => {
      await expect(vestingSwap.startBetaSwap()).to.be.revertedWith(ERRORS.HBT_NOT_ALLOCATED_FOR_BETA);
    });
    it('success - HBT allocated', async () => {
      const totalBetaSold = await betaPresale.totalSold();
      await HBT.transfer(vestingSwap.address, totalBetaSold);
      await vestingSwap.startBetaSwap();
      const startBlock = (await vestingSwap.swap(betaPresale.address)).start;
      await expect(startBlock).gt(0);
    });
  });

  describe('startGammaSwap', () => {
    it('fail - not an owner', async () => {
      await checkAddressContractOwner(aliceWallet.address, gammaPresale, false);
      await expect(gammaPresale.connect(aliceWallet).start()).to.be.revertedWith(ERRORS.IS_NOT_OWNER);
    });
    it('fail - HBT are not allocated', async () => {
      await expect(vestingSwap.startGammaSwap()).to.be.revertedWith(ERRORS.HBT_NOT_ALLOCATED_FOR_GAMMA);
    });
    it('success - HBT allocated', async () => {
      const totalGammaSold = await gammaPresale.totalSold();
      await HBT.transfer(vestingSwap.address, totalGammaSold);
      await vestingSwap.startGammaSwap();
      const startBlock = (await vestingSwap.swap(gammaPresale.address)).start;
      await expect(startBlock).gt(0);
    });
  });

  describe('alphaSwap', async () => {
    beforeEach(async () => {
      // allocate appropriate amount of HBT
      const totalSold = await alphaPresale.totalSold();
      await HBT.transfer(vestingSwap.address, totalSold);
      // start Alpha Swap
      await vestingSwap.startAlphaSwap();
    });

    it('success - swap available amount', async () => {
      const beforeBalanceSHBT = await sHBT.balanceOf(aliceWallet.address);
      const beforeBalanceHBT = await HBT.balanceOf(aliceWallet.address);
      const swapAmount = expandTo18Decimals(10);
      const expectedBalanceSHBT = beforeBalanceSHBT.sub(swapAmount);
      await expect(beforeBalanceHBT).to.be.eq(0);

      // make a swap
      await vestingSwap.connect(aliceWallet).alphaSwap(swapAmount);

      const afterBalanceSHBT = await sHBT.balanceOf(aliceWallet.address);
      await expect(afterBalanceSHBT).to.be.eq(expectedBalanceSHBT);
      const afterBalanceHBT = await HBT.balanceOf(aliceWallet.address);
      await expect(afterBalanceHBT).to.be.eq(swapAmount);
    });

    it('fail - swap exceed limit', async () => {
      // try to swap total balance of sHBT
      const swapAmount = await sHBT.balanceOf(aliceWallet.address);
      await expect(vestingSwap.connect(aliceWallet).alphaSwap(swapAmount)).to.be.revertedWith(ERRORS.VESTING_LIMIT);
    });
  });

  describe('betaSwap', async () => {
    beforeEach(async () => {
      const swapAmount = expandTo18Decimals(10);
      // allocate appropriate amount of HBT for Alpha Swap
      const totalSold = await alphaPresale.totalSold();
      await HBT.transfer(vestingSwap.address, totalSold);
      // start Alpha Swap
      await vestingSwap.startAlphaSwap();
      // make a swap
      await vestingSwap.connect(aliceWallet).alphaSwap(swapAmount);
      const afterBalanceHBT = await HBT.balanceOf(aliceWallet.address);
      await expect(afterBalanceHBT).to.be.eq(swapAmount);

      // allocate appropriate amount of HBT for Beta Swap
      const alphaPresaleSold = (await vestingSwap.swap(alphaPresale.address)).sold;
      const alphaPresaleSwapped = (await vestingSwap.swap(alphaPresale.address)).swapped;
      const leftAmountBeforeBetaSwapStart = alphaPresaleSold.sub(alphaPresaleSwapped);
      const betaPresaleSold = await betaPresale.totalSold();
      const requiredBalance = betaPresaleSold.add(leftAmountBeforeBetaSwapStart);
      await HBT.transfer(vestingSwap.address, betaPresaleSold);

      // start Beta Swap
      await vestingSwap.startBetaSwap();
      const afterBetaSwapStartBalance = await HBT.balanceOf(vestingSwap.address);
      await expect(afterBetaSwapStartBalance).to.be.eq(requiredBalance);
    });

    it('success - swap available amount', async () => {
      const beforeBalanceSHBT = await sHBT.balanceOf(aliceWallet.address);
      const beforeBalanceHBT = await HBT.balanceOf(aliceWallet.address);
      const swapAmount = expandTo18Decimals(10);
      const expectedBalanceSHBT = beforeBalanceSHBT.sub(swapAmount);
      const expectedBalanceHBT = beforeBalanceHBT.add(swapAmount);

      // make a swap
      await vestingSwap.connect(aliceWallet).betaSwap(swapAmount);

      const afterBalanceSHBT = await sHBT.balanceOf(aliceWallet.address);
      await expect(afterBalanceSHBT).to.be.eq(expectedBalanceSHBT);
      const afterBalanceHBT = await HBT.balanceOf(aliceWallet.address);
      await expect(afterBalanceHBT).to.be.eq(expectedBalanceHBT);
    });

    it('fail - swap exceed limit', async () => {
      // try to swap total balance of sHBT
      const swapAmount = await sHBT.balanceOf(aliceWallet.address);
      await expect(vestingSwap.connect(aliceWallet).betaSwap(swapAmount)).to.be.revertedWith(ERRORS.VESTING_LIMIT);
    });
  });

  describe('gammaSwap', async () => {
    beforeEach(async () => {
      const swapAmount = expandTo18Decimals(10);
      // allocate appropriate amount of HBT for Alpha Swap
      const alphaPresaleSold = await alphaPresale.totalSold();
      await HBT.transfer(vestingSwap.address, alphaPresaleSold);
      // start Alpha Swap
      await vestingSwap.startAlphaSwap();
      // make a swap
      await vestingSwap.connect(aliceWallet).alphaSwap(swapAmount);

      // allocate appropriate amount of HBT for Beta Swap
      const betaPresaleSold = await betaPresale.totalSold();
      await HBT.transfer(vestingSwap.address, betaPresaleSold);

      // start Beta Swap
      await vestingSwap.startBetaSwap();
      // make a swap
      await vestingSwap.connect(aliceWallet).betaSwap(swapAmount);

      // allocate appropriate amount of HBT for Gamma Swap
      const alphaPresaleSwapped = (await vestingSwap.swap(alphaPresale.address)).swapped;
      const betaPresaleSwapped = (await vestingSwap.swap(betaPresale.address)).swapped;
      const leftAmountAlphaSwapStart = alphaPresaleSold.sub(alphaPresaleSwapped);
      const leftAmountBetaSwapStart = betaPresaleSold.sub(betaPresaleSwapped);
      const gammaPresaleSold = await gammaPresale.totalSold();
      const requiredBalance = gammaPresaleSold.add(leftAmountAlphaSwapStart).add(leftAmountBetaSwapStart);
      await HBT.transfer(vestingSwap.address, gammaPresaleSold);

      // start Gamma Swap
      await vestingSwap.startGammaSwap();
      const afterGammaSwapStartBalance = await HBT.balanceOf(vestingSwap.address);
      await expect(afterGammaSwapStartBalance).to.be.eq(requiredBalance);
    });

    it('success - swap available amount', async () => {
      const beforeBalanceSHBT = await sHBT.balanceOf(aliceWallet.address);
      const beforeBalanceHBT = await HBT.balanceOf(aliceWallet.address);
      const swapAmount = expandTo18Decimals(10);
      const expectedBalanceSHBT = beforeBalanceSHBT.sub(swapAmount);
      const expectedBalanceHBT = beforeBalanceHBT.add(swapAmount);

      // make a swap
      await vestingSwap.connect(aliceWallet).gammaSwap(swapAmount);

      const afterBalanceSHBT = await sHBT.balanceOf(aliceWallet.address);
      await expect(afterBalanceSHBT).to.be.eq(expectedBalanceSHBT);
      const afterBalanceHBT = await HBT.balanceOf(aliceWallet.address);
      await expect(afterBalanceHBT).to.be.eq(expectedBalanceHBT);
    });

    it('fail - swap exceed limit', async () => {
      // try to swap total balance of sHBT
      const swapAmount = await sHBT.balanceOf(aliceWallet.address);
      await expect(vestingSwap.connect(aliceWallet).betaSwap(swapAmount)).to.be.revertedWith(ERRORS.VESTING_LIMIT);
    });
  });
});

async function checkAddressContractOwner(address: string, contract: Contract, expectOwner: boolean): Promise<void> {
  const ownerAddress = await contract.owner();
  if (expectOwner) {
    expect(ownerAddress).to.be.eq(address);
  } else {
    expect(ownerAddress).to.not.be.eq(address);
  }
}
