import chai, { expect } from 'chai';
import { createFixtureLoader, MockProvider, solidity } from 'ethereum-waffle';
import { expandTo18Decimals } from '../shared/utilities';
import { HybridToken } from '../../typechain/HybridToken';
import { IndexStaking } from '../../typechain/IndexStaking';
import { indexStakingFixture, IndexStakingParams } from './indexStakingFixtures';
import { BigNumber } from 'ethers/utils';

chai.use(solidity);

const ERRORS = {
  SAFE_TRANSFER_TRANSFER_FROM: 'SafeTransfer: TRANSFER_FROM',
  SAFE_TRANSFER_SEND_ERC20: 'SafeTransfer: SEND_ERC20',
};

describe('IndexStaking', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999,
  });
  const [ownerWallet, aliceWallet, bobWallet, eveWallet] = provider.getWallets();
  const loadFixture = createFixtureLoader(provider, [ownerWallet]);
  let sToken: HybridToken;
  let rToken: HybridToken;
  let indexStaking: IndexStaking;
  let testStartBlockNumber: number;

  beforeEach(async () => {
    // get testStartBlockNumber
    testStartBlockNumber = await provider.getBlockNumber();

    // load fixture
    const fixture = await loadFixture(indexStakingFixture);

    // update contract variables
    sToken = fixture.stakingToken;
    rToken = fixture.rewardToken;
    indexStaking = fixture.indexStaking;

    // init test action
    await rToken.transfer(indexStaking.address, expandTo18Decimals(1000)); // transfer rToken tokens to indexStaking address
    await sToken.transfer(aliceWallet.address, expandTo18Decimals(1000)); // transfer sToken tokens to Alice address
    await sToken.transfer(bobWallet.address, expandTo18Decimals(750)); // transfer sToken tokens to Bob address
    await sToken.transfer(eveWallet.address, expandTo18Decimals(500)); // transfer sToken tokens to Eve address
  });

  describe('startBlock', () => {
    it('success', async () => {
      const startBlock = await indexStaking.startBlock();
      expect(startBlock).to.be.gt(testStartBlockNumber);
    });
  });

  describe('stakingToken', () => {
    it('success', async () => {
      const stakingToken = await indexStaking.stakingToken();
      expect(stakingToken).to.be.eq(sToken.address);
    });
  });

  describe('rewardToken', () => {
    it('success', async () => {
      const rewardToken = await indexStaking.rewardToken();
      expect(rewardToken).to.be.eq(rToken.address);
    });
  });

  describe('duration', () => {
    it('success', async () => {
      const duration = await indexStaking.duration();
      expect(duration).to.be.eq(IndexStakingParams.duration);
    });
  });

  describe('totalSupply', () => {
    it('success', async () => {
      const totalSupply = await indexStaking.totalSupply();
      expect(totalSupply).to.be.eq(IndexStakingParams.totalSupply);
    });
  });

  describe('rewardSupply', () => {
    it('success', async () => {
      const rewardSupply = await indexStaking.rewardSupply();
      expect(rewardSupply).to.be.eq(IndexStakingParams.rewardSupply);
    });
  });

  describe('deposit', () => {
    it('fail - invalid transferFromERC20 - not enough allowance, enough balance (SafeTransfer: TRANSFER_FROM)', async () => {
      // set and check amountSToken
      const amountSToken = expandTo18Decimals(150);
      expect(amountSToken).to.be.gt(0);

      // get and check currentAllowanceSToken
      const currentAllowanceSToken = await sToken.allowance(aliceWallet.address, indexStaking.address);
      expect(currentAllowanceSToken).to.be.lt(amountSToken);

      // get and check beforeBalanceSToken
      const beforeBalanceSToken = await sToken.balanceOf(aliceWallet.address);
      expect(beforeBalanceSToken).to.be.gte(amountSToken);

      // get and check beforeStake
      const beforeStake = await indexStaking.stake(aliceWallet.address);
      expect(beforeStake).to.be.eq(0);

      // run method deposit() - reverted
      await expect(indexStaking.connect(aliceWallet).deposit(amountSToken)).to.be.revertedWith(
        ERRORS.SAFE_TRANSFER_TRANSFER_FROM,
      );

      // get and check afterStake
      const afterStake = await indexStaking.stake(aliceWallet.address);
      expect(afterStake).to.be.eq(beforeStake);

      // get and check afterBalanceSToken
      const afterBalanceSToken = await sToken.balanceOf(aliceWallet.address);
      expect(afterBalanceSToken).to.be.eq(beforeBalanceSToken);
    });

    it('fail - invalid transferFromERC20 - enough allowance, not enough balance (SafeTransfer: TRANSFER_FROM)', async () => {
      // set and check amountSToken
      const amountSToken = expandTo18Decimals(1500);
      expect(amountSToken).to.be.gt(0);

      // increase sToken allowance to indexStaking.address
      await sToken.connect(aliceWallet).increaseAllowance(indexStaking.address, amountSToken);

      // get and check currentAllowanceSToken
      const currentAllowanceSToken = await sToken.allowance(aliceWallet.address, indexStaking.address);
      expect(currentAllowanceSToken).to.be.gte(amountSToken);

      // get and check beforeBalanceSToken
      const beforeBalanceSToken = await sToken.balanceOf(aliceWallet.address);
      expect(beforeBalanceSToken).to.be.lt(amountSToken);

      // get and check beforeStake
      const beforeStake = await indexStaking.stake(aliceWallet.address);
      expect(beforeStake).to.be.eq(0);

      // run method deposit() - reverted
      await expect(indexStaking.connect(aliceWallet).deposit(amountSToken)).to.be.revertedWith(
        ERRORS.SAFE_TRANSFER_TRANSFER_FROM,
      );

      // get and check afterStake
      const afterStake = await indexStaking.stake(aliceWallet.address);
      expect(afterStake).to.be.eq(beforeStake);

      // get and check afterBalanceSToken
      const afterBalanceSToken = await sToken.balanceOf(aliceWallet.address);
      expect(afterBalanceSToken).to.be.eq(beforeBalanceSToken);
    });

    it('success - amountSToken = 0, current stake = 0', async () => {
      // set and check amountSToken
      const amountSToken = expandTo18Decimals(0);
      expect(amountSToken).to.be.eq(0);

      // get and check currentAllowanceSToken
      const currentAllowanceSToken = await sToken.allowance(aliceWallet.address, indexStaking.address);
      expect(currentAllowanceSToken).to.be.gte(amountSToken);

      // get and check beforeBalanceSToken
      const beforeBalanceSToken = await sToken.balanceOf(aliceWallet.address);
      expect(beforeBalanceSToken).to.be.gte(amountSToken);

      // get and check beforeStake
      const beforeStake = await indexStaking.stake(aliceWallet.address);
      expect(beforeStake).to.be.eq(0);

      // get and check beforeStakedSnapshot
      const beforeStakedSnapshot = await indexStaking.stakedSnapshot(aliceWallet.address);
      expect(beforeStakedSnapshot).to.be.eq(0);

      // get and check beforeActiveStakeDeposits
      const beforeActiveStakeDeposits = await indexStaking.activeStakeDeposits();
      expect(beforeActiveStakeDeposits).to.be.eq(0);

      // get and check beforeIndexStakingBalanceSToken
      const beforeIndexStakingBalanceSToken = await sToken.balanceOf(indexStaking.address);
      expect(beforeIndexStakingBalanceSToken).to.be.eq(0);

      // run method deposit() - successfully
      await expect(indexStaking.connect(aliceWallet).deposit(amountSToken)).not.to.be.reverted;

      // get and check afterIndexStakingBalanceSToken
      const afterIndexStakingBalanceSToken = await sToken.balanceOf(indexStaking.address);
      expect(afterIndexStakingBalanceSToken).to.be.eq(beforeIndexStakingBalanceSToken);

      // get and check afterActiveStakeDeposits
      const afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
      expect(afterActiveStakeDeposits).to.be.eq(beforeActiveStakeDeposits);

      // get and check afterStakedSnapshot
      const afterStakedSnapshot = await indexStaking.stakedSnapshot(aliceWallet.address);
      expect(afterStakedSnapshot).to.be.eq(beforeStakedSnapshot);

      // get and check afterStake
      const afterStake = await indexStaking.stake(aliceWallet.address);
      expect(afterStake).to.be.eq(beforeStake);
      expect(afterStake).to.be.eq(amountSToken);

      // get and check afterBalanceSToken
      const afterBalanceSToken = await sToken.balanceOf(aliceWallet.address);
      expect(afterBalanceSToken).to.be.eq(beforeBalanceSToken);
    });

    it('success - amountSToken > 0, current stake = 0', async () => {
      // set and check amountSToken
      const amountSToken = expandTo18Decimals(150);
      expect(amountSToken).to.be.gt(0);

      // increase sToken allowance to indexStaking.address
      await sToken.connect(aliceWallet).increaseAllowance(indexStaking.address, amountSToken);

      // get and check currentAllowanceSToken
      const currentAllowanceSToken = await sToken.allowance(aliceWallet.address, indexStaking.address);
      expect(currentAllowanceSToken).to.be.gte(amountSToken);

      // get and check beforeBalanceSToken
      const beforeBalanceSToken = await sToken.balanceOf(aliceWallet.address);
      expect(beforeBalanceSToken).to.be.gte(amountSToken);

      // get and check beforeStake
      const beforeStake = await indexStaking.stake(aliceWallet.address);
      expect(beforeStake).to.be.eq(0);

      // get and check beforeStakedSnapshot
      const beforeStakedSnapshot = await indexStaking.stakedSnapshot(aliceWallet.address);
      expect(beforeStakedSnapshot).to.be.eq(0);

      // get and check beforeActiveStakeDeposits
      const beforeActiveStakeDeposits = await indexStaking.activeStakeDeposits();
      expect(beforeActiveStakeDeposits).to.be.eq(0);

      // get and check beforeIndexStakingBalanceSToken
      const beforeIndexStakingBalanceSToken = await sToken.balanceOf(indexStaking.address);
      expect(beforeIndexStakingBalanceSToken).to.be.eq(0);

      // run method deposit() - successfully
      await expect(indexStaking.connect(aliceWallet).deposit(amountSToken)).not.to.be.reverted;

      // get and check afterIndexStakingBalanceSToken
      const afterIndexStakingBalanceSToken = await sToken.balanceOf(indexStaking.address);
      expect(afterIndexStakingBalanceSToken).to.be.eq(beforeIndexStakingBalanceSToken.add(amountSToken));

      // get and check afterActiveStakeDeposits
      const afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
      expect(afterActiveStakeDeposits).to.be.eq(beforeActiveStakeDeposits.add(amountSToken));

      // get and check afterStakedSnapshot
      const afterStakedSnapshot = await indexStaking.stakedSnapshot(aliceWallet.address);
      expect(afterStakedSnapshot).to.be.eq(beforeStakedSnapshot);

      // get and check afterStake
      const afterStake = await indexStaking.stake(aliceWallet.address);
      expect(afterStake).not.to.be.eq(beforeStake);
      expect(afterStake).to.be.eq(amountSToken);

      // get and check afterBalanceSToken
      const afterBalanceSToken = await sToken.balanceOf(aliceWallet.address);
      expect(afterBalanceSToken).to.be.eq(beforeBalanceSToken.sub(amountSToken));
    });

    it('success - amountSToken = 0, current stake > 0', async () => {
      // TODO
    });

    it('success - amountSToken > 0, current stake > 0', async () => {
      // TODO
    });
  });

  describe('stake', () => {
    it('success', async () => {
      // get and check beforeStake
      const beforeStake = await indexStaking.stake(aliceWallet.address);
      expect(beforeStake).to.be.eq(0);

      // increase sToken allowance to indexStaking.address and run method deposit() - successfully
      const depositAmountSToken = expandTo18Decimals(100);
      await sToken.connect(aliceWallet).increaseAllowance(indexStaking.address, depositAmountSToken);
      await expect(indexStaking.connect(aliceWallet).deposit(depositAmountSToken)).not.to.be.reverted;

      // get and check afterStake
      let afterStake = await indexStaking.stake(aliceWallet.address);
      expect(afterStake).to.be.eq(depositAmountSToken);

      // increase sToken allowance to indexStaking.address and run method withdraw(withdrawAmountSToken) - successfully
      const withdrawAmountSToken = expandTo18Decimals(30);
      expect(withdrawAmountSToken).to.be.lt(afterStake);
      const remainderStake = afterStake.sub(withdrawAmountSToken);
      expect(remainderStake).to.be.gt(0);
      await sToken.connect(aliceWallet).increaseAllowance(indexStaking.address, remainderStake);
      await expect(indexStaking.connect(aliceWallet).withdraw(withdrawAmountSToken)).not.to.be.reverted;

      // get and check afterStake
      afterStake = await indexStaking.stake(aliceWallet.address);
      expect(afterStake).to.be.eq(remainderStake);

      // run method withdraw() - successfully
      await expect(indexStaking.connect(aliceWallet)['withdraw()']()).not.to.be.reverted;

      // get and check afterStake
      afterStake = await indexStaking.stake(aliceWallet.address);
      expect(afterStake).to.be.eq(0);
    });
  });

  describe('activeStakeDeposits', () => {
    it('success', async () => {
      // get and check beforeActiveStakeDeposits
      const beforeActiveStakeDeposits = await indexStaking.activeStakeDeposits();
      expect(beforeActiveStakeDeposits).to.be.eq(0);

      // set walletDataList
      const walletDataList = [
        { wallet: aliceWallet, amountSToken: expandTo18Decimals(100) },
        { wallet: bobWallet, amountSToken: expandTo18Decimals(50) },
        { wallet: eveWallet, amountSToken: expandTo18Decimals(25) },
      ];

      // set expectedActiveStakeDeposits
      let expectedActiveStakeDeposits = new BigNumber(0);

      // deposit staking token for walletDataList, check activeStakeDeposits
      for (const walletData of walletDataList) {
        // get and check beforeStake
        const beforeStake = await indexStaking.stake(walletData.wallet.address);
        expect(beforeStake).to.be.eq(0);

        // increase sToken allowance to indexStaking.address and run method deposit() - successfully
        await sToken.connect(walletData.wallet).increaseAllowance(indexStaking.address, walletData.amountSToken);
        await expect(indexStaking.connect(walletData.wallet).deposit(walletData.amountSToken)).not.to.be.reverted;

        // update expectedActiveStakeDeposits
        expectedActiveStakeDeposits = expectedActiveStakeDeposits.add(walletData.amountSToken);

        // get and check afterActiveStakeDeposits
        const afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
        expect(afterActiveStakeDeposits).to.be.eq(expectedActiveStakeDeposits);

        // get and check afterStake
        const afterStake = await indexStaking.stake(walletData.wallet.address);
        expect(afterStake).to.be.eq(walletData.amountSToken);
      }

      // withdraw staking token for walletDataList, check activeStakeDeposits
      for (const walletData of walletDataList) {
        // get and check beforeStake
        const beforeStake = await indexStaking.stake(walletData.wallet.address);
        expect(beforeStake).to.be.gt(0);

        // run method withdraw() - successfully
        await expect(indexStaking.connect(walletData.wallet)['withdraw()']()).not.to.be.reverted;

        // update expectedActiveStakeDeposits
        expectedActiveStakeDeposits = expectedActiveStakeDeposits.sub(beforeStake);

        // get and check afterActiveStakeDeposits
        const afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
        expect(afterActiveStakeDeposits).to.be.eq(expectedActiveStakeDeposits);

        // get and check afterStake
        const afterStake = await indexStaking.stake(walletData.wallet.address);
        expect(afterStake).to.be.eq(0);
      }

      // get and check afterActiveStakeDeposits
      const afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
      expect(afterActiveStakeDeposits).to.be.eq(0);
    });
  });
});
