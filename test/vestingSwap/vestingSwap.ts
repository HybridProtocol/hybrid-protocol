import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract } from 'ethers';
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
  HBT_NOT_ALLOCATED: 'VestingSwap: HBT_NOT_ALLOCATED_FOR_ALL_SWAPS',
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
    await sHBT.addAddressesToMaintainers([
      alphaPresale.address,
      betaPresale.address,
      gammaPresale.address,
      vestingSwap.address,
    ]);
    await HBT.addAddressToMaintainers(ownerWallet.address);
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
      await HBT.mintForSwap(vestingSwap.address);
      await checkAddressContractOwner(aliceWallet.address, alphaPresale, false);
      await expect(alphaPresale.connect(aliceWallet).start()).to.be.revertedWith(ERRORS.IS_NOT_OWNER);
    });
    it('fail - HBT are not allocated', async () => {
      await expect(vestingSwap.startAlphaSwap()).to.be.revertedWith(ERRORS.HBT_NOT_ALLOCATED);
    });
    it('success - HBT allocated', async () => {
      await HBT.mintForSwap(vestingSwap.address);
      await vestingSwap.startAlphaSwap();
      const startBlock = (await vestingSwap.swap(alphaPresale.address)).start;
      await expect(startBlock).gt(0);
    });
  });

  describe('startBetaSwap', () => {
    beforeEach(async () => {
      await HBT.mintForSwap(vestingSwap.address);
      await vestingSwap.startAlphaSwap();
    });
    it('fail - not an owner', async () => {
      await checkAddressContractOwner(aliceWallet.address, betaPresale, false);
      await expect(betaPresale.connect(aliceWallet).start()).to.be.revertedWith(ERRORS.IS_NOT_OWNER);
    });
    it('success - HBT allocated', async () => {
      await vestingSwap.startBetaSwap();
      const startBlock = (await vestingSwap.swap(betaPresale.address)).start;
      await expect(startBlock).gt(0);
    });
  });

  describe('startGammaSwap', () => {
    beforeEach(async () => {
      await HBT.mintForSwap(vestingSwap.address);
      await vestingSwap.startAlphaSwap();
      await vestingSwap.startBetaSwap();
    });
    it('fail - not an owner', async () => {
      await checkAddressContractOwner(aliceWallet.address, gammaPresale, false);
      await expect(gammaPresale.connect(aliceWallet).start()).to.be.revertedWith(ERRORS.IS_NOT_OWNER);
    });
    it('success - HBT allocated', async () => {
      await vestingSwap.startGammaSwap();
      const startBlock = (await vestingSwap.swap(gammaPresale.address)).start;
      await expect(startBlock).gt(0);
    });
  });

  describe('alphaSwap', async () => {
    beforeEach(async () => {
      await HBT.mintForSwap(vestingSwap.address);
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
      await HBT.mintForSwap(vestingSwap.address);
      // start Alpha Swap
      await vestingSwap.startAlphaSwap();
      // make a swap
      await vestingSwap.connect(aliceWallet).alphaSwap(swapAmount);
      const afterBalanceHBT = await HBT.balanceOf(aliceWallet.address);
      await expect(afterBalanceHBT).to.be.eq(swapAmount);

      // start Beta Swap
      await vestingSwap.startBetaSwap();
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
      await HBT.mintForSwap(vestingSwap.address);
      // start Alpha Swap
      await vestingSwap.startAlphaSwap();
      // make a swap
      await vestingSwap.connect(aliceWallet).alphaSwap(swapAmount);

      // start Beta Swap
      await vestingSwap.startBetaSwap();
      // make a swap
      await vestingSwap.connect(aliceWallet).betaSwap(swapAmount);

      // start Gamma Swap
      await vestingSwap.startGammaSwap();
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
