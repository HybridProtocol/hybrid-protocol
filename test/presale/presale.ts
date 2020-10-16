import chai, { expect } from 'chai';
import { createFixtureLoader, MockProvider, solidity } from 'ethereum-waffle';
import { AlphaPresale } from '../../typechain/AlphaPresale';
import { BetaPresale } from '../../typechain/BetaPresale';
import { GammaPresale } from '../../typechain/GammaPresale';
import { presaleFixture } from './presaleFixtures';
import { SaleHybridToken } from '../../typechain/SaleHybridToken';
import { HybridToken } from '../../typechain/HybridToken';
import { expandTo18Decimals } from '../shared/utilities';
import { BigNumber } from 'ethers/utils';
import { Contract } from 'ethers';

chai.use(solidity);

const ERRORS = {
  IS_NOT_OWNER: 'Ownable: caller is not the owner',
  PRESALE_ALREADY_STARTED: 'Presale: ALREADY_STARTED',
  PRESALE_INVALID_DATE: 'Presale: INVALID_DATE',
  PRESALE_ZERO_AMOUNT_USDC: 'Presale: ZERO_AMOUNT_USDC',
  SAFE_TRANSFER_TRANSFER_FROM: 'SafeTransfer: TRANSFER_FROM',
  SAFE_TRANSFER_SEND_ERC20: 'SafeTransfer: SEND_ERC20',
};

describe('Presale', () => {
  describe('AlphaPresale', async () => {
    await testPresaleContracts('alphaPresale', 'ALPHA_PRESALE_LIMIT', 'ALPHA_PRESALE_RATE', 'ALPHA_PURCHASE_LIMIT');
  });

  describe('BetaPresale', async () => {
    await testPresaleContracts('betaPresale', 'BETA_PRESALE_LIMIT', 'BETA_PRESALE_RATE', 'BETA_PURCHASE_LIMIT');
  });

  describe('GammaPresale', async () => {
    await testPresaleContracts('gammaPresale', 'GAMMA_PRESALE_LIMIT', 'GAMMA_PRESALE_RATE', 'GAMMA_PURCHASE_LIMIT');
  });
});

