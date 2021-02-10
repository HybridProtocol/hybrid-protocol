import hre from 'hardhat';
import { expect } from 'chai';
import { BigNumber, Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { presaleDuration, presaleFixture } from './presaleFixtures';
import { SaleHybridToken } from '../../typechain/SaleHybridToken';
import { expandTo18Decimals, mineBlocks } from '../shared/utilities';

const ERRORS = {
  IS_NOT_OWNER: 'Ownable: caller is not the owner',
  PRESALE_ALREADY_STARTED: 'Presale: ALREADY_STARTED',
  PRESALE_INVALID_DATE: 'Presale: INVALID_DATE',
  PRESALE_ZERO_AMOUNT_USDC: 'Presale: ZERO_AMOUNT_USDC',
  PRESALE_ZERO_AMOUNT_SHBT: 'Presale: ZERO_AMOUNT_SHBT',
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

  describe('Test active presale address', async () => {
    it('success', async () => {
      let presaleAddress;
      const nullAddress = '0x0000000000000000000000000000000000000000';
      const [ownerWallet, aliceWallet] = await hre.ethers.getSigners();

      // load fixture
      const fixture = await presaleFixture([ownerWallet]);

      // get alphaPresale, betaPresale and gammaPresale contracts
      const alphaPresale = fixture.alphaPresale;
      const betaPresale = fixture.betaPresale;
      const gammaPresale = fixture.gammaPresale;

      // get sHBT contact
      const sHBT = fixture.sHBT;
      await sHBT.mintPresale(fixture.alphaPresale.address, fixture.betaPresale.address, fixture.gammaPresale.address);
      await sHBT.addAddressesToMaintainers([
        fixture.alphaPresale.address,
        fixture.betaPresale.address,
        fixture.gammaPresale.address,
      ]);

      // get activePresaleAddress from sHBT contract
      const contractList = [alphaPresale, betaPresale, gammaPresale];
      for (const contract of contractList) {
        // before start contract
        presaleAddress = await sHBT.connect(aliceWallet).activePresaleAddress();
        expect(presaleAddress).to.be.eq(nullAddress);

        // after start contract
        await contract.connect(ownerWallet).start();
        presaleAddress = await sHBT.connect(aliceWallet).activePresaleAddress();
        expect(presaleAddress).to.be.eq(contract.address);

        // after mine presaleDuration + 1 blocks
        await mineBlocks(hre.ethers.provider, presaleDuration + 1);
        presaleAddress = await sHBT.connect(aliceWallet).activePresaleAddress();
        expect(presaleAddress).to.be.eq(nullAddress);
      }
    });
  });
});

