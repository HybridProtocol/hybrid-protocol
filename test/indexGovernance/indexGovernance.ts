import chai, { expect } from 'chai';
import { createFixtureLoader, MockProvider, solidity } from 'ethereum-waffle';
import { Contract, Wallet } from 'ethers';
import { IndexHybridToken } from '../../typechain/IndexHybridToken';
import { HybridToken } from '../../typechain/HybridToken';
import { IndexGovernance } from '../../typechain/IndexGovernance';
import { indexGovernanceFixture, indexGovernanceMinDuration } from './indexGovernanceFixtures';
import { convertStringToArrayish, expandTo18Decimals, mineBlocks } from '../shared/utilities';

chai.use(solidity);

const ERRORS = {
  INVALID_LENGTH: 'IndexGovernance: INVALID_LENGTH',
  DURATION_INVALID: 'IndexGovernance: DURATION_INVALID',
  TOTAL_WEIGHTS: 'IndexGovernance: TOTAL_WEIGHTS',
  VOTING_IN_PROGRESS: 'IndexGovernance: VOTING_IN_PROGRESS',
  VOTING_NOT_IN_PROGRESS: 'IndexGovernance: VOTING_NOT_IN_PROGRESS',
  SAFE_TRANSFER_TRANSFER_FROM: 'SafeTransfer: TRANSFER_FROM',
  SAFE_TRANSFER_SEND_ERC20: 'SafeTransfer: SEND_ERC20',
};

export interface PortfolioInfo {
  symbol: string;
  weight: number;
}