async function testPresaleContracts(
  presaleContractName: string,
  presaleLimitMethodName: string,
  presaleRateMethodName: string,
  purchaseLimitMethodName: string,
): Promise<void> {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999,
  });
  const [ownerWallet, aliceWallet, bobWallet] = provider.getWallets();
  const loadFixture = createFixtureLoader(provider, [ownerWallet]);

  let USDC: HybridToken;
  let sHBT: SaleHybridToken;
  let alphaPresale: Contract;
  let betaPresale: Contract;
  let gammaPresale: Contract;
  let presaleContract: Contract;
  let oneHbtInWei: BigNumber;
  let presaleLimit: BigNumber;
  let presaleRate: BigNumber;
  let purchaseLimit: BigNumber;

  beforeEach(async () => {
    // load fixture
    const fixture = await loadFixture(presaleFixture);

    // update contract variables
    USDC = fixture.testUSDC;
    sHBT = fixture.sHBT;
    alphaPresale = fixture.alphaPresale;
    betaPresale = fixture.betaPresale;
    gammaPresale = fixture.gammaPresale;
    presaleContract = (fixture as any)[presaleContractName];

    // update contract constants
    oneHbtInWei = await fixture.presaleConstants.ONE_HBT_IN_WEI();
    presaleLimit = await fixture.presaleConstants[presaleLimitMethodName]();
    presaleRate = await fixture.presaleConstants[presaleRateMethodName]();
    purchaseLimit = await fixture.presaleConstants[purchaseLimitMethodName]();

    // init test action
    await sHBT.mintPresale(alphaPresale.address, betaPresale.address, gammaPresale.address); // send sHBT tokens to alphaPresale, betaPresale and gammaPresale addresses
    await USDC.transfer(aliceWallet.address, expandTo18Decimals(1000000)); // transfer USDC tokens to Alice address
    await USDC.transfer(bobWallet.address, expandTo18Decimals(2000000)); // transfer USDC tokens to Bob address
    await USDC.transfer(presaleContract.address, expandTo18Decimals(3000000)); // transfer USDC tokens to presaleContract address
  });

  describe('start', () => {
    it('fail - not owner', async () => {
      // check contract owner - not owner
      await checkAddressContractOwner(aliceWallet.address, presaleContract, false);

      // run method start() - reverted
      await expect(presaleContract.connect(aliceWallet).start()).to.be.revertedWith(ERRORS.IS_NOT_OWNER);
    });

    it('fail - owner (Presale: ALREADY_STARTED)', async () => {
      // check contract owner - owner
      await checkAddressContractOwner(ownerWallet.address, presaleContract, true);

      // run method start() - successfully
      await expect(presaleContract.connect(ownerWallet).start()).not.to.be.reverted;

      // run method start() - reverted
      await expect(presaleContract.connect(ownerWallet).start()).to.be.revertedWith(ERRORS.PRESALE_ALREADY_STARTED);
    });

    it('success - owner', async () => {
      // check contract owner - owner
      await checkAddressContractOwner(ownerWallet.address, presaleContract, true);

      // run method start() - successfully
      await expect(presaleContract.connect(ownerWallet).start()).not.to.be.reverted;
    });
  });

  describe('buy', () => {
    it('fail - invalid block.number (Presale: INVALID_DATE)', async () => {
      // TODO
    });

    it('fail - invalid amountUSDC (Presale: ZERO_AMOUNT_USDC)', async () => {
      // set and check amountUSDC
      const amountUSDC = expandTo18Decimals(0);
      expect(amountUSDC).to.be.eq(0);

      // run method buy() - reverted
      await expect(presaleContract.connect(aliceWallet).buy(amountUSDC)).to.be.revertedWith(
        ERRORS.PRESALE_ZERO_AMOUNT_USDC,
      );
    });

    it('fail - invalid transferFromERC20 - not enough allowance, enough balance (SafeTransfer: TRANSFER_FROM)', async () => {
      // set and check amountUSDC
      const amountUSDC = expandTo18Decimals(150);
      expect(amountUSDC).to.be.gt(0);

      // get and check currentAllowanceUSDC
      const currentAllowanceUSDC = await USDC.allowance(aliceWallet.address, presaleContract.address);
      expect(currentAllowanceUSDC).to.be.lt(amountUSDC);

      // get and check beforeBalanceUSDC
      const beforeBalanceUSDC = await USDC.balanceOf(aliceWallet.address);
      expect(beforeBalanceUSDC).to.be.gte(amountUSDC);

      // run method buy() - reverted
      await expect(presaleContract.connect(aliceWallet).buy(amountUSDC)).to.be.revertedWith(
        ERRORS.SAFE_TRANSFER_TRANSFER_FROM,
      );
    });

    it('fail - invalid transferFromERC20 - enough allowance, not enough balance (SafeTransfer: TRANSFER_FROM)', async () => {
      // set and check amountUSDC
      const amountUSDC = expandTo18Decimals(10000000);
      expect(amountUSDC).to.be.gt(0);

      // increase USDC allowance to presaleContract.address
      await USDC.connect(aliceWallet).increaseAllowance(presaleContract.address, amountUSDC);

      // get and check currentAllowanceUSDC
      const currentAllowanceUSDC = await USDC.allowance(aliceWallet.address, presaleContract.address);
      expect(currentAllowanceUSDC).to.be.gte(amountUSDC);

      // get and check beforeBalanceUSDC
      const beforeBalanceUSDC = await USDC.balanceOf(aliceWallet.address);
      expect(beforeBalanceUSDC).to.be.lt(amountUSDC);

      // run method buy() - reverted
      await expect(presaleContract.connect(aliceWallet).buy(amountUSDC)).to.be.revertedWith(
        ERRORS.SAFE_TRANSFER_TRANSFER_FROM,
      );
    });

    it('fail - invalid sendERC20 (SafeTransfer: SEND_ERC20)', async () => {
      // TODO
    });

    it('success', async () => {
      // set and check amountUSDC
      const amountUSDC = expandTo18Decimals(150);
      expect(amountUSDC).to.be.gt(0);

      // increase USDC allowance to presaleContract.address
      await USDC.connect(aliceWallet).increaseAllowance(presaleContract.address, amountUSDC);

      // get and check currentAllowanceUSDC
      const currentAllowanceUSDC = await USDC.allowance(aliceWallet.address, presaleContract.address);
      expect(currentAllowanceUSDC).to.be.gte(amountUSDC);

      // get and check beforeBalanceUSDC
      const beforeBalanceUSDC = await USDC.balanceOf(aliceWallet.address);
      expect(beforeBalanceUSDC).to.be.gte(amountUSDC);

      // get and check beforeBalanceSHBT
      const beforeBalanceSHBT = await sHBT.balanceOf(aliceWallet.address);
      expect(beforeBalanceSHBT).to.be.eq(0);

      // сalculate expectedAmountSHBT
      const expectedAmountSHBT = amountUSDC.mul(oneHbtInWei).div(presaleRate);

      // get and check beforeTotalSold
      const beforeTotalSold = await presaleContract.totalSold();
      expect(beforeTotalSold).to.be.eq(0);

      // get beforePresaleContractBalanceUSDC
      const beforePresaleContractBalanceUSDC = await USDC.balanceOf(presaleContract.address);

      // run method buy() - successfully
      await expect(presaleContract.connect(aliceWallet).buy(amountUSDC)).not.to.be.reverted;

      // get and check afterPresaleContractBalanceUSDC
      const afterPresaleContractBalanceUSDC = await USDC.balanceOf(presaleContract.address);
      expect(afterPresaleContractBalanceUSDC).to.be.eq(beforePresaleContractBalanceUSDC.add(amountUSDC));

      // get and check afterBalanceUSDC
      const afterBalanceUSDC = await USDC.balanceOf(aliceWallet.address);
      expect(afterBalanceUSDC).to.be.eq(beforeBalanceUSDC.sub(amountUSDC));

      // get and check afterBalanceSHBT
      const afterBalanceSHBT = await sHBT.balanceOf(aliceWallet.address);
      expect(afterBalanceSHBT).to.be.eq(beforeBalanceSHBT.add(expectedAmountSHBT));

      // get and check afterTotalSold
      const afterTotalSold = await presaleContract.totalSold();
      expect(afterTotalSold).to.be.eq(beforeTotalSold.add(expectedAmountSHBT));
    });
  });

  describe('purchasedAmount', () => {
    it('success', async () => {
      // get and check beforeBalanceSHBT
      const beforeBalanceSHBT = await sHBT.balanceOf(aliceWallet.address);
      expect(beforeBalanceSHBT).to.be.eq(0);

      // run method purchasedAmount() - successfully
      const beforePurchasedAmount = await presaleContract.purchasedAmount(aliceWallet.address);
      expect(beforePurchasedAmount).to.be.eq(beforeBalanceSHBT);

      // increase USDC allowance to presaleContract.address and run method buy() - successfully
      const amountUSDC = expandTo18Decimals(300);
      await USDC.connect(aliceWallet).increaseAllowance(presaleContract.address, amountUSDC);
      await expect(presaleContract.connect(aliceWallet).buy(amountUSDC)).not.to.be.reverted;

      // сalculate expectedAmountSHBT
      const expectedAmountSHBT = amountUSDC.mul(oneHbtInWei).div(presaleRate);

      // get and check afterBalanceSHBT
      const afterBalanceSHBT = await sHBT.balanceOf(aliceWallet.address);
      expect(afterBalanceSHBT).to.be.eq(beforeBalanceSHBT.add(expectedAmountSHBT));

      // run method purchasedAmount() - successfully
      const afterPurchasedAmount = await presaleContract.purchasedAmount(aliceWallet.address);
      expect(afterPurchasedAmount).to.be.eq(afterBalanceSHBT);
    });
  });

  describe('sendUSDC', () => {
    it('fail - not owner', async () => {
      // set and check amountUSDC
      const amountUSDC = expandTo18Decimals(333);
      expect(amountUSDC).to.be.gt(0);

      // check contract owner - not owner
      await checkAddressContractOwner(aliceWallet.address, presaleContract, false);

      // run method sendUSDC() - reverted
      await expect(presaleContract.connect(aliceWallet).sendUSDC(bobWallet.address, amountUSDC)).to.be.revertedWith(
        ERRORS.IS_NOT_OWNER,
      );
    });

    it('success - owner', async () => {
      // set and check amountUSDC
      const amountUSDC = expandTo18Decimals(333);
      expect(amountUSDC).to.be.gt(0);

      // get beforeBalanceUSDC
      const beforeBalanceUSDC = await USDC.balanceOf(bobWallet.address);

      // get and check beforePresaleContractBalanceUSDC
      const beforePresaleContractBalanceUSDC = await USDC.balanceOf(presaleContract.address);
      expect(beforePresaleContractBalanceUSDC).to.be.gte(amountUSDC);

      // check contract owner - owner
      await checkAddressContractOwner(ownerWallet.address, presaleContract, true);

      // run method sendUSDC() - successfully
      await expect(presaleContract.connect(ownerWallet).sendUSDC(bobWallet.address, amountUSDC)).not.to.be.reverted;

      // get and check afterBalanceUSDC
      const afterBalanceUSDC = await USDC.balanceOf(bobWallet.address);
      expect(afterBalanceUSDC).to.be.eq(beforeBalanceUSDC.add(amountUSDC));

      // get and check beforePresaleContractBalanceUSDC
      const afterPresaleContractBalanceUSDC = await USDC.balanceOf(presaleContract.address);
      expect(afterPresaleContractBalanceUSDC).to.be.eq(beforePresaleContractBalanceUSDC.sub(amountUSDC));
    });
  });
}

async function checkAddressContractOwner(address: string, contract: Contract, expectOwner: boolean): Promise<void> {
  const ownerAddress = await contract.owner();
  if (expectOwner) {
    expect(ownerAddress).to.be.eq(address);
  } else {
    expect(ownerAddress).to.not.be.eq(address);
  }
}