async function testPresaleContracts(
  presaleContractName: string,
  presaleLimitMethodName: string,
  presaleRateMethodName: string,
  purchaseLimitMethodName: string,
): Promise<void> {
  let USDC: Contract;
  let sHBT: SaleHybridToken;
  let presaleContract: Contract;
  let oneHbtInWei: BigNumber;
  let presaleLimit: BigNumber;
  let presaleRate: BigNumber;
  let purchaseLimit: BigNumber;
  let ownerWallet: SignerWithAddress;
  let aliceWallet: SignerWithAddress;
  let bobWallet: SignerWithAddress;
  let eveWallet: SignerWithAddress;

  beforeEach(async () => {
    [ownerWallet, aliceWallet, bobWallet, eveWallet] = await hre.ethers.getSigners();

    // load fixture
    const fixture = await presaleFixture([ownerWallet]);

    // update contract variables
    USDC = fixture.USDC;
    sHBT = fixture.sHBT;
    presaleContract = (fixture as any)[presaleContractName];

    // update contract constants
    oneHbtInWei = await presaleContract.ONE_HBT_IN_WEI();
    presaleLimit = await presaleContract[presaleLimitMethodName]();
    presaleRate = await presaleContract[presaleRateMethodName]();
    purchaseLimit = await presaleContract[purchaseLimitMethodName]();

    // init test action
    await sHBT.mintPresale(fixture.alphaPresale.address, fixture.betaPresale.address, fixture.gammaPresale.address); // send sHBT tokens to alphaPresale, betaPresale and gammaPresale addresses
    await sHBT.addAddressesToMaintainers([
      fixture.alphaPresale.address,
      fixture.betaPresale.address,
      fixture.gammaPresale.address,
    ]);
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

  describe('buy', async () => {
    beforeEach(async () => {
      // start presale
      await presaleContract.connect(ownerWallet).start();
    });

    it('fail - invalid block.number (Presale: INVALID_DATE)', async () => {
      // mine blocks
      await mineBlocks(hre.ethers.provider, presaleDuration);

      // set and check amountUSDC
      const amountUSDC = expandTo18Decimals(150);
      expect(amountUSDC).to.be.gt(0);

      // run method buy() - reverted
      await expect(presaleContract.connect(aliceWallet).buy(amountUSDC)).to.be.revertedWith(
        ERRORS.PRESALE_INVALID_DATE,
      );
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
      const amountUSDC = expandTo18Decimals(15000);
      expect(amountUSDC).to.be.gt(0);

      // increase USDC allowance to presaleContract.address
      await USDC.connect(eveWallet).increaseAllowance(presaleContract.address, amountUSDC);

      // get and check currentAllowanceUSDC
      const currentAllowanceUSDC = await USDC.allowance(eveWallet.address, presaleContract.address);
      expect(currentAllowanceUSDC).to.be.gte(amountUSDC);

      // get and check beforeBalanceUSDC
      const beforeBalanceUSDC = await USDC.balanceOf(eveWallet.address);
      expect(beforeBalanceUSDC).to.be.lt(amountUSDC);

      // run method buy() - reverted
      await expect(presaleContract.connect(eveWallet).buy(amountUSDC)).to.be.revertedWith(
        ERRORS.SAFE_TRANSFER_TRANSFER_FROM,
      );
    });

    // it('fail - invalid sendERC20 (SafeTransfer: SEND_ERC20)', async () => {
    //   const [ownerWallet, aliceWallet, bobWallet] = await hre.ethers.getSigners();
    //   // get eth balance
    //   const beforeOwnerWalletBalanceEth = await ownerWallet.getBalance();

    //   // create transactionRequest: send all eth from ownerWallet to some other wallet
    //   const transactionRequest = {
    //     to: bobWallet.address,
    //     nonce: ownerWallet.getTransactionCount(),
    //     gasLimit: BigNumber.from(21000),
    //     gasPrice: BigNumber.from(1),
    //     value: beforeOwnerWalletBalanceEth.sub(BigNumber.from(21000).mul(1)),
    //   };

    //   // send eth transaction
    //   await ownerWallet.sendTransaction(transactionRequest);

    //   // get and check eth balance
    //   const afterOwnerWalletBalanceEth = await ownerWallet.getBalance();
    //   expect(afterOwnerWalletBalanceEth).to.be.eq(0);

    //   // set and check amountUSDC
    //   const amountUSDC = expandTo18Decimals(150);
    //   expect(amountUSDC).to.be.gt(0);

    //   // increase USDC allowance to presaleContract.address
    //   await USDC.connect(aliceWallet).increaseAllowance(presaleContract.address, amountUSDC);

    //   // get and check currentAllowanceUSDC
    //   const currentAllowanceUSDC = await USDC.allowance(aliceWallet.address, presaleContract.address);
    //   expect(currentAllowanceUSDC).to.be.gte(amountUSDC);

    //   // get and check beforeBalanceUSDC
    //   const beforeBalanceUSDC = await USDC.balanceOf(aliceWallet.address);
    //   expect(beforeBalanceUSDC).to.be.gte(amountUSDC);

    //   // run method buy() - reverted
    //   await expect(presaleContract.connect(aliceWallet).buy(amountUSDC)).not.to.revertedWith(
    //     ERRORS.SAFE_TRANSFER_SEND_ERC20,
    //   );
    // });

    it('success - buy sHBT count <= purchaseLimit', async () => {
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
      expect(expectedAmountSHBT).to.be.lte(purchaseLimit);

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
      expect(afterTotalSold).to.be.lt(presaleLimit);
    });

    it('success - buy sHBT count > purchaseLimit', async () => {
      // set and check amountUSDC
      const amountUSDC = expandTo18Decimals(1000000);
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
      expect(expectedAmountSHBT).to.be.gt(purchaseLimit);

      // correct variables
      const correctedExpectedAmountSHBT = purchaseLimit;
      const correctedAmountUSDC = correctedExpectedAmountSHBT.mul(presaleRate).div(oneHbtInWei);

      // get and check beforeTotalSold
      const beforeTotalSold = await presaleContract.totalSold();
      expect(beforeTotalSold).to.be.eq(0);

      // get beforePresaleContractBalanceUSDC
      const beforePresaleContractBalanceUSDC = await USDC.balanceOf(presaleContract.address);

      // run method buy() - successfully
      await expect(presaleContract.connect(aliceWallet).buy(amountUSDC)).not.to.be.reverted;

      // get and check afterPresaleContractBalanceUSDC
      const afterPresaleContractBalanceUSDC = await USDC.balanceOf(presaleContract.address);
      expect(afterPresaleContractBalanceUSDC).to.be.eq(beforePresaleContractBalanceUSDC.add(correctedAmountUSDC));

      // get and check afterBalanceUSDC
      const afterBalanceUSDC = await USDC.balanceOf(aliceWallet.address);
      expect(afterBalanceUSDC).to.be.eq(beforeBalanceUSDC.sub(correctedAmountUSDC));

      // get and check afterBalanceSHBT
      const afterBalanceSHBT = await sHBT.balanceOf(aliceWallet.address);
      expect(afterBalanceSHBT).to.be.eq(beforeBalanceSHBT.add(correctedExpectedAmountSHBT));

      // get and check afterTotalSold
      const afterTotalSold = await presaleContract.totalSold();
      expect(afterTotalSold).to.be.eq(beforeTotalSold.add(correctedExpectedAmountSHBT));
      expect(afterTotalSold).to.be.lt(presaleLimit);
    });

    it('success - two buys, each buy sHBT count > purchaseLimit', async () => {
      // set and check amountUSDC
      const totalAmountUSDC = expandTo18Decimals(1000000);
      const amount1USDC = totalAmountUSDC.div(2);
      const amount2USDC = totalAmountUSDC.sub(amount1USDC);
      expect(amount1USDC).to.be.gt(0);
      expect(amount2USDC).to.be.gt(0);

      // increase USDC allowance to presaleContract.address
      await USDC.connect(aliceWallet).increaseAllowance(presaleContract.address, totalAmountUSDC);

      // get and check currentAllowanceUSDC
      const currentAllowanceUSDC = await USDC.allowance(aliceWallet.address, presaleContract.address);
      expect(currentAllowanceUSDC).to.be.gte(totalAmountUSDC);

      // get and check beforeBalanceUSDC
      const beforeBalanceUSDC = await USDC.balanceOf(aliceWallet.address);
      expect(beforeBalanceUSDC).to.be.gte(totalAmountUSDC);

      // get and check beforeBalanceSHBT
      const beforeBalanceSHBT = await sHBT.balanceOf(aliceWallet.address);
      expect(beforeBalanceSHBT).to.be.eq(0);

      // сalculate expectedAmountSHBT
      const expectedAmountSHBT = amount1USDC.mul(oneHbtInWei).div(presaleRate);
      expect(expectedAmountSHBT).to.be.gt(purchaseLimit);

      // correct variables
      const correctedExpectedAmountSHBT = purchaseLimit;
      const correctedAmountUSDC = correctedExpectedAmountSHBT.mul(presaleRate).div(oneHbtInWei);

      // get and check beforeTotalSold
      const beforeTotalSold = await presaleContract.totalSold();
      expect(beforeTotalSold).to.be.eq(0);

      // get beforePresaleContractBalanceUSDC
      const beforePresaleContractBalanceUSDC = await USDC.balanceOf(presaleContract.address);

      // run method buy() - first buy successfully
      await expect(presaleContract.connect(aliceWallet).buy(amount1USDC)).not.to.be.reverted;

      // run method buy() - second buy reverted
      await expect(presaleContract.connect(aliceWallet).buy(amount2USDC)).to.be.revertedWith(
        ERRORS.PRESALE_ZERO_AMOUNT_USDC,
      );

      // get and check afterPresaleContractBalanceUSDC
      const afterPresaleContractBalanceUSDC = await USDC.balanceOf(presaleContract.address);
      expect(afterPresaleContractBalanceUSDC).to.be.eq(beforePresaleContractBalanceUSDC.add(correctedAmountUSDC));

      // get and check afterBalanceUSDC
      const afterBalanceUSDC = await USDC.balanceOf(aliceWallet.address);
      expect(afterBalanceUSDC).to.be.eq(beforeBalanceUSDC.sub(correctedAmountUSDC));

      // get and check afterBalanceSHBT
      const afterBalanceSHBT = await sHBT.balanceOf(aliceWallet.address);
      expect(afterBalanceSHBT).to.be.eq(beforeBalanceSHBT.add(correctedExpectedAmountSHBT));

      // get and check afterTotalSold
      const afterTotalSold = await presaleContract.totalSold();
      expect(afterTotalSold).to.be.eq(beforeTotalSold.add(correctedExpectedAmountSHBT));
      expect(afterTotalSold).to.be.lt(presaleLimit);
    });
  });

  describe('purchasedAmount', () => {
    beforeEach(async () => {
      // start presale
      await presaleContract.connect(ownerWallet).start();
    });

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
    beforeEach(async () => {
      // start presale
      await presaleContract.connect(ownerWallet).start();
    });

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

  describe('presaleIsActive', () => {
    it('success', async () => {
      let presaleIsActive: boolean;

      // before start, isActive should be false
      presaleIsActive = await presaleContract.connect(aliceWallet).presaleIsActive();
      expect(presaleIsActive).to.be.eq(false);

      // after start, isActive should be true
      await presaleContract.connect(ownerWallet).start();
      presaleIsActive = await presaleContract.connect(aliceWallet).presaleIsActive();
      expect(presaleIsActive).to.be.eq(true);

      // after mine presaleDuration - 5 blocks, isActive should be true
      await mineBlocks(hre.ethers.provider, presaleDuration - 5);
      presaleIsActive = await presaleContract.connect(aliceWallet).presaleIsActive();
      expect(presaleIsActive).to.be.eq(true);

      // after mine 6 blocks, isActive should be false
      await mineBlocks(hre.ethers.provider, 6);
      presaleIsActive = await presaleContract.connect(aliceWallet).presaleIsActive();
      expect(presaleIsActive).to.be.eq(false);
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
