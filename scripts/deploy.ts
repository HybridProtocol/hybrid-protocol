import hre, { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { Settings } from './settings';

async function main() {
  const settings = new Settings();

  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);

  console.log('Account balance:', (await deployer.getBalance()).toString());

  const SaleHybridToken = await ethers.getContractFactory('SaleHybridToken');
  const saleHybridToken = await SaleHybridToken.deploy();
  await saleHybridToken.deployed();
  console.log('Sale Hybrid Token deployed to:', saleHybridToken.address);

  let usdcAddress;
  if (hre.network.name !== 'hardhat') {
    usdcAddress = settings.USDC;
  } else {
    const USDC = await hre.ethers.getContractFactory('HybridToken');
    const usdc = await USDC.deploy('USDC Testnet', 'USDC', await deployer.getAddress(), '1000000000000000000000');
    await usdc.deployed();
    usdcAddress = usdc.address;
    console.log('USDC deployed to:', usdcAddress);
  }

  const AlphaPresale = await hre.ethers.getContractFactory('AlphaPresale');
  const alphaPresale = await AlphaPresale.deploy(usdcAddress, saleHybridToken.address, 6500);
  await alphaPresale.deployed();
  console.log('Alpha Presale deployed to:', alphaPresale.address);

  const BetaPresale = await hre.ethers.getContractFactory('BetaPresale');
  const betaPresale = await BetaPresale.deploy(usdcAddress, saleHybridToken.address, 6500);
  await betaPresale.deployed();
  console.log('Beta Presale deployed to:', betaPresale.address);

  const GammaPresale = await hre.ethers.getContractFactory('GammaPresale');
  const gammaPresale = await GammaPresale.deploy(usdcAddress, saleHybridToken.address, 6500);
  await gammaPresale.deployed();
  console.log('Gamma Presale deployed to:', gammaPresale.address);

  await saleHybridToken.mintPresale(alphaPresale.address, betaPresale.address, gammaPresale.address);
  console.log('sHBT token were minted to presale contracts');

  const totalSupplyHBT = ethers.utils.parseEther(settings.hbtTotalSupply.toString());

  const HybridToken = await hre.ethers.getContractFactory('HybridToken');
  const hybridToken = await HybridToken.deploy(
    'Hybrid Token',
    'HBT',
    await deployer.getAddress(),
    settings.hbtTotalSupply,
  );
  await hybridToken.deployed();
  console.log('Hybrid Token deployed to:', hybridToken.address);

  const IndexHybridToken = await hre.ethers.getContractFactory('IndexHybridToken');
  const indexHybridToken = await IndexHybridToken.deploy(settings.XHBTInitSupply, settings.maxXHBTSupply);
  await indexHybridToken.deployed();
  console.log('Index Hybrid Token deployed to:', indexHybridToken.address);

  const VestingSwap = await hre.ethers.getContractFactory('VestingSwap');
  const vestingSwap = await VestingSwap.deploy(
    alphaPresale.address,
    betaPresale.address,
    gammaPresale.address,
    hybridToken.address,
  );
  await vestingSwap.deployed();
  console.log('Vesting Swap deployed to:', vestingSwap.address);

  const rewardSupply = BigNumber.from(settings.hbtStakingRewardSupplyPercentages).mul(totalSupplyHBT).div(100);
  const IndexStaking = await hre.ethers.getContractFactory('IndexStaking');
  const indexStaking = await IndexStaking.deploy(
    indexHybridToken.address,
    hybridToken.address,
    settings.stakingDuration,
    totalSupplyHBT,
    rewardSupply,
  );
  await indexStaking.deployed();
  console.log('Index Staking deployed to:', indexStaking.address);

  const IndexGovernance = await hre.ethers.getContractFactory('IndexGovernance');
  const indexGovernance = await IndexGovernance.deploy(indexHybridToken.address, hybridToken.address, 100);
  await indexGovernance.deployed();
  console.log('Index Governance deployed to:', indexGovernance.address);

  console.log('\nHBT Total Supply', ethers.utils.formatUnits(settings.hbtTotalSupply, 'wei'));
  console.log('Account balance:', (await deployer.getBalance()).toString());
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
