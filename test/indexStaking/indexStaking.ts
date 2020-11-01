import chai, { expect } from 'chai';
import { createFixtureLoader, MockProvider, solidity } from 'ethereum-waffle';
import { Web3Provider } from 'ethers/providers';
import { BigNumber } from 'ethers/utils';
import { Wallet } from 'ethers';
import { expandTo18Decimals, mineBlocks } from '../shared/utilities';
import { HybridToken } from '../../typechain/HybridToken';
import { IndexStaking } from '../../typechain/IndexStaking';
import { indexStakingFixture, IndexStakingParams } from './indexStakingFixtures';

chai.use(solidity);

const ERRORS = {
  SAFE_TRANSFER_TRANSFER_FROM: 'SafeTransfer: TRANSFER_FROM',
  SAFE_TRANSFER_SEND_ERC20: 'SafeTransfer: SEND_ERC20',
  SAFE_MATH_OVERFLOW: 'SafeMath: subtraction overflow',
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
    await rToken.transfer(indexStaking.address, IndexStakingParams.rewardSupply); // transfer rToken tokens to indexStaking address
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

  describe('withdraw', () => {
    it('fail - withdraw part, amount > stake balance', async () => {
      // set and check amountSToken
      const amountSToken = expandTo18Decimals(100);
      expect(amountSToken).to.be.gt(0);

      // get and check beforeStake
      const beforeStake = await indexStaking.stake(aliceWallet.address);
      expect(beforeStake).to.be.lt(amountSToken);

      // run method withdraw() - reverted
      await expect(indexStaking.connect(aliceWallet).withdraw(amountSToken)).to.be.revertedWith(
        ERRORS.SAFE_MATH_OVERFLOW,
      );
    });

    it('success - withdraw all, before past contract duration', async () => {
      // set walletDataList
      const walletDataList = [
        { wallet: aliceWallet, amountSToken: expandTo18Decimals(100) },
        { wallet: bobWallet, amountSToken: expandTo18Decimals(50) },
        { wallet: eveWallet, amountSToken: expandTo18Decimals(25) },
      ];

      // deposit staking token for walletDataList
      for (const walletData of walletDataList) {
        // get and check beforeBalanceSToken
        const beforeBalanceSToken = await sToken.balanceOf(walletData.wallet.address);
        expect(beforeBalanceSToken).to.be.gte(walletData.amountSToken);

        // get and check beforeStake
        const beforeStake = await indexStaking.stake(walletData.wallet.address);
        expect(beforeStake).to.be.eq(0);

        // increase sToken allowance to indexStaking.address and run method deposit() - successfully
        await sToken.connect(walletData.wallet).increaseAllowance(indexStaking.address, walletData.amountSToken);
        await expect(indexStaking.connect(walletData.wallet).deposit(walletData.amountSToken)).not.to.be.reverted;

        // get and check afterStake
        const afterStake = await indexStaking.stake(walletData.wallet.address);
        expect(afterStake).to.be.eq(walletData.amountSToken);

        // get and check afterBalanceSToken
        const afterBalanceSToken = await sToken.balanceOf(walletData.wallet.address);
        expect(afterBalanceSToken).to.be.eq(beforeBalanceSToken.sub(walletData.amountSToken));
      }

      // get expectedActiveStakeDeposits
      let expectedActiveStakeDeposits = walletDataList.reduce(
        (totalAmount: BigNumber, item: any) => totalAmount.add(item.amountSToken),
        new BigNumber(0),
      );

      // get and check afterActiveStakeDeposits
      let afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
      expect(afterActiveStakeDeposits).to.be.eq(expectedActiveStakeDeposits);

      // get and check expectedStaked
      let expectedStaked = await indexStaking.staked();
      expect(expectedStaked).to.be.eq(0);

      // get and check expectedAccumulatedReward
      let expectedAccumulatedReward = await indexStaking.accumulatedReward();
      expect(expectedAccumulatedReward).to.be.eq(0);

      // mine some blocks
      await mineBlocks(provider, 5);

      // withdraw staking token for walletDataList
      for (const walletData of walletDataList) {
        // get beforeBalanceSToken
        const beforeBalanceSToken = await sToken.balanceOf(walletData.wallet.address);

        // get beforeBalanceRToken
        const beforeBalanceRToken = await rToken.balanceOf(walletData.wallet.address);

        // get beforeStakedSnapshot
        const beforeStakedSnapshot = await indexStaking.stakedSnapshot(walletData.wallet.address);

        // get and check beforeStake
        const beforeStake = await indexStaking.stake(walletData.wallet.address);
        expect(beforeStake).to.be.eq(walletData.amountSToken);

        // get and check expectedUserRewardParams
        const expectedUserRewardParams = await calculateExpectedUserRewardParams(
          provider,
          indexStaking,
          walletData.wallet,
        );
        expect(expectedUserRewardParams.userDeposit).to.be.eq(beforeStake);
        expect(expectedUserRewardParams.userReward).to.be.eq(
          expectedUserRewardParams.userDeposit.mul(
            expectedUserRewardParams.staked.sub(expectedUserRewardParams.userStakedSnapshot),
          ),
        );
        expect(expectedUserRewardParams.userStake).to.be.eq(0);
        expect(expectedUserRewardParams.userStakedSnapshot).to.be.eq(beforeStakedSnapshot);
        expect(expectedUserRewardParams.reward).to.be.gte(0);
        expect(expectedUserRewardParams.accumulatedReward).to.be.eq(
          expectedAccumulatedReward.add(expectedUserRewardParams.reward),
        );
        expect(expectedUserRewardParams.activeStakeDeposits).to.be.eq(
          expectedActiveStakeDeposits.sub(expectedUserRewardParams.userDeposit),
        );
        expect(expectedUserRewardParams.staked).to.be.eq(
          !expectedActiveStakeDeposits.eq(0)
            ? expectedStaked.add(expectedUserRewardParams.reward.div(expectedActiveStakeDeposits))
            : expectedStaked,
        );

        // run method withdraw() - successfully
        await expect(indexStaking.connect(walletData.wallet)['withdraw()']()).not.to.be.reverted;

        // get and check afterStake
        const afterStake = await indexStaking.stake(walletData.wallet.address);
        expect(afterStake).to.be.eq(expectedUserRewardParams.userStake);

        // get afterStakedSnapshot
        const afterStakedSnapshot = await indexStaking.stakedSnapshot(walletData.wallet.address);
        expect(afterStakedSnapshot).to.be.eq(expectedUserRewardParams.userStakedSnapshot);

        // get and check afterBalanceRToken
        const afterBalanceRToken = await rToken.balanceOf(walletData.wallet.address);
        expect(afterBalanceRToken).to.be.eq(beforeBalanceRToken.add(expectedUserRewardParams.userReward));

        // get and check afterBalanceSToken
        const afterBalanceSToken = await sToken.balanceOf(walletData.wallet.address);
        expect(afterBalanceSToken).to.be.eq(beforeBalanceSToken.add(expectedUserRewardParams.userDeposit));

        // get and check afterAccumulatedReward
        const afterAccumulatedReward = await indexStaking.accumulatedReward();
        expect(afterAccumulatedReward).to.be.eq(expectedUserRewardParams.accumulatedReward);

        // get and check afterActiveStakeDeposits
        afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
        expect(afterActiveStakeDeposits).to.be.eq(expectedUserRewardParams.activeStakeDeposits);

        // get and check afterStaked
        const afterStaked = await indexStaking.staked();
        expect(afterStaked).to.be.eq(expectedUserRewardParams.staked);

        // update expectedAccumulatedReward
        expectedAccumulatedReward = expectedUserRewardParams.accumulatedReward;

        // update expectedActiveStakeDeposits
        expectedActiveStakeDeposits = expectedUserRewardParams.activeStakeDeposits;

        // update expectedStaked
        expectedStaked = expectedUserRewardParams.staked;
      }

      // get and check afterActiveStakeDeposits, expectedActiveStakeDeposits
      afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
      expect(afterActiveStakeDeposits).to.be.eq(expectedActiveStakeDeposits);
      expect(expectedActiveStakeDeposits).to.be.eq(0);
    });

    it('success - withdraw all, after past contract duration', async () => {
      // set walletDataList
      const walletDataList = [
        { wallet: aliceWallet, amountSToken: expandTo18Decimals(100) },
        { wallet: bobWallet, amountSToken: expandTo18Decimals(50) },
        { wallet: eveWallet, amountSToken: expandTo18Decimals(25) },
      ];

      // deposit staking token for walletDataList
      for (const walletData of walletDataList) {
        // get and check beforeBalanceSToken
        const beforeBalanceSToken = await sToken.balanceOf(walletData.wallet.address);
        expect(beforeBalanceSToken).to.be.gte(walletData.amountSToken);

        // get and check beforeStake
        const beforeStake = await indexStaking.stake(walletData.wallet.address);
        expect(beforeStake).to.be.eq(0);

        // increase sToken allowance to indexStaking.address and run method deposit() - successfully
        await sToken.connect(walletData.wallet).increaseAllowance(indexStaking.address, walletData.amountSToken);
        await expect(indexStaking.connect(walletData.wallet).deposit(walletData.amountSToken)).not.to.be.reverted;

        // get and check afterStake
        const afterStake = await indexStaking.stake(walletData.wallet.address);
        expect(afterStake).to.be.eq(walletData.amountSToken);

        // get and check afterBalanceSToken
        const afterBalanceSToken = await sToken.balanceOf(walletData.wallet.address);
        expect(afterBalanceSToken).to.be.eq(beforeBalanceSToken.sub(walletData.amountSToken));
      }

      // get expectedActiveStakeDeposits
      let expectedActiveStakeDeposits = walletDataList.reduce(
        (totalAmount: BigNumber, item: any) => totalAmount.add(item.amountSToken),
        new BigNumber(0),
      );

      // get and check afterActiveStakeDeposits
      let afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
      expect(afterActiveStakeDeposits).to.be.eq(expectedActiveStakeDeposits);

      // get and check expectedStaked
      let expectedStaked = await indexStaking.staked();
      expect(expectedStaked).to.be.eq(0);

      // get and check expectedAccumulatedReward
      let expectedAccumulatedReward = await indexStaking.accumulatedReward();
      expect(expectedAccumulatedReward).to.be.eq(0);

      // mine some blocks
      await mineBlocks(provider, IndexStakingParams.duration);

      // withdraw staking token for walletDataList
      for (const walletData of walletDataList) {
        // get beforeBalanceSToken
        const beforeBalanceSToken = await sToken.balanceOf(walletData.wallet.address);

        // get beforeBalanceRToken
        const beforeBalanceRToken = await rToken.balanceOf(walletData.wallet.address);

        // get beforeStakedSnapshot
        const beforeStakedSnapshot = await indexStaking.stakedSnapshot(walletData.wallet.address);

        // get and check beforeStake
        const beforeStake = await indexStaking.stake(walletData.wallet.address);
        expect(beforeStake).to.be.eq(walletData.amountSToken);

        // get and check expectedUserRewardParams
        const expectedUserRewardParams = await calculateExpectedUserRewardParams(
          provider,
          indexStaking,
          walletData.wallet,
        );
        expect(expectedUserRewardParams.userDeposit).to.be.eq(beforeStake);
        expect(expectedUserRewardParams.userReward).to.be.eq(
          expectedUserRewardParams.userDeposit.mul(
            expectedUserRewardParams.staked.sub(expectedUserRewardParams.userStakedSnapshot),
          ),
        );
        expect(expectedUserRewardParams.userStake).to.be.eq(0);
        expect(expectedUserRewardParams.userStakedSnapshot).to.be.eq(beforeStakedSnapshot);
        expect(expectedUserRewardParams.reward).to.be.gte(0);
        expect(expectedUserRewardParams.accumulatedReward).to.be.eq(
          expectedAccumulatedReward.add(expectedUserRewardParams.reward),
        );
        expect(expectedUserRewardParams.activeStakeDeposits).to.be.eq(
          expectedActiveStakeDeposits.sub(expectedUserRewardParams.userDeposit),
        );
        expect(expectedUserRewardParams.staked).to.be.eq(
          !expectedActiveStakeDeposits.eq(0)
            ? expectedStaked.add(expectedUserRewardParams.reward.div(expectedActiveStakeDeposits))
            : expectedStaked,
        );

        // run method withdraw() - successfully
        await expect(indexStaking.connect(walletData.wallet)['withdraw()']()).not.to.be.reverted;

        // get and check afterStake
        const afterStake = await indexStaking.stake(walletData.wallet.address);
        expect(afterStake).to.be.eq(expectedUserRewardParams.userStake);

        // get afterStakedSnapshot
        const afterStakedSnapshot = await indexStaking.stakedSnapshot(walletData.wallet.address);
        expect(afterStakedSnapshot).to.be.eq(expectedUserRewardParams.userStakedSnapshot);

        // get and check afterBalanceRToken
        const afterBalanceRToken = await rToken.balanceOf(walletData.wallet.address);
        expect(afterBalanceRToken).to.be.eq(beforeBalanceRToken.add(expectedUserRewardParams.userReward));

        // get and check afterBalanceSToken
        const afterBalanceSToken = await sToken.balanceOf(walletData.wallet.address);
        expect(afterBalanceSToken).to.be.eq(beforeBalanceSToken.add(expectedUserRewardParams.userDeposit));

        // get and check afterAccumulatedReward
        const afterAccumulatedReward = await indexStaking.accumulatedReward();
        expect(afterAccumulatedReward).to.be.eq(expectedUserRewardParams.accumulatedReward);

        // get and check afterActiveStakeDeposits
        afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
        expect(afterActiveStakeDeposits).to.be.eq(expectedUserRewardParams.activeStakeDeposits);

        // get and check afterStaked
        const afterStaked = await indexStaking.staked();
        expect(afterStaked).to.be.eq(expectedUserRewardParams.staked);

        // update expectedAccumulatedReward
        expectedAccumulatedReward = expectedUserRewardParams.accumulatedReward;

        // update expectedActiveStakeDeposits
        expectedActiveStakeDeposits = expectedUserRewardParams.activeStakeDeposits;

        // update expectedStaked
        expectedStaked = expectedUserRewardParams.staked;
      }

      // get and check afterActiveStakeDeposits, expectedActiveStakeDeposits
      afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
      expect(afterActiveStakeDeposits).to.be.eq(expectedActiveStakeDeposits);
      expect(expectedActiveStakeDeposits).to.be.eq(0);
    });

    it('success - withdraw part, amount > 0', async () => {
      // set walletDataList
      const walletDataList = [
        { wallet: aliceWallet, amountSToken: expandTo18Decimals(100) },
        { wallet: bobWallet, amountSToken: expandTo18Decimals(50) },
        { wallet: eveWallet, amountSToken: expandTo18Decimals(25) },
      ];

      // deposit staking token for walletDataList
      for (const walletData of walletDataList) {
        // get and check beforeBalanceSToken
        const beforeBalanceSToken = await sToken.balanceOf(walletData.wallet.address);
        expect(beforeBalanceSToken).to.be.gte(walletData.amountSToken);

        // get and check beforeStake
        const beforeStake = await indexStaking.stake(walletData.wallet.address);
        expect(beforeStake).to.be.eq(0);

        // increase sToken allowance to indexStaking.address and run method deposit() - successfully
        await sToken.connect(walletData.wallet).increaseAllowance(indexStaking.address, walletData.amountSToken);
        await expect(indexStaking.connect(walletData.wallet).deposit(walletData.amountSToken)).not.to.be.reverted;

        // get and check afterStake
        const afterStake = await indexStaking.stake(walletData.wallet.address);
        expect(afterStake).to.be.eq(walletData.amountSToken);

        // get and check afterBalanceSToken
        const afterBalanceSToken = await sToken.balanceOf(walletData.wallet.address);
        expect(afterBalanceSToken).to.be.eq(beforeBalanceSToken.sub(walletData.amountSToken));
      }

      // get expectedActiveStakeDeposits
      let expectedActiveStakeDeposits = walletDataList.reduce(
        (totalAmount: BigNumber, item: any) => totalAmount.add(item.amountSToken),
        new BigNumber(0),
      );

      // get and check afterActiveStakeDeposits
      let afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
      expect(afterActiveStakeDeposits).to.be.eq(expectedActiveStakeDeposits);

      // get and check expectedStaked
      let expectedStaked = await indexStaking.staked();
      expect(expectedStaked).to.be.eq(0);

      // get and check expectedAccumulatedReward
      let expectedAccumulatedReward = await indexStaking.accumulatedReward();
      expect(expectedAccumulatedReward).to.be.eq(0);

      // mine some blocks
      await mineBlocks(provider, 5);

      // withdraw staking token for walletDataList
      for (const walletData of walletDataList) {
        // get beforeBalanceSToken
        const beforeBalanceSToken = await sToken.balanceOf(walletData.wallet.address);

        // get beforeBalanceRToken
        const beforeBalanceRToken = await rToken.balanceOf(walletData.wallet.address);

        // get beforeStakedSnapshot
        const beforeStakedSnapshot = await indexStaking.stakedSnapshot(walletData.wallet.address);

        // get and check beforeStake
        const beforeStake = await indexStaking.stake(walletData.wallet.address);
        expect(beforeStake).to.be.eq(walletData.amountSToken);

        // get withdrawAmountSToken and remainderStake, increase sToken allowance to indexStaking.address
        const withdrawAmountSToken = beforeStake.div(5);
        const remainderStake = beforeStake.sub(withdrawAmountSToken);
        await sToken.connect(walletData.wallet).increaseAllowance(indexStaking.address, remainderStake);

        // get and check expectedUserRewardParams
        const expectedUserRewardParams = await calculateExpectedUserRewardParams(
          provider,
          indexStaking,
          walletData.wallet,
        );
        expect(expectedUserRewardParams.userDeposit).to.be.eq(beforeStake);
        expect(expectedUserRewardParams.userReward).to.be.eq(
          expectedUserRewardParams.userDeposit.mul(
            expectedUserRewardParams.staked.sub(expectedUserRewardParams.userStakedSnapshot),
          ),
        );
        expect(expectedUserRewardParams.userStake).to.be.eq(0);
        expect(expectedUserRewardParams.userStakedSnapshot).to.be.eq(beforeStakedSnapshot);
        expect(expectedUserRewardParams.reward).to.be.gte(0);
        expect(expectedUserRewardParams.accumulatedReward).to.be.eq(
          expectedAccumulatedReward.add(expectedUserRewardParams.reward),
        );
        expect(expectedUserRewardParams.activeStakeDeposits).to.be.eq(
          expectedActiveStakeDeposits.sub(expectedUserRewardParams.userDeposit),
        );
        expect(expectedUserRewardParams.staked).to.be.eq(
          !expectedActiveStakeDeposits.eq(0)
            ? expectedStaked.add(expectedUserRewardParams.reward.div(expectedActiveStakeDeposits))
            : expectedStaked,
        );

        // run method withdraw(withdrawAmountSToken) - successfully
        await expect(indexStaking.connect(walletData.wallet).withdraw(withdrawAmountSToken)).not.to.be.reverted;

        // get and check afterStake
        const afterStake = await indexStaking.stake(walletData.wallet.address);
        expect(afterStake).to.be.eq(expectedUserRewardParams.userStake.add(remainderStake));

        // get afterStakedSnapshot
        const afterStakedSnapshot = await indexStaking.stakedSnapshot(walletData.wallet.address);
        expect(afterStakedSnapshot).to.be.gt(expectedUserRewardParams.userStakedSnapshot);
        expect(afterStakedSnapshot).to.be.eq(expectedUserRewardParams.staked);

        // get and check afterBalanceRToken
        const afterBalanceRToken = await rToken.balanceOf(walletData.wallet.address);
        expect(afterBalanceRToken).to.be.eq(beforeBalanceRToken.add(expectedUserRewardParams.userReward));

        // get and check afterBalanceSToken
        const afterBalanceSToken = await sToken.balanceOf(walletData.wallet.address);
        expect(afterBalanceSToken).to.be.eq(
          beforeBalanceSToken.add(expectedUserRewardParams.userDeposit).sub(remainderStake),
        );

        // get and check afterAccumulatedReward
        const afterAccumulatedReward = await indexStaking.accumulatedReward();
        expect(afterAccumulatedReward).to.be.eq(expectedUserRewardParams.accumulatedReward);

        // get and check afterActiveStakeDeposits
        afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
        expect(afterActiveStakeDeposits).to.be.eq(expectedUserRewardParams.activeStakeDeposits.add(remainderStake));

        // get and check afterStaked
        const afterStaked = await indexStaking.staked();
        expect(afterStaked).to.be.eq(expectedUserRewardParams.staked);

        // update expectedAccumulatedReward
        expectedAccumulatedReward = expectedUserRewardParams.accumulatedReward;

        // update expectedActiveStakeDeposits
        expectedActiveStakeDeposits = expectedUserRewardParams.activeStakeDeposits.add(remainderStake);

        // update expectedStaked
        expectedStaked = expectedUserRewardParams.staked;
      }

      // get and check afterActiveStakeDeposits, expectedActiveStakeDeposits
      afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
      expect(afterActiveStakeDeposits).to.be.eq(expectedActiveStakeDeposits);
      expect(expectedActiveStakeDeposits).to.be.gt(0);
    });

    it('success - withdraw part, amount = 0', async () => {
      // set walletDataList
      const walletDataList = [
        { wallet: aliceWallet, amountSToken: expandTo18Decimals(100) },
        { wallet: bobWallet, amountSToken: expandTo18Decimals(50) },
        { wallet: eveWallet, amountSToken: expandTo18Decimals(25) },
      ];

      // deposit staking token for walletDataList
      for (const walletData of walletDataList) {
        // get and check beforeBalanceSToken
        const beforeBalanceSToken = await sToken.balanceOf(walletData.wallet.address);
        expect(beforeBalanceSToken).to.be.gte(walletData.amountSToken);

        // get and check beforeStake
        const beforeStake = await indexStaking.stake(walletData.wallet.address);
        expect(beforeStake).to.be.eq(0);

        // increase sToken allowance to indexStaking.address and run method deposit() - successfully
        await sToken.connect(walletData.wallet).increaseAllowance(indexStaking.address, walletData.amountSToken);
        await expect(indexStaking.connect(walletData.wallet).deposit(walletData.amountSToken)).not.to.be.reverted;

        // get and check afterStake
        const afterStake = await indexStaking.stake(walletData.wallet.address);
        expect(afterStake).to.be.eq(walletData.amountSToken);

        // get and check afterBalanceSToken
        const afterBalanceSToken = await sToken.balanceOf(walletData.wallet.address);
        expect(afterBalanceSToken).to.be.eq(beforeBalanceSToken.sub(walletData.amountSToken));
      }

      // get expectedActiveStakeDeposits
      let expectedActiveStakeDeposits = walletDataList.reduce(
        (totalAmount: BigNumber, item: any) => totalAmount.add(item.amountSToken),
        new BigNumber(0),
      );

      // get and check afterActiveStakeDeposits
      let afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
      expect(afterActiveStakeDeposits).to.be.eq(expectedActiveStakeDeposits);

      // get and check expectedStaked
      let expectedStaked = await indexStaking.staked();
      expect(expectedStaked).to.be.eq(0);

      // get and check expectedAccumulatedReward
      let expectedAccumulatedReward = await indexStaking.accumulatedReward();
      expect(expectedAccumulatedReward).to.be.eq(0);

      // mine some blocks
      await mineBlocks(provider, 5);

      // withdraw staking token for walletDataList
      for (const walletData of walletDataList) {
        // get beforeBalanceSToken
        const beforeBalanceSToken = await sToken.balanceOf(walletData.wallet.address);

        // get beforeBalanceRToken
        const beforeBalanceRToken = await rToken.balanceOf(walletData.wallet.address);

        // get beforeStakedSnapshot
        const beforeStakedSnapshot = await indexStaking.stakedSnapshot(walletData.wallet.address);

        // get and check beforeStake
        const beforeStake = await indexStaking.stake(walletData.wallet.address);
        expect(beforeStake).to.be.eq(walletData.amountSToken);

        // get withdrawAmountSToken and remainderStake, increase sToken allowance to indexStaking.address
        const withdrawAmountSToken = 0;
        const remainderStake = beforeStake.sub(withdrawAmountSToken);
        await sToken.connect(walletData.wallet).increaseAllowance(indexStaking.address, remainderStake);

        // get and check expectedUserRewardParams
        const expectedUserRewardParams = await calculateExpectedUserRewardParams(
          provider,
          indexStaking,
          walletData.wallet,
        );
        expect(expectedUserRewardParams.userDeposit).to.be.eq(beforeStake);
        expect(expectedUserRewardParams.userReward).to.be.eq(
          expectedUserRewardParams.userDeposit.mul(
            expectedUserRewardParams.staked.sub(expectedUserRewardParams.userStakedSnapshot),
          ),
        );
        expect(expectedUserRewardParams.userStake).to.be.eq(0);
        expect(expectedUserRewardParams.userStakedSnapshot).to.be.eq(beforeStakedSnapshot);
        expect(expectedUserRewardParams.reward).to.be.gte(0);
        expect(expectedUserRewardParams.accumulatedReward).to.be.eq(
          expectedAccumulatedReward.add(expectedUserRewardParams.reward),
        );
        expect(expectedUserRewardParams.activeStakeDeposits).to.be.eq(
          expectedActiveStakeDeposits.sub(expectedUserRewardParams.userDeposit),
        );
        expect(expectedUserRewardParams.staked).to.be.eq(
          !expectedActiveStakeDeposits.eq(0)
            ? expectedStaked.add(expectedUserRewardParams.reward.div(expectedActiveStakeDeposits))
            : expectedStaked,
        );

        // run method withdraw(withdrawAmountSToken) - successfully
        await expect(indexStaking.connect(walletData.wallet).withdraw(withdrawAmountSToken)).not.to.be.reverted;

        // get and check afterStake
        const afterStake = await indexStaking.stake(walletData.wallet.address);
        expect(afterStake).to.be.eq(expectedUserRewardParams.userStake.add(remainderStake));

        // get afterStakedSnapshot
        const afterStakedSnapshot = await indexStaking.stakedSnapshot(walletData.wallet.address);
        expect(afterStakedSnapshot).to.be.gt(expectedUserRewardParams.userStakedSnapshot);
        expect(afterStakedSnapshot).to.be.eq(expectedUserRewardParams.staked);

        // get and check afterBalanceRToken
        const afterBalanceRToken = await rToken.balanceOf(walletData.wallet.address);
        expect(afterBalanceRToken).to.be.eq(beforeBalanceRToken.add(expectedUserRewardParams.userReward));

        // get and check afterBalanceSToken
        const afterBalanceSToken = await sToken.balanceOf(walletData.wallet.address);
        expect(afterBalanceSToken).to.be.eq(
          beforeBalanceSToken.add(expectedUserRewardParams.userDeposit).sub(remainderStake),
        );

        // get and check afterAccumulatedReward
        const afterAccumulatedReward = await indexStaking.accumulatedReward();
        expect(afterAccumulatedReward).to.be.eq(expectedUserRewardParams.accumulatedReward);

        // get and check afterActiveStakeDeposits
        afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
        expect(afterActiveStakeDeposits).to.be.eq(expectedUserRewardParams.activeStakeDeposits.add(remainderStake));

        // get and check afterStaked
        const afterStaked = await indexStaking.staked();
        expect(afterStaked).to.be.eq(expectedUserRewardParams.staked);

        // update expectedAccumulatedReward
        expectedAccumulatedReward = expectedUserRewardParams.accumulatedReward;

        // update expectedActiveStakeDeposits
        expectedActiveStakeDeposits = expectedUserRewardParams.activeStakeDeposits.add(remainderStake);

        // update expectedStaked
        expectedStaked = expectedUserRewardParams.staked;
      }

      // get and check afterActiveStakeDeposits, expectedActiveStakeDeposits
      afterActiveStakeDeposits = await indexStaking.activeStakeDeposits();
      expect(afterActiveStakeDeposits).to.be.eq(expectedActiveStakeDeposits);
      expect(expectedActiveStakeDeposits).to.be.gt(0);
    });
  });
});