describe('IndexGovernance', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999,
  });
  const [ownerWallet, aliceWallet, bobWallet, otherWallet1] = provider.getWallets();
  const loadFixture = createFixtureLoader(provider, [ownerWallet]);
  let indexHybridToken: IndexHybridToken;
  let stakingToken: HybridToken;
  let indexGovernance: IndexGovernance;
  let indexGovernanceEmptyProposal: any;

  const assetArrayishValues = {
    BTC: convertStringToArrayish('BTC'),
    ETH: convertStringToArrayish('ETH'),
    BCH: convertStringToArrayish('BCH'),
    BNB: convertStringToArrayish('BNB'),
    LTC: convertStringToArrayish('LTC'),
    EOS: convertStringToArrayish('EOS'),
    DASH: convertStringToArrayish('DASH'),
    INVALID_ASSET: convertStringToArrayish('INVALID_ASSET'),
  };
  const voteProposalAssets = {
    start: {
      assets: [assetArrayishValues.BTC, assetArrayishValues.ETH, assetArrayishValues.BCH],
      weights: [5500, 2500, 2000],
    },
    base: {
      assets: [
        assetArrayishValues.BTC,
        assetArrayishValues.ETH,
        assetArrayishValues.BCH,
        assetArrayishValues.BNB,
        assetArrayishValues.LTC,
        assetArrayishValues.EOS,
        assetArrayishValues.DASH,
      ],
      weights: [3500, 2000, 1000, 300, 700, 1700, 800],
      duration: indexGovernanceMinDuration * 2,
    },
    invalidAssetName: {
      assets: [assetArrayishValues.BTC, assetArrayishValues.ETH, assetArrayishValues.INVALID_ASSET],
      weights: [5500, 2500, 2000],
      duration: indexGovernanceMinDuration * 2,
    },
    invalidAssetsWeightsLength: {
      assets: [assetArrayishValues.BTC, assetArrayishValues.ETH],
      weights: [5500, 2500, 2000],
      duration: indexGovernanceMinDuration * 2,
    },
    shorterDuration: {
      assets: [assetArrayishValues.BTC, assetArrayishValues.ETH, assetArrayishValues.BCH],
      weights: [5500, 2500, 2000],
      duration: indexGovernanceMinDuration - 1,
    },
    longerDuration: {
      assets: [assetArrayishValues.BTC, assetArrayishValues.ETH, assetArrayishValues.BCH],
      weights: [5500, 2500, 2000],
      duration: indexGovernanceMinDuration * 3 + 1,
    },
    invalidWeights: {
      assets: [assetArrayishValues.BTC, assetArrayishValues.ETH, assetArrayishValues.BCH],
      weights: [5500, 2500, 1000],
      duration: indexGovernanceMinDuration * 2,
    },
  };

  beforeEach(async () => {
    // load fixture
    const fixture = await loadFixture(indexGovernanceFixture);

    // update contract variables
    indexHybridToken = fixture.indexHybridToken;
    stakingToken = fixture.stakingToken;
    indexGovernance = fixture.indexGovernance;

    // init test action
    await indexHybridToken.addAddressesToMainteiners([aliceWallet.address, indexGovernance.address]); // add aliceWallet.address, indexGovernance.address to mainteiners
    await indexHybridToken
      .connect(aliceWallet)
      .updateComposition(voteProposalAssets.start.assets, voteProposalAssets.start.weights); // set start composition
    await stakingToken.transfer(aliceWallet.address, expandTo18Decimals(1000)); // transfer sToken tokens to Alice address
    await stakingToken.transfer(bobWallet.address, expandTo18Decimals(1000)); // transfer sToken tokens to Bob address
    await stakingToken.transfer(otherWallet1.address, expandTo18Decimals(1000)); // transfer sToken tokens to OtherWallet address
    await indexGovernance.addAddressesToMainteiners([aliceWallet.address, bobWallet.address]); // add aliceWallet.address and bobWallet.address to mainteiners

    // get and check indexGovernance empty proposal
    indexGovernanceEmptyProposal = await indexGovernance.proposal();
    expect(indexGovernanceEmptyProposal.id).to.be.eq(0);
    expect(indexGovernanceEmptyProposal.initiator).to.be.eq('0x0000000000000000000000000000000000000000');
    expect(indexGovernanceEmptyProposal.pros).to.be.eq(0);
    expect(indexGovernanceEmptyProposal.cons).to.be.eq(0);
    expect(indexGovernanceEmptyProposal.deadline).to.be.eq(0);
  });

  describe('createProposal', () => {
    it('fail - not maintainer', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // check contract maintainers - not maintainer
      await checkAddressMainteiner(otherWallet1.address, indexGovernance, false);

      // run method createProposal() - reverted
      await expect(
        indexGovernance
          .connect(otherWallet1)
          .createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).to.be.reverted;
    });

    it('fail - invalid assets name', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.invalidAssetName;

      // check contract maintainers - maintainer
      await checkAddressMainteiner(aliceWallet.address, indexGovernance, true);

      // run method createProposal() - throw runtime error
      let error: any;
      try {
        await indexGovernance
          .connect(aliceWallet)
          .createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration);
      } catch (e) {
        error = e;
      }
      expect(error).not.to.be.undefined;
      expect(error.reason).to.be.eq('invalid bytes8 value');
      expect(error.code).to.be.eq('INVALID_ARGUMENT');
    });

    it('fail - assets and weights has different length (IndexGovernance: INVALID_LENGTH)', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.invalidAssetsWeightsLength;

      // check contract maintainers - maintainer
      await checkAddressMainteiner(aliceWallet.address, indexGovernance, true);

      // run method createProposal() - reverted
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).to.be.revertedWith(ERRORS.INVALID_LENGTH);
    });

    it('fail - shorter duration (IndexGovernance: DURATION_INVALID)', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.shorterDuration;

      // check contract maintainers - maintainer
      await checkAddressMainteiner(aliceWallet.address, indexGovernance, true);

      // run method createProposal() - reverted
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).to.be.revertedWith(ERRORS.DURATION_INVALID);
    });

    it('fail - longer duration (IndexGovernance: DURATION_INVALID)', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.longerDuration;

      // check contract maintainers - maintainer
      await checkAddressMainteiner(aliceWallet.address, indexGovernance, true);

      // run method createProposal() - reverted
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).to.be.revertedWith(ERRORS.DURATION_INVALID);
    });

    it('fail - invalid total weights (IndexGovernance: TOTAL_WEIGHTS)', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.invalidWeights;

      // check contract maintainers - maintainer
      await checkAddressMainteiner(aliceWallet.address, indexGovernance, true);

      // run method createProposal() - reverted
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).to.be.revertedWith(ERRORS.TOTAL_WEIGHTS);
    });

    it('fail - cannot create second proposal before completing the first (IndexGovernance: VOTING_IN_PROGRESS)', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // check contract maintainers - maintainers
      await checkAddressMainteiner(aliceWallet.address, indexGovernance, true);
      await checkAddressMainteiner(bobWallet.address, indexGovernance, true);

      // get and check beforeProposal
      const beforeProposal = await indexGovernance.proposal();
      expect(beforeProposal).to.be.eql(indexGovernanceEmptyProposal);

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // run method createProposal() - reverted
      await expect(
        indexGovernance.connect(bobWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).to.be.revertedWith(ERRORS.VOTING_IN_PROGRESS);

      // get and check afterProposal
      const afterProposal = await indexGovernance.proposal();
      expect(afterProposal.id).to.be.eq(beforeProposal.id.add(1));
      expect(afterProposal.initiator).to.be.eq(aliceWallet.address);
    });

    it('success - create one proposal', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // check contract maintainers - maintainer
      await checkAddressMainteiner(aliceWallet.address, indexGovernance, true);

      // get and check beforeProposal
      const beforeProposal = await indexGovernance.proposal();
      expect(beforeProposal).to.be.eql(indexGovernanceEmptyProposal);

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // get and check afterProposal
      const afterProposal = await indexGovernance.proposal();
      expect(afterProposal.id).to.be.eq(beforeProposal.id.add(1));
      expect(afterProposal.initiator).to.be.eq(aliceWallet.address);
    });

    it('success - create second proposal after completing the first', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // check contract maintainers - maintainers
      await checkAddressMainteiner(aliceWallet.address, indexGovernance, true);
      await checkAddressMainteiner(bobWallet.address, indexGovernance, true);

      // get and check beforeProposal
      const beforeProposal = await indexGovernance.proposal();
      expect(beforeProposal).to.be.eql(indexGovernanceEmptyProposal);

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // mine blocks
      await mineBlocks(provider, voteAssets.duration);

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(bobWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // get and check afterProposal
      const afterProposal = await indexGovernance.proposal();
      expect(afterProposal.id).to.be.eq(beforeProposal.id.add(2));
      expect(afterProposal.initiator).to.be.eq(bobWallet.address);
    });
  });

  describe('vote', () => {
    it('fail - proposal has already ended (IndexGovernance: VOTING_NOT_IN_PROGRESS)', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // mine blocks
      await mineBlocks(provider, voteAssets.duration);

      // set and check amountStakingToken
      const amountStakingToken = 10;
      expect(amountStakingToken).to.be.gt(0);

      // run method vote() - reverted
      await expect(indexGovernance.connect(otherWallet1).vote(amountStakingToken, true)).to.be.revertedWith(
        ERRORS.VOTING_NOT_IN_PROGRESS,
      );
    });

    it('fail - invalid transferFromERC20 - not enough allowance, enough balance (SafeTransfer: TRANSFER_FROM)', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // set and check amountStakingToken
      const amountStakingToken = 10;
      expect(amountStakingToken).to.be.gt(0);

      // get and check currentAllowanceStakingToken
      const currentAllowanceStakingToken = await stakingToken.allowance(otherWallet1.address, indexGovernance.address);
      expect(currentAllowanceStakingToken).to.be.lt(amountStakingToken);

      // get and check beforeBalanceStakingToken
      const beforeBalanceStakingToken = await stakingToken.balanceOf(otherWallet1.address);
      expect(beforeBalanceStakingToken).to.be.gte(amountStakingToken);

      // run method vote() - reverted
      await expect(indexGovernance.connect(otherWallet1).vote(amountStakingToken, true)).to.be.revertedWith(
        ERRORS.SAFE_TRANSFER_TRANSFER_FROM,
      );
    });

    it('fail - invalid transferFromERC20 - enough allowance, not enough balance (SafeTransfer: TRANSFER_FROM)', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // set and check amountStakingToken
      const amountStakingToken = expandTo18Decimals(1000000000);
      expect(amountStakingToken).to.be.gt(0);

      // increase stakingToken allowance to indexGovernance.address
      await stakingToken.connect(otherWallet1).increaseAllowance(indexGovernance.address, amountStakingToken);

      // get and check currentAllowanceStakingToken
      const currentAllowanceStakingToken = await stakingToken.allowance(otherWallet1.address, indexGovernance.address);
      expect(currentAllowanceStakingToken).to.be.gte(amountStakingToken);

      // get and check beforeBalanceStakingToken
      const beforeBalanceStakingToken = await stakingToken.balanceOf(otherWallet1.address);
      expect(beforeBalanceStakingToken).to.be.lt(amountStakingToken);

      // run method vote() - reverted
      await expect(indexGovernance.connect(otherWallet1).vote(amountStakingToken, false)).to.be.revertedWith(
        ERRORS.SAFE_TRANSFER_TRANSFER_FROM,
      );
    });

    it('success', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // get and check beforeProposal
      const beforeProposal = await indexGovernance.proposal();
      expect(beforeProposal.id).to.be.eq(1);
      expect(beforeProposal.pros).to.be.eq(0);
      expect(beforeProposal.cons).to.be.eq(0);

      // set prosStakingTokenList, consStakingTokenList, totalProsStakingToken, totalConsStakingToken and totalAmountStakingToken
      const prosStakingTokenList = [100, 200, 300, 400, 500];
      const consStakingTokenList = [200, 300, 400];
      const totalProsStakingToken = prosStakingTokenList.reduce(
        (totalAmount: number, item: number) => totalAmount + item,
        0,
      );
      const totalConsStakingToken = consStakingTokenList.reduce(
        (totalAmount: number, item: number) => totalAmount + item,
        0,
      );
      const totalAmountStakingToken = totalProsStakingToken + totalConsStakingToken;
      expect(totalAmountStakingToken).to.be.gt(0);

      // increase stakingToken allowance to indexGovernance.address
      await stakingToken.connect(otherWallet1).increaseAllowance(indexGovernance.address, totalAmountStakingToken);

      // get and check currentAllowanceStakingToken
      const currentAllowanceStakingToken = await stakingToken.allowance(otherWallet1.address, indexGovernance.address);
      expect(currentAllowanceStakingToken).to.be.gte(totalAmountStakingToken);

      // get and check beforeBalanceStakingToken
      const beforeBalanceStakingToken = await stakingToken.balanceOf(otherWallet1.address);
      expect(beforeBalanceStakingToken).to.be.gte(totalAmountStakingToken);

      // get and check beforeVotesOfUser
      const beforeVotesOfUser = await indexGovernance.votesOfUserByProposalId(beforeProposal.id, otherWallet1.address);
      expect(beforeVotesOfUser).to.be.eq(0);

      // run method vote() several times (decision: true) - successfully
      for (const amountStakingToken of prosStakingTokenList) {
        await expect(indexGovernance.connect(otherWallet1).vote(amountStakingToken, true)).not.to.be.reverted;
      }

      // run method vote() several times (decision: false) - successfully
      for (const amountStakingToken of consStakingTokenList) {
        await expect(indexGovernance.connect(otherWallet1).vote(amountStakingToken, false)).not.to.be.reverted;
      }

      // get and check afterVotesOfUser
      const afterVotesOfUser = await indexGovernance.votesOfUserByProposalId(beforeProposal.id, otherWallet1.address);
      expect(afterVotesOfUser).to.be.eq(beforeVotesOfUser.add(totalAmountStakingToken));

      // get and check afterProposal
      const afterProposal = await indexGovernance.proposal();
      expect(afterProposal.id).to.be.eq(beforeProposal.id);
      expect(afterProposal.pros).to.be.eq(beforeProposal.pros.add(totalProsStakingToken));
      expect(afterProposal.cons).to.be.eq(beforeProposal.cons.add(totalConsStakingToken));
    });
  });

  describe('finalize', () => {
    it('fail - proposal not completed (IndexGovernance: VOTING_IN_PROGRESS)', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // get and check beforeProposal
      const beforeProposal = await indexGovernance.proposal();
      expect(beforeProposal.id).to.be.eq(1);
      expect(beforeProposal.initiator).to.be.eq(aliceWallet.address);
      expect(beforeProposal.pros).to.be.eq(0);
      expect(beforeProposal.cons).to.be.eq(0);

      // run method finalize() - reverted
      await expect(indexGovernance.connect(otherWallet1).finalize()).to.be.revertedWith(ERRORS.VOTING_IN_PROGRESS);

      // get and check afterProposal
      const afterProposal = await indexGovernance.proposal();
      expect(afterProposal).to.be.eql(beforeProposal);
    });

    it('success - finalize empty proposal', async () => {
      // get and check beforeProposal
      const beforeProposal = await indexGovernance.proposal();
      expect(beforeProposal).to.be.eql(indexGovernanceEmptyProposal);

      // run method finalize() - successfully
      await expect(indexGovernance.connect(otherWallet1).finalize()).not.to.be.reverted;

      // get and check afterProposal
      const afterProposal = await indexGovernance.proposal();
      expect(afterProposal).to.be.eql(beforeProposal);
    });

    it('success - proposal.pros <= proposal.cons', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // get beforePortfolioList
      const beforePortfolioList = await getCurrentPortfolio(indexHybridToken, otherWallet1);
      expect(beforePortfolioList.length).to.be.gt(0);

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // set prosStakingTokenAmount, consStakingTokenAmount, totalStakingTokenAmount, increase stakingToken allowance and do votes
      const prosStakingTokenAmount = 100;
      const consStakingTokenAmount = 200;
      const totalStakingTokenAmount = prosStakingTokenAmount + consStakingTokenAmount;
      expect(prosStakingTokenAmount).to.be.lte(consStakingTokenAmount);
      await stakingToken.connect(otherWallet1).increaseAllowance(indexGovernance.address, totalStakingTokenAmount);
      await expect(indexGovernance.connect(otherWallet1).vote(prosStakingTokenAmount, true)).not.to.be.reverted;
      await expect(indexGovernance.connect(otherWallet1).vote(consStakingTokenAmount, false)).not.to.be.reverted;

      // mine blocks
      await mineBlocks(provider, voteAssets.duration);

      // get and check beforeProposal
      const beforeProposal = await indexGovernance.proposal();
      expect(beforeProposal.id).to.be.eq(1);
      expect(beforeProposal.initiator).to.be.eq(aliceWallet.address);
      expect(beforeProposal.pros).to.be.eq(prosStakingTokenAmount);
      expect(beforeProposal.cons).to.be.eq(consStakingTokenAmount);
      expect(beforeProposal.pros).to.be.lte(beforeProposal.cons);

      // run method finalize() - successfully
      await expect(indexGovernance.connect(otherWallet1).finalize()).not.to.be.reverted;

      // get afterPortfolioList, value should not changed
      const afterPortfolioList = await getCurrentPortfolio(indexHybridToken, otherWallet1);
      expect(afterPortfolioList).to.eql(beforePortfolioList);

      // get and check afterProposal
      const afterProposal = await indexGovernance.proposal();
      expect(afterProposal).to.be.eql(indexGovernanceEmptyProposal);
    });

    it('success - proposal.pros > proposal.cons', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // get beforePortfolioList
      const beforePortfolioList = await getCurrentPortfolio(indexHybridToken, otherWallet1);
      expect(beforePortfolioList.length).to.be.gt(0);

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // set prosStakingTokenAmount, consStakingTokenAmount, totalStakingTokenAmount, increase stakingToken allowance and do votes
      const prosStakingTokenAmount = 200;
      const consStakingTokenAmount = 100;
      const totalStakingTokenAmount = prosStakingTokenAmount + consStakingTokenAmount;
      expect(prosStakingTokenAmount).to.be.gt(consStakingTokenAmount);
      await stakingToken.connect(otherWallet1).increaseAllowance(indexGovernance.address, totalStakingTokenAmount);
      await expect(indexGovernance.connect(otherWallet1).vote(prosStakingTokenAmount, true)).not.to.be.reverted;
      await expect(indexGovernance.connect(otherWallet1).vote(consStakingTokenAmount, false)).not.to.be.reverted;

      // mine blocks
      await mineBlocks(provider, voteAssets.duration);

      // get and check beforeProposal
      const beforeProposal = await indexGovernance.proposal();
      expect(beforeProposal.id).to.be.eq(1);
      expect(beforeProposal.initiator).to.be.eq(aliceWallet.address);
      expect(beforeProposal.pros).to.be.eq(prosStakingTokenAmount);
      expect(beforeProposal.cons).to.be.eq(consStakingTokenAmount);
      expect(beforeProposal.pros).to.be.gt(beforeProposal.cons);

      // run method finalize() - successfully
      await expect(indexGovernance.connect(otherWallet1).finalize()).not.to.be.reverted;

      // get afterPortfolioList, value should changed
      const afterPortfolioList = await getCurrentPortfolio(indexHybridToken, otherWallet1);
      expect(afterPortfolioList).not.to.eql(beforePortfolioList);
      expect(afterPortfolioList.length).to.be.eq(voteAssets.assets.length);
      for (let i = 0; i < afterPortfolioList.length; i++) {
        expect(afterPortfolioList[i].symbol).to.be.eq(voteAssets.assets[i]);
        expect(afterPortfolioList[i].weight).to.be.eq(voteAssets.weights[i]);
      }

      // get and check afterProposal
      const afterProposal = await indexGovernance.proposal();
      expect(afterProposal).to.be.eql(indexGovernanceEmptyProposal);
    });

    it('success - get correct proposal id after several finalizes', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // get and check beforeProposal
      const beforeProposal = await indexGovernance.proposal();
      expect(beforeProposal).to.be.eql(indexGovernanceEmptyProposal);

      // create Proposal several times
      for (let i = 0; i < 3; i++) {
        // run method createProposal() - successfully
        await expect(
          indexGovernance
            .connect(aliceWallet)
            .createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
        ).not.to.be.reverted;

        // get and check afterProposal
        const afterProposal = await indexGovernance.proposal();
        expect(afterProposal.id).to.be.eq(beforeProposal.id.add(i + 1));
        expect(afterProposal.initiator).to.be.eq(aliceWallet.address);

        // mine blocks
        await mineBlocks(provider, voteAssets.duration);

        // run method finalize() - successfully
        await expect(indexGovernance.connect(otherWallet1).finalize()).not.to.be.reverted;

        // get and check afterProposal
        const afterFinalizeProposal = await indexGovernance.proposal();
        expect(afterFinalizeProposal).to.be.eql(indexGovernanceEmptyProposal);
      }
    });
  });

  describe('claimFunds', () => {
    it('fail - proposal not completed (IndexGovernance: VOTING_IN_PROGRESS)', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // set stakingTokenAmount, increase stakingToken allowance and do votes
      const stakingTokenAmount = 500;
      expect(stakingTokenAmount).to.be.gt(0);
      await stakingToken.connect(otherWallet1).increaseAllowance(indexGovernance.address, stakingTokenAmount);
      await expect(indexGovernance.connect(otherWallet1).vote(stakingTokenAmount, true)).not.to.be.reverted;

      // get and check beforeProposal
      const beforeProposal = await indexGovernance.proposal();
      expect(beforeProposal.id).to.be.eq(1);

      // get and check beforeVotesOfUser
      const beforeVotesOfUser = await indexGovernance.votesOfUserByProposalId(beforeProposal.id, otherWallet1.address);
      expect(beforeVotesOfUser).to.be.eq(stakingTokenAmount);

      // run method claimFunds() - reverted
      await expect(
        indexGovernance.connect(otherWallet1).claimFunds(stakingTokenAmount, beforeProposal.id),
      ).to.be.revertedWith(ERRORS.VOTING_IN_PROGRESS);

      // get and check afterVotesOfUser
      const afterVotesOfUser = await indexGovernance.votesOfUserByProposalId(beforeProposal.id, otherWallet1.address);
      expect(afterVotesOfUser).to.be.eq(beforeVotesOfUser);
    });

    it('fail - could not claim funds more than staking', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // set stakingTokenAmount, increase stakingToken allowance and do votes
      const stakingTokenAmount = 500;
      expect(stakingTokenAmount).to.be.gt(0);
      await stakingToken.connect(otherWallet1).increaseAllowance(indexGovernance.address, stakingTokenAmount);
      await stakingToken.connect(bobWallet).increaseAllowance(indexGovernance.address, stakingTokenAmount);
      await expect(indexGovernance.connect(otherWallet1).vote(stakingTokenAmount, true)).not.to.be.reverted;
      await expect(indexGovernance.connect(bobWallet).vote(stakingTokenAmount, false)).not.to.be.reverted;

      // get and check beforeIndexGovernanceBalanceStakingToken
      const beforeIndexGovernanceBalanceStakingToken = await stakingToken.balanceOf(indexGovernance.address);
      expect(beforeIndexGovernanceBalanceStakingToken).to.be.eq(stakingTokenAmount * 2);

      // get and check beforeProposal
      const beforeProposal = await indexGovernance.proposal();
      expect(beforeProposal.id).to.be.eq(1);

      // get beforeBalanceStakingToken
      const beforeBalanceStakingToken = await stakingToken.balanceOf(otherWallet1.address);

      // get and check beforeVotesOfUser
      const beforeVotesOfUser = await indexGovernance.votesOfUserByProposalId(beforeProposal.id, otherWallet1.address);
      expect(beforeVotesOfUser).to.be.eq(stakingTokenAmount);

      // mine blocks
      await mineBlocks(provider, voteAssets.duration);

      // run method claimFunds() - reverted
      const claimedStakingTokenAmount = stakingTokenAmount + 100;
      expect(claimedStakingTokenAmount).to.be.gt(beforeVotesOfUser);
      await expect(indexGovernance.connect(otherWallet1).claimFunds(claimedStakingTokenAmount, beforeProposal.id)).to.be
        .reverted;

      // get and check afterBalanceStakingToken
      const afterBalanceStakingToken = await stakingToken.balanceOf(otherWallet1.address);
      expect(afterBalanceStakingToken).to.be.eq(beforeBalanceStakingToken);

      // get and check afterVotesOfUser
      const afterVotesOfUser = await indexGovernance.votesOfUserByProposalId(beforeProposal.id, otherWallet1.address);
      expect(afterVotesOfUser).to.be.eq(beforeVotesOfUser);

      // get and check afterIndexGovernanceBalanceStakingToken
      const afterIndexGovernanceBalanceStakingToken = await stakingToken.balanceOf(indexGovernance.address);
      expect(afterIndexGovernanceBalanceStakingToken).to.be.eq(beforeIndexGovernanceBalanceStakingToken);
    });

    it('success - claim funds > 0', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // set stakingTokenAmount, increase stakingToken allowance and do votes
      const stakingTokenAmount = 500;
      expect(stakingTokenAmount).to.be.gt(0);
      await stakingToken.connect(otherWallet1).increaseAllowance(indexGovernance.address, stakingTokenAmount);
      await expect(indexGovernance.connect(otherWallet1).vote(stakingTokenAmount, true)).not.to.be.reverted;

      // get and check beforeIndexGovernanceBalanceStakingToken
      const beforeIndexGovernanceBalanceStakingToken = await stakingToken.balanceOf(indexGovernance.address);
      expect(beforeIndexGovernanceBalanceStakingToken).to.be.eq(stakingTokenAmount);

      // get and check beforeProposal
      const beforeProposal = await indexGovernance.proposal();
      expect(beforeProposal.id).to.be.eq(1);

      // get beforeBalanceStakingToken
      const beforeBalanceStakingToken = await stakingToken.balanceOf(otherWallet1.address);

      // get and check beforeVotesOfUser
      const beforeVotesOfUser = await indexGovernance.votesOfUserByProposalId(beforeProposal.id, otherWallet1.address);
      expect(beforeVotesOfUser).to.be.eq(stakingTokenAmount);

      // mine blocks
      await mineBlocks(provider, voteAssets.duration);

      // run method claimFunds() - successfully
      const claimedStakingTokenAmount = stakingTokenAmount - 200;
      await expect(indexGovernance.connect(otherWallet1).claimFunds(claimedStakingTokenAmount, beforeProposal.id)).not
        .to.be.reverted;

      // get and check afterBalanceStakingToken
      const afterBalanceStakingToken = await stakingToken.balanceOf(otherWallet1.address);
      expect(afterBalanceStakingToken).to.be.eq(beforeBalanceStakingToken.add(claimedStakingTokenAmount));

      // get and check afterVotesOfUser
      const afterVotesOfUser = await indexGovernance.votesOfUserByProposalId(beforeProposal.id, otherWallet1.address);
      expect(afterVotesOfUser).to.be.eq(stakingTokenAmount - claimedStakingTokenAmount);

      // get and check afterIndexGovernanceBalanceStakingToken
      const afterIndexGovernanceBalanceStakingToken = await stakingToken.balanceOf(indexGovernance.address);
      expect(afterIndexGovernanceBalanceStakingToken).to.be.eq(stakingTokenAmount - claimedStakingTokenAmount);
    });

    it('success - claim funds - 0', async () => {
      // get and check beforeProposal
      const beforeProposal = await indexGovernance.proposal();
      expect(beforeProposal).to.be.eql(indexGovernanceEmptyProposal);

      // get beforeBalanceStakingToken
      const beforeBalanceStakingToken = await stakingToken.balanceOf(otherWallet1.address);

      // get and check beforeVotesOfUser
      const beforeVotesOfUser = await indexGovernance.votesOfUserByProposalId(beforeProposal.id, otherWallet1.address);
      expect(beforeVotesOfUser).to.be.eq(0);

      // run method claimFunds() - successfully
      const claimedStakingTokenAmount = 0;
      expect(claimedStakingTokenAmount).to.be.eq(0);
      await expect(indexGovernance.connect(otherWallet1).claimFunds(claimedStakingTokenAmount, beforeProposal.id)).not
        .to.be.reverted;

      // get and check afterBalanceStakingToken
      const afterBalanceStakingToken = await stakingToken.balanceOf(otherWallet1.address);
      expect(afterBalanceStakingToken).to.be.eq(beforeBalanceStakingToken);

      // get and check afterVotesOfUser
      const afterVotesOfUser = await indexGovernance.votesOfUserByProposalId(beforeProposal.id, otherWallet1.address);
      expect(afterVotesOfUser).to.be.eq(beforeVotesOfUser);
    });
  });

  describe('indexToken', () => {
    it('success', async () => {
      const indexToken = await indexGovernance.indexToken();
      expect(indexToken).to.be.eq(indexHybridToken.address);
    });
  });

  describe('stakingToken', () => {
    it('success', async () => {
      const sToken = await indexGovernance.stakingToken();
      expect(sToken).to.be.eq(stakingToken.address);
    });
  });

  describe('votesOfUserByProposalId', () => {
    it('success', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // get and check beforeProposal
      const beforeProposal = await indexGovernance.proposal();
      expect(beforeProposal.id).to.be.eq(1);

      // get and check beforeVotesOfUser
      const beforeVotesOfUser = await indexGovernance.votesOfUserByProposalId(beforeProposal.id, otherWallet1.address);
      expect(beforeVotesOfUser).to.be.eq(0);

      // set stakingTokenAmount, increase stakingToken allowance and do votes
      const stakingTokenAmount = 500;
      expect(stakingTokenAmount).to.be.gt(0);
      await stakingToken.connect(otherWallet1).increaseAllowance(indexGovernance.address, stakingTokenAmount);
      await expect(indexGovernance.connect(otherWallet1).vote(stakingTokenAmount, true)).not.to.be.reverted;

      // get and check afterVotesOfUser
      const afterVotesOfUser = await indexGovernance.votesOfUserByProposalId(beforeProposal.id, otherWallet1.address);
      expect(afterVotesOfUser).to.be.eq(beforeVotesOfUser.add(stakingTokenAmount));
    });
  });

  describe('proposal', () => {
    it('success', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // get and check beforeProposal
      const beforeProposal = await indexGovernance.proposal();
      expect(beforeProposal).to.be.eql(indexGovernanceEmptyProposal);

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(bobWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // get and check beforeProposal
      const afterProposal = await indexGovernance.proposal();
      expect(afterProposal.id).to.be.eq(beforeProposal.id.add(1));
      expect(afterProposal.initiator).to.be.eq(bobWallet.address);
      expect(afterProposal.pros).to.be.eq(0);
      expect(afterProposal.cons).to.be.eq(0);
      expect(afterProposal.deadline).to.be.gt(0);
    });
  });
});

async function checkAddressMainteiner(address: string, contract: Contract, expectMainteiner: boolean): Promise<void> {
  const isMainteiner = await contract.maintainers(address);
  if (expectMainteiner) {
    expect(isMainteiner).to.be.eq(true);
  } else {
    expect(isMainteiner).to.not.be.eq(true);
  }
}

async function getCurrentPortfolio(contract: IndexHybridToken, wallet: Wallet): Promise<PortfolioInfo[]> {
  const portfolioList: PortfolioInfo[] = [];
  let i = 0;
  let totalWeight = 0;
  while (totalWeight < 10000) {
    const beforePortfolio = await contract.connect(wallet).portfolio(i);
    portfolioList.push({
      symbol: beforePortfolio.symbol,
      weight: beforePortfolio.weight,
    });
    totalWeight = totalWeight + beforePortfolio.weight;
    i = i + 1;
  }
  return portfolioList;
}
