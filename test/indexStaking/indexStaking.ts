import chai, { expect } from 'chai';
import { createFixtureLoader, MockProvider, solidity } from 'ethereum-waffle';
import { expandTo18Decimals } from '../shared/utilities';
import { HybridToken } from '../../typechain/HybridToken';
import { IndexStaking } from '../../typechain/IndexStaking';
import { indexStakingFixture, IndexStakingParams } from './indexStakingFixtures';

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
});
