import hre from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { expandTo18Decimals, mineBlocks } from '../shared/utilities';
import { HybridToken } from '../../typechain/HybridToken';
import { IndexStaking } from '../../typechain/IndexStaking';
import { indexStakingFixture, IndexStakingParams } from './indexStakingFixtures';

describe('IndexStaking', () => {
  let sToken: HybridToken;
  let rToken: HybridToken;
  let indexStaking: IndexStaking;
  let testStartBlockNumber: number;
  let ownerWallet: SignerWithAddress;
  let aliceWallet: SignerWithAddress;
  let eveWallet: SignerWithAddress;

  beforeEach(async () => {
    [ownerWallet, aliceWallet, eveWallet] = await hre.ethers.getSigners();

    // get testStartBlockNumber
    testStartBlockNumber = await hre.ethers.provider.getBlockNumber();

    // load fixture
    const fixture = await indexStakingFixture([ownerWallet]);

    // update contract variables
    sToken = fixture.stakingToken;
    rToken = fixture.rewardToken;
    indexStaking = fixture.indexStaking;

    // init test action
    await rToken.transfer(indexStaking.address, IndexStakingParams.rewardSupply); // transfer rToken tokens to indexStaking address
    await sToken.transfer(aliceWallet.address, expandTo18Decimals(500000)); // transfer sToken tokens to Eve address
    await sToken.transfer(eveWallet.address, expandTo18Decimals(500000)); // transfer sToken tokens to Eve address
  });

  it('success - withdraw all, before past contract duration', async () => {
    // set walletDataList
    const walletData = { wallet: eveWallet, amountSToken: expandTo18Decimals(25000) };

    // get and check beforeBalanceSToken
    // const beforeBalanceSToken = await sToken.balanceOf(walletData.wallet.address);
    // expect(beforeBalanceSToken).to.be.gte(walletData.amountSToken);

    // get and check beforeStake
    const beforeStake = await indexStaking.stake(walletData.wallet.address);
    // expect(beforeStake).to.be.eq(0);

    // increase sToken allowance to indexStaking.address and run method deposit() - successfully
    await sToken.connect(walletData.wallet).increaseAllowance(indexStaking.address, walletData.amountSToken);
    await expect(indexStaking.connect(walletData.wallet).deposit(walletData.amountSToken)).not.to.be.reverted;

    // mine some blocks
    await mineBlocks(hre.ethers.provider, 6490);

    // run method withdraw() - successfully
    await expect(indexStaking.connect(walletData.wallet)['withdraw()']()).not.to.be.reverted;
    // await indexStaking.connect(walletData.wallet).rewardOf(walletData.wallet.address);
  });
});