export interface CalculateCurrentReward {
  reward: BigNumber;
  accumulatedReward: BigNumber;
}

export interface ExpectedUserRewardParams extends CalculateCurrentReward {
  staked: BigNumber;
  activeStakeDeposits: BigNumber;
  userDeposit: BigNumber;
  userReward: BigNumber;
  userStake: BigNumber;
  userStakedSnapshot: BigNumber;
}

async function calculateExpectedUserRewardParams(
  provider: Web3Provider,
  indexStaking: IndexStaking,
  wallet: Wallet,
): Promise<ExpectedUserRewardParams> {
  const userDeposit = await indexStaking.stake(wallet.address);
  const { reward, accumulatedReward } = await calculateExpectedCurrentReward(provider, indexStaking);
  let activeStakeDeposits = await indexStaking.activeStakeDeposits();
  let staked = await indexStaking.staked();
  if (!activeStakeDeposits.eq(0)) {
    staked = staked.add(reward.div(activeStakeDeposits));
  }
  const userStakedSnapshot = await indexStaking.stakedSnapshot(wallet.address);
  const userReward = userDeposit.mul(staked.sub(userStakedSnapshot));
  activeStakeDeposits = activeStakeDeposits.sub(userDeposit);
  const userStake = new BigNumber(0);
  return {
    reward,
    accumulatedReward,
    staked,
    activeStakeDeposits,
    userDeposit,
    userReward,
    userStake,
    userStakedSnapshot,
  };
}

async function calculateExpectedCurrentReward(
  provider: Web3Provider,
  indexStaking: IndexStaking,
): Promise<CalculateCurrentReward> {
  let reward: BigNumber;
  const startBlock = await indexStaking.startBlock();
  const duration = await indexStaking.duration();
  const rewardSupply = await indexStaking.rewardSupply();
  let accumulatedReward = await indexStaking.accumulatedReward();
  const blockNumber = new BigNumber(await provider.getBlockNumber()).add(1); // get number of next block
  if (startBlock.add(duration).gt(blockNumber)) {
    reward = rewardSupply.mul(blockNumber).mul(blockNumber.sub(startBlock)).div(startBlock.add(duration).mul(duration));
  } else {
    reward = rewardSupply;
  }
  reward = reward.sub(accumulatedReward);
  accumulatedReward = accumulatedReward.add(reward);
  return {
    reward,
    accumulatedReward,
  };
}
