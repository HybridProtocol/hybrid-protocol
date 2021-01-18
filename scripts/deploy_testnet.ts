import hre, { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { convertStringToArrayish, formatEth } from '../test/shared/utilities';

async function main() {
  let tx;
  const aliceWallet = '0x76Fd4B48af98436A26Bf649703cE7A2620F4dEEa';
  const commonMintedAmount = '100000000000000000000000';
  const hbtTotalSupply = 100000000;
  const presaleDuration = 10000;
  const stakingDuration = 33000;
  const [deployer] = await ethers.getSigners();
  const assetArrayishValues = {
    BTC: convertStringToArrayish('BTC'),
    ETH: convertStringToArrayish('ETH'),
    BCH: convertStringToArrayish('BCH'),
    BNB: convertStringToArrayish('BNB'),
  };

  const voteProposalAssets = {
    start: {
      assets: [assetArrayishValues.BTC, assetArrayishValues.ETH, assetArrayishValues.BCH],
      weights: [5500, 2500, 2000],
    },
    base: {
      assets: [assetArrayishValues.BTC, assetArrayishValues.ETH, assetArrayishValues.BCH, assetArrayishValues.BNB],
      duration: 57,
      weights: [3500, 2000, 1000, 3500],
      title: 'base title',
      description: 'base description',
      link: 'base link',
    },
  };
  console.log('---------------------------------------------------------------------------');
  console.log('Deployer account:', deployer.address);
  console.log('Deployer account balance:', formatEth(await deployer.getBalance()), 'ETH');
  console.log('---------------------------------------------------------------------------');
  const SaleHybridToken = await ethers.getContractFactory('TestSaleHybridToken');
  const saleHybridToken = await SaleHybridToken.deploy();
  await saleHybridToken.deployed();
  console.log('Sale Hybrid Token deployed to:', saleHybridToken.address);
  tx = await saleHybridToken.connect(deployer).mint(aliceWallet, BigNumber.from(commonMintedAmount));
  await hre.ethers.provider.waitForTransaction(tx.hash);
  console.log(formatEth(await saleHybridToken.balanceOf(aliceWallet)), 'sHBT minted to:', aliceWallet);
  console.log('---------------------------------------------------------------------------');
  const USDC = await hre.ethers.getContractFactory('TestHybridToken');
  const usdc = await USDC.deploy(
    'USDC Testnet',
    'USDC',
    await deployer.getAddress(),
    BigNumber.from(commonMintedAmount).mul(100),
  );
  await usdc.deployed();
  const usdcAddress = usdc.address;
  console.log('USDC deployed to:', usdcAddress);
  tx = await usdc.mint(aliceWallet, BigNumber.from(commonMintedAmount));
  await hre.ethers.provider.waitForTransaction(tx.hash);
  console.log(formatEth(await usdc.balanceOf(aliceWallet)), 'USDC minted to:', aliceWallet);
  console.log('---------------------------------------------------------------------------');
  const AlphaPresale = await hre.ethers.getContractFactory('AlphaPresale');
  const alphaPresale = await AlphaPresale.deploy(usdcAddress, saleHybridToken.address, presaleDuration);
  await alphaPresale.deployed();
  console.log('Alpha Presale deployed to:', alphaPresale.address);
  const BetaPresale = await hre.ethers.getContractFactory('BetaPresale');
  const betaPresale = await BetaPresale.deploy(usdcAddress, saleHybridToken.address, presaleDuration);
  await betaPresale.deployed();
  console.log('Beta Presale deployed to:', betaPresale.address);
  const GammaPresale = await hre.ethers.getContractFactory('GammaPresale');
  const gammaPresale = await GammaPresale.deploy(usdcAddress, saleHybridToken.address, presaleDuration);
  await gammaPresale.deployed();
  console.log('Gamma Presale deployed to:', gammaPresale.address);
  tx = await saleHybridToken.mintPresale(alphaPresale.address, betaPresale.address, gammaPresale.address);
  await hre.ethers.provider.waitForTransaction(tx.hash);
  console.log('sHBT tokens were minted to presale contracts');
  await saleHybridToken.addAddressesToMaintainers([alphaPresale.address, betaPresale.address, gammaPresale.address]);
  console.log('Presales have been added to maintainers of sHBT contract');
  await alphaPresale.start();
  console.log('Alpha Presale was started');
  await betaPresale.start();
  console.log('Beta Presale was started');
  await gammaPresale.start();
  console.log('Gamma Presale was started');
  console.log('---------------------------------------------------------------------------');

  const totalSupplyHBT = ethers.utils.parseEther(hbtTotalSupply.toString());

  const HybridToken = await hre.ethers.getContractFactory('TestHybridToken');
  const hybridToken = await HybridToken.deploy('Hybrid Token', 'HBT', await deployer.getAddress(), hbtTotalSupply);
  await hybridToken.deployed();
  console.log('Hybrid Token deployed to:', hybridToken.address);
  tx = await hybridToken.mint(aliceWallet, commonMintedAmount);
  await hre.ethers.provider.waitForTransaction(tx.hash);
  console.log(formatEth(await hybridToken.balanceOf(aliceWallet)), 'HBT minted to:', aliceWallet);
  console.log('---------------------------------------------------------------------------');
  const IndexHybridToken = await hre.ethers.getContractFactory('TestIndexHybridToken');
  const indexHybridToken = await IndexHybridToken.deploy('1000000000000000000000000', '1000000000000000000000000000');
  await indexHybridToken.deployed();
  console.log('Index Hybrid Token deployed to:', indexHybridToken.address);
  tx = await indexHybridToken.mint(aliceWallet, commonMintedAmount);
  await hre.ethers.provider.waitForTransaction(tx.hash);
  console.log(formatEth(await indexHybridToken.balanceOf(aliceWallet)), 'xHBT minted to:', aliceWallet);
  console.log('---------------------------------------------------------------------------');
  await indexHybridToken.addAddressToMaintainers(deployer.address);
  await indexHybridToken.addAddressToMaintainers(aliceWallet);

  const VestingSwap = await hre.ethers.getContractFactory('VestingSwap');
  const vestingSwap = await VestingSwap.deploy(
    alphaPresale.address,
    betaPresale.address,
    gammaPresale.address,
    hybridToken.address,
    saleHybridToken.address,
  );
  await vestingSwap.deployed();
  console.log('Vesting Swap deployed to:', vestingSwap.address);
  tx = await vestingSwap.connect(deployer).transferOwnership(aliceWallet);
  await hre.ethers.provider.waitForTransaction(tx.hash);
  console.log('Ownership was transferred to:', aliceWallet);
  await saleHybridToken.addAddressToMaintainers(vestingSwap.address);
  console.log('Vesting Swap has been added to maintainers of sHBT contract');
  tx = await hybridToken.addAddressToMaintainers(deployer.address);
  await hre.ethers.provider.waitForTransaction(tx.hash);
  console.log('Deployer was added to Hybrid token maintainers');
  tx = await hybridToken.mintForSwap(vestingSwap.address);
  await hre.ethers.provider.waitForTransaction(tx.hash);
  console.log('HBT tokens were minted to Vesting Swap contract');
  console.log('---------------------------------------------------------------------------');
  const rewardSupply = BigNumber.from(48).mul(totalSupplyHBT).div(100);
  const IndexStaking = await hre.ethers.getContractFactory('IndexStaking');
  const indexStaking = await IndexStaking.deploy(
    indexHybridToken.address,
    hybridToken.address,
    stakingDuration,
    totalSupplyHBT,
    rewardSupply,
  );
  await indexStaking.deployed();
  console.log('Index Staking deployed to:', indexStaking.address);
  console.log('---------------------------------------------------------------------------');
  const IndexGovernance = await hre.ethers.getContractFactory('IndexGovernance');
  const indexGovernance = await IndexGovernance.deploy(indexHybridToken.address, hybridToken.address, 50);
  await indexGovernance.deployed();
  console.log('Index Governance deployed to:', indexGovernance.address);
  await indexHybridToken.addAddressToMaintainers(indexGovernance.address);
  await indexGovernance.addAddressToMaintainers(deployer.address);
  tx = await indexGovernance.addAddressToMaintainers(aliceWallet);
  await hre.ethers.provider.waitForTransaction(tx.hash);
  tx = await indexHybridToken.updateComposition(voteProposalAssets.start.assets, voteProposalAssets.start.weights);
  console.log('Index composition was updated');
  await hre.ethers.provider.waitForTransaction(tx.hash);
  const voteAssets = voteProposalAssets.base;
  await indexGovernance.createProposal(
    voteAssets.assets,
    voteAssets.weights,
    voteAssets.duration,
    voteAssets.title,
    voteAssets.description,
    voteAssets.link,
  );
  console.log('Voting proposal was created');
  console.log('----------------------------------------------------------------------------\n');
  console.log('Deployer account balance:', formatEth(await deployer.getBalance()), 'ETH\n');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
