import chai, { expect } from 'chai';
import { createFixtureLoader, MockProvider, solidity } from 'ethereum-waffle';
import { Contract } from 'ethers';
import { IndexHybridToken } from '../../typechain/IndexHybridToken';
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
  TRANSFER_FROM: 'IndexGovernance: TRANSFER_FROM',
};

describe('IndexGovernance', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999,
  });
  const [
    ownerWallet,
    aliceWallet,
    bobWallet,
    otherWallet1,
    otherWallet2,
    otherWallet3,
    otherWallet4,
    otherWallet5,
  ] = provider.getWallets();
  const loadFixture = createFixtureLoader(provider, [ownerWallet]);
  let indexHybridToken: IndexHybridToken;
  let indexGovernance: IndexGovernance;

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
  const nullableAddress = '0x0000000000000000000000000000000000000000';

  beforeEach(async () => {
    // load fixture
    const fixture = await loadFixture(indexGovernanceFixture);

    // update contract variables
    indexHybridToken = fixture.indexHybridToken;
    indexGovernance = fixture.indexGovernance;

    // init test action
    await indexHybridToken.addAddressesToMainteiners([aliceWallet.address]); // add aliceWallet.address to mainteiners
    await indexHybridToken
      .connect(aliceWallet)
      .mintAmount(
        [
          aliceWallet.address,
          bobWallet.address,
          otherWallet1.address,
          otherWallet2.address,
          otherWallet3.address,
          otherWallet4.address,
        ],
        expandTo18Decimals(1000),
      ); // send xHBT to address list
    await indexHybridToken
      .connect(aliceWallet)
      .updateComposition(voteProposalAssets.start.assets, voteProposalAssets.start.weights); // set start composition
    await indexGovernance.addAddressesToMainteiners([aliceWallet.address, bobWallet.address]); // add aliceWallet.address and bobWallet.address to mainteiners
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
      expect(beforeProposal.id).to.be.eq(0);
      expect(beforeProposal.initiator).to.be.eq(nullableAddress);

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
      expect(beforeProposal.id).to.be.eq(0);
      expect(beforeProposal.initiator).to.be.eq(nullableAddress);

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
      expect(beforeProposal.id).to.be.eq(0);
      expect(beforeProposal.initiator).to.be.eq(nullableAddress);

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

      // set and check amountXHBT
      const amountXHBT = 10;
      expect(amountXHBT).to.be.gt(0);

      // run method vote() - reverted
      await expect(indexGovernance.connect(otherWallet1).vote(amountXHBT, true)).to.be.revertedWith(
        ERRORS.VOTING_NOT_IN_PROGRESS,
      );
    });

    it('fail - invalid transferFromERC20 - not enough allowance, enough balance (IndexGovernance: TRANSFER_FROM)', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // set and check amountXHBT
      const amountXHBT = 10;
      expect(amountXHBT).to.be.gt(0);

      // get and check currentAllowanceXHBT
      const currentAllowanceXHBT = await indexHybridToken.allowance(otherWallet1.address, indexGovernance.address);
      expect(currentAllowanceXHBT).to.be.lt(amountXHBT);

      // get and check beforeBalanceXHBT
      const beforeBalanceXHBT = await indexHybridToken.balanceOf(otherWallet1.address);
      expect(beforeBalanceXHBT).to.be.gte(amountXHBT);

      // run method vote() - reverted
      await expect(indexGovernance.connect(otherWallet1).vote(amountXHBT, true)).to.be.revertedWith(
        ERRORS.TRANSFER_FROM,
      );
    });

    it('fail - invalid transferFromERC20 - enough allowance, not enough balance (IndexGovernance: TRANSFER_FROM)', async () => {
      // get voteAssets
      const voteAssets = voteProposalAssets.base;

      // run method createProposal() - successfully
      await expect(
        indexGovernance.connect(aliceWallet).createProposal(voteAssets.assets, voteAssets.weights, voteAssets.duration),
      ).not.to.be.reverted;

      // set and check amountXHBT
      const amountXHBT = expandTo18Decimals(1000000000);
      expect(amountXHBT).to.be.gt(0);

      // increase XHBT allowance to indexGovernance.address
      await indexHybridToken.connect(otherWallet1).increaseAllowance(indexGovernance.address, amountXHBT);

      // get and check currentAllowanceXHBT
      const currentAllowanceXHBT = await indexHybridToken.allowance(otherWallet1.address, indexGovernance.address);
      expect(currentAllowanceXHBT).to.be.gte(amountXHBT);

      // get and check beforeBalanceXHBT
      const beforeBalanceXHBT = await indexHybridToken.balanceOf(otherWallet1.address);
      expect(beforeBalanceXHBT).to.be.lt(amountXHBT);

      // run method vote() - reverted
      await expect(indexGovernance.connect(otherWallet1).vote(amountXHBT, false)).to.be.revertedWith(
        ERRORS.TRANSFER_FROM,
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

      // set prosXHBTList, consXHBTList, totalProsXHBT, totalConsXHBT and totalAmountXHBT
      const prosXHBTList = [100, 200, 300, 400, 500];
      const consXHBTList = [200, 300, 400];
      const totalProsXHBT = prosXHBTList.reduce((totalAmount: number, item: number) => totalAmount + item, 0);
      const totalConsXHBT = consXHBTList.reduce((totalAmount: number, item: number) => totalAmount + item, 0);
      const totalAmountXHBT = totalProsXHBT + totalConsXHBT;
      expect(totalAmountXHBT).to.be.gt(0);

      // increase XHBT allowance to indexGovernance.address
      await indexHybridToken.connect(otherWallet1).increaseAllowance(indexGovernance.address, totalAmountXHBT);

      // get and check currentAllowanceXHBT
      const currentAllowanceXHBT = await indexHybridToken.allowance(otherWallet1.address, indexGovernance.address);
      expect(currentAllowanceXHBT).to.be.gte(totalAmountXHBT);

      // get and check beforeBalanceXHBT
      const beforeBalanceXHBT = await indexHybridToken.balanceOf(otherWallet1.address);
      expect(beforeBalanceXHBT).to.be.gte(totalAmountXHBT);

      // get and check beforeVotesOfUser
      const beforeVotesOfUser = await indexGovernance.votesOfUserByProposalId(beforeProposal.id, otherWallet1.address);
      expect(beforeVotesOfUser).to.be.eq(0);

      // run method vote() several times (decision: true) - successfully
      for (const amountXHBT of prosXHBTList) {
        await expect(indexGovernance.connect(otherWallet1).vote(amountXHBT, true)).not.to.be.reverted;
      }

      // run method vote() several times (decision: false) - successfully
      for (const amountXHBT of consXHBTList) {
        await expect(indexGovernance.connect(otherWallet1).vote(amountXHBT, false)).not.to.be.reverted;
      }

      // get and check afterVotesOfUser
      const afterVotesOfUser = await indexGovernance.votesOfUserByProposalId(beforeProposal.id, otherWallet1.address);
      expect(afterVotesOfUser).to.be.eq(beforeVotesOfUser.add(totalAmountXHBT));

      // get and check afterProposal
      const afterProposal = await indexGovernance.proposal();
      expect(afterProposal.id).to.be.eq(beforeProposal.id);
      expect(afterProposal.pros).to.be.eq(beforeProposal.pros.add(totalProsXHBT));
      expect(afterProposal.cons).to.be.eq(beforeProposal.cons.add(totalConsXHBT));
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
