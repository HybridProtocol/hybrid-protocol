import { ethers } from 'hardhat';
import { Overrides } from 'ethers';
import { parseBigNumber, parseWallet, parseEthAddress } from '../test/shared/parser';
import { IndexGovernance__factory } from '../typechain/factories/IndexGovernance__factory';
import { requestConfirmation } from '../test/shared/utilities';

const _overrides: Overrides = {
  gasLimit: 7000029,
};

async function main() {
  const wallet = parseWallet('PRIVATE_KEY');
  const gasPrice = parseBigNumber('GAS_PRICE_GWEI', 9);
  const HBTAddress = parseEthAddress('HBT');
  const XHBTAddress = parseEthAddress('XHBT');
  const minProposalDuration = parseEthAddress('MIN_PROPOSAL_DURATION');

  const overrides: Overrides = { ..._overrides, gasPrice: gasPrice };
  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log(`HBT address: ${HBTAddress}`);
  console.log(`xHBT address: ${XHBTAddress}`);
  console.log(`Minimum duration of proposal (blocks): ${minProposalDuration}`);

  await requestConfirmation();

  console.log('Deploy Index Governance');
  const indexGovernance = await new IndexGovernance__factory(wallet).deploy(
    XHBTAddress,
    HBTAddress,
    minProposalDuration,
    overrides,
  );
  console.log(`\x1b[32m${indexGovernance.address}\x1b[0m`);
  console.log(`Waiting for result of: \x1b[36m${indexGovernance.deployTransaction.hash}\x1b[0m`);
  await indexGovernance.deployTransaction.wait();
  console.log('Success');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
