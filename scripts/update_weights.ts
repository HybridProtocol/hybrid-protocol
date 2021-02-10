import { ethers } from 'hardhat';
import { Overrides, utils, BigNumber } from 'ethers';
import { parseBigNumber, parseEthAddress, parseWallet, parseNumber } from '../test/shared/parser';
import ConfigurableRightsPool from '../presale/build/contracts/ConfigurableRightsPool.json';
import { requestConfirmation, mineBlocks } from '../test/shared/utilities';

async function main() {
  let weightUSDC: BigNumber;
  let weightHBT: BigNumber;
  let normUSDC;
  let normHBT;
  let pctUSDC;
  let pctHBT;
  let blocksElapsed;
  let tx;

  console.log(`
***********************************************
*** Update weights for CRP presale contract ***
***********************************************
`);
  const wallet = parseWallet('PRIVATE_KEY');
  const gasPrice = parseBigNumber('GAS_PRICE_GWEI', 9);
  const CRP = parseEthAddress('CRP');
  const USDC = parseEthAddress('USDC');
  const HBT = parseEthAddress('HBT');
  const startBlock = parseNumber('DELTA_PRESALE_START_BLOCK');

  const overrides: Overrides = { gasPrice: gasPrice };

  // Settings for ganache-cli local environment
  // const url = "http://127.0.0.1:8545";
  // const provider = ethers.providers.getDefaultProvider(url);

  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log(`Delta presale address: ${CRP}`);
  console.log(`USDC address: ${USDC}`);
  console.log(`HBT address: ${HBT}`);

  // Presale from Truffle project
  const deltaPresale = await new ethers.Contract(CRP, ConfigurableRightsPool.abi, ethers.provider);

  console.log(`Current wallet: ${wallet.address}`);
  const admin = await deltaPresale.getController();
  console.log(`Admin wallet: ${admin}`);
  console.log(`Start block: ${startBlock}`);
  let block = await ethers.provider.getBlockNumber();
  console.log(`Current block: ${block}`);
  blocksElapsed = block - startBlock;
  console.log(`Blocks elapsed: ${blocksElapsed}`);

  // Calculate the percentages (rounded to 3 decimals to avoid numeric issues)
  pctUSDC = Math.pow(3, -blocksElapsed / 32500) * 0.9;
  pctHBT = 1 - pctUSDC;
  console.log(`\nNew percentages weights: USDC weight: ${pctUSDC}; HBT weight: ${pctHBT}`);

  // Convert the percentages to denormalized weights
  normUSDC = Math.floor(pctUSDC * 40 * 1000) / 1000;
  normHBT = Math.floor(pctHBT * 40 * 1000) / 1000;
  console.log(`\nNew denormalized weights: USDC weight: ${normUSDC}; HBT weight: ${normHBT}`);

  await requestConfirmation();

  // Changing weghts transfers tokens!
  tx = await deltaPresale.updateWeight(USDC, utils.parseEther(normUSDC.toFixed(4)));
  console.log(`Waiting for result of: \x1b[36m${tx.hash}\x1b[0m`);
  await tx.wait();
  tx = await deltaPresale.updateWeight(HBT, utils.parseEther(normHBT.toFixed(4)));
  console.log(`Waiting for result of: \x1b[36m${tx.hash}\x1b[0m`);
  await tx.wait();
  console.log('Token weights were updated succesfully');

  weightUSDC = await deltaPresale.getDenormalizedWeight(USDC);
  weightHBT = await deltaPresale.getDenormalizedWeight(HBT);

  console.log(
    'Block elapsed: ' +
      blocksElapsed +
      '. Weights -> USDC: ' +
      (Number(utils.formatEther(weightUSDC)) * 2.5).toFixed(4) +
      '%\tHBT: ' +
      (Number(utils.formatEther(weightHBT)) * 2.5).toFixed(4) +
      '%',
  );

  console.log('Success');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
