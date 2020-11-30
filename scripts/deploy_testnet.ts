import hre, { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { convertStringToArrayish } from '../test/shared/utilities';

async function main() {
  let tx;
  const aliceWallet = '0x76Fd4B48af98436A26Bf649703cE7A2620F4dEEa';
  const hbtTotalSupply = 100000000;
  const presaleDuration = 10000;
  const [deployer] = await ethers.getSigners();
  const assetArrayishValues = {
    BTC: convertStringToArrayish('BTC'),
    ETH: convertStringToArrayish('ETH'),
    BCH: convertStringToArrayish('BCH'),
    BNB: convertStringToArrayish('BNB'),
    LTC: convertStringToArrayish('LTC'),
    EOS: convertStringToArrayish('EOS'),
    DASH: convertStringToArrayish('DASH'),
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
      duration: 7,
      weights: [3500, 2000, 1000, 300, 700, 1700, 800],
      title: 'base title',
      description: 'base description',
      link: 'base link',
    },
  };

  console.log('Deploying contracts with the account:', deployer.address);

  console.log('Account balance:', (await deployer.getBalance()).toString());

  const SaleHybridToken = await ethers.getContractFactory('TSaleHybridToken');
  const saleHybridToken = await SaleHybridToken.deploy();
  await saleHybridToken.deployed();
  console.log('Sale Hybrid Token deployed to:', saleHybridToken.address);
  await saleHybridToken.connect(deployer).mint(aliceWallet, BigNumber.from('100000000000000000000000'));
  console.log('sHBT minted to:', aliceWallet);

  let usdcAddress;

  const USDC = await hre.ethers.getContractFactory('THybridToken');
  const usdc = await USDC.deploy('USDC Testnet', 'USDC', await deployer.getAddress(), '10000000000000000000000000000');
  await usdc.deployed();
  usdcAddress = usdc.address;
  console.log('USDC deployed to:', usdcAddress);
  await usdc.mint(aliceWallet, BigNumber.from('100000000000000000000000'));
  console.log((await usdc.balanceOf(aliceWallet)).toString(), ' USDC minted to:', aliceWallet);

  const AlphaPresale = await hre.ethers.getContractFactory('TAlphaPresale');
  const alphaPresale = await AlphaPresale.deploy(usdcAddress, saleHybridToken.address, presaleDuration);
  await alphaPresale.deployed();
  console.log('Alpha Presale deployed to:', alphaPresale.address);
  await alphaPresale.start();
  console.log('Alpha Presale was started');

  const BetaPresale = await hre.ethers.getContractFactory('TBetaPresale');
  const betaPresale = await BetaPresale.deploy(usdcAddress, saleHybridToken.address, presaleDuration);
  await betaPresale.deployed();
  console.log('Beta Presale deployed to:', betaPresale.address);
  await betaPresale.start();
  console.log('Beta Presale was started');

  const GammaPresale = await hre.ethers.getContractFactory('TGammaPresale');
  const gammaPresale = await GammaPresale.deploy(usdcAddress, saleHybridToken.address, presaleDuration);
  await gammaPresale.deployed();
  console.log('Gamma Presale deployed to:', gammaPresale.address);
  await gammaPresale.start();
  console.log('Gamma Presale was started');

  await saleHybridToken.mintPresale(alphaPresale.address, betaPresale.address, gammaPresale.address);
  console.log('sHBT token were minted to presale contracts');

  const totalSupplyHBT = ethers.utils.parseEther(hbtTotalSupply.toString());

  const HybridToken = await hre.ethers.getContractFactory('THybridToken');
  const hybridToken = await HybridToken.deploy('Hybrid Token', 'HBT', await deployer.getAddress(), hbtTotalSupply);
  await hybridToken.deployed();
  console.log('Hybrid Token deployed to:', hybridToken.address);
  await hybridToken.mint(aliceWallet, '100000000000000000000000');
  console.log((await hybridToken.balanceOf(aliceWallet)).toString(), ' HBT minted to:', aliceWallet);

  const IndexHybridToken = await hre.ethers.getContractFactory('TIndexHybridToken');
  const indexHybridToken = await IndexHybridToken.deploy('1000000000000000000000000', '1000000000000000000000000000');
  await indexHybridToken.deployed();
  console.log('Index Hybrid Token deployed to:', indexHybridToken.address);
  await indexHybridToken.mint(aliceWallet, '100000000000000000000000');
  console.log((await indexHybridToken.balanceOf(aliceWallet)).toString(), ' xHBT minted to:', aliceWallet);

  await indexHybridToken.addAddressToMaintainers(deployer.address);
  await indexHybridToken.addAddressToMaintainers(aliceWallet);

  const VestingSwap = await hre.ethers.getContractFactory('TVestingSwap');
  const vestingSwap = await VestingSwap.deploy(
    alphaPresale.address,
    betaPresale.address,
    gammaPresale.address,
    hybridToken.address,
  );
  await vestingSwap.deployed();
  console.log('Vesting Swap deployed to:', vestingSwap.address);
  await vestingSwap.startAlphaSwap();
  await vestingSwap.startBetaSwap();
  await vestingSwap.startGammaSwap();
  console.log('All Vesting Swap was started');

  const rewardSupply = BigNumber.from(48).mul(totalSupplyHBT).div(100);
  const IndexStaking = await hre.ethers.getContractFactory('IndexStaking');
  const indexStaking = await IndexStaking.deploy(
    indexHybridToken.address,
    hybridToken.address,
    13000,
    totalSupplyHBT,
    rewardSupply,
  );
  await indexStaking.deployed();
  console.log('Index Staking deployed to:', indexStaking.address);

  const IndexGovernance = await hre.ethers.getContractFactory('IndexGovernance');
  const indexGovernance = await IndexGovernance.deploy(indexHybridToken.address, hybridToken.address, 5);
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
  console.log('Proposal was created');

  console.log('Account balance:', (await deployer.getBalance()).toString(), '\n');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
