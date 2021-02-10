const RightsManager = artifacts.require('RightsManager');
const SmartPoolManager = artifacts.require('SmartPoolManager');
const CRPFactory = artifacts.require('CRPFactory');
const BFactory = artifacts.require('BFactory');
const BalancerSafeMath = artifacts.require('BalancerSafeMath');
const BalancerSafeMathMock = artifacts.require('BalancerSafeMathMock');

require('dotenv').config();

module.exports = async function (deployer, network, accounts) {
  if (network === 'development'  ||
      network === 'coverage'     ||
      network === 'ropsten-fork' ||
      network === 'rinkeby-fork'
  ) {
    await deployer.deploy(BFactory);
    await deployer.deploy(BalancerSafeMathMock);
  }

  await deployer.deploy(RightsManager);
  await deployer.deploy(SmartPoolManager);
  await deployer.deploy(BalancerSafeMath);

  deployer.link(BalancerSafeMath, CRPFactory);
  deployer.link(RightsManager, CRPFactory);
  deployer.link(SmartPoolManager, CRPFactory);

  await deployer.deploy(CRPFactory);

  console.log('CRP Factory at: ', CRPFactory.address);
};
