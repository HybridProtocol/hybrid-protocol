# Hybrid Protocol



#  Installation
1. Make sure to use node 12.12.0
2. Run `npm install` in project root directory
3. Create `.env` file:
```

INFURA_API_KEY="{YOUR_INFURA_API_KEY}"
PRIVATE_KEY="{YOUR_PRIVATE_KEY}"
GAS_PRICE_GWEI="{GAS_PRICE_IN_GWEI}"
PRESALE_DURATION="{PRESALE_DURATION_IN_BLOCKS}"
SHBT="{ADDRESS_OF_SHBT_TOKEN_CONTRACT}"
HBT="{ADDRESS_OF_HBT_TOKEN_CONTRACT}"
XHBT="{ADDRESS_OF_XHBT_TOKEN_CONTRACT}"
ALPHA_PRESALE="{ADDRESS_OF_ALPHA_PRESALE_CONTRACT}"
BETA_PRESALE="{ADDRESS_OF_BETA_PRESALE_CONTRACT}"
GAMMA_PRESALE="{ADDRESS_OF_GAMMA_PRESALE_CONTRACT}"
HBT_TOTAL_SUPPLY="{HBT_TOTAL_SUPPLY}"
XHBT_INIT_SUPPLY="{XHBT_INITIAL_SUPPLY}"
MAX_XHBT_TOTAL_SUPPLY="{MAX_XHBT_TOTAL_SUPPLY}"
STAKING_DURATION="{STAKING_DURATION_IN_BLOCKS}"
STAKING_REWARD_SUPPLY_PERCENTAGES="{PERCENTAGES_OF_SUPPLY_FOR_STAKING_REWARD}"
MIN_PROPOSAL_DURATION="{MIN_PROPOSAL_DURATION_IN_BLOCKS}"
USDC_ADDRESS="{USDC_CONTRACT_ADDRESS}"

```
4. Run `npm run rebuild` in project root directory



# Deploy Hybrid Protocol
It's need to run each script in scripts folder for appropriate contract. They are numbered in the correct sequence, because it's need to update the `.env` after deploying each contract. Hardhat could help, e.g. `npx hardhat run scripts/1_deploy_shbt.ts`

Don't forget to mint sHBT tokens for presales contracts at the end with `mint_for_presale` script.

For testing purposes it could be deployed to testnet with `deploy_testnet.tx` script. It will deploy all smart contracts and allocate each token to `aliceWallet` address in the script. Also, it started all presales and transfer ownership of `VestingSwap` to `aliceWallet` for starting each of the swaps. It's necessary, because swap activating after presale was finished.

# Deploy Balancer Presale
1. Go to the balancer presale folder `cd presale`
2. Run `npm install` in project root directory
3. Type `truffle deploy` and choose appropriate network, full command should be looked like `truffle deploy --network ropsten` in depends of the network

# Under the Balancer Hood
Please look at the `test/crpPresale.js` to understand the flow of weights update

## How to create new Configurable Right Pool
At first you need to get factory for Configurable Right Pool creation. It is avaiable at address in **Ropsten** testnet

```javascript
const crpFactory = await CRPFactory.at('0x4db44402434afe4B0d27D8576B1542c7f213ac23')
```
For this you need to describe permission and pool parameters
Permission params:

```javascript
const permissions = { 
  canPauseSwapping: true,
  canChangeSwapFee: true,
  canChangeWeights: true,
  canAddRemoveTokens: false,
  canWhitelistLPs: false,
  canChangeCap: false,
  canRemoveAllTokens: false
}
```
For pool params you need to get already deployed test USDC and HBT tokens and determine additional values

```javascript
const WETH = '0x0000000000000000000000000000000000000000'
const XYZ = '0x0000000000000000000000000000000000000000'

const startWeights = [toWei('36'), toWei('4')];
const startBalances = [toWei('9000000'), toWei('1000000')];
const swapFee = 10 ** 15;
```
Pool params:

```javascript
const poolParams = { 
  poolTokenSymbol: 'AYE',
  poolTokenName: 'AYE',
  constituentTokens: [USDC, HBT],
  tokenBalances: startBalances,
  tokenWeights: startWeights,
  swapFee: swapFee
}
```
In addition need to know Balancer Factory address

```javascript
const BFactoryAddress = '0x0000000000000000000000000000000000000000'
```
Finally CRP could be created
```javascript
const crp = await crpFactory.newCrp(BFactoryAddress, poolParams, permissions)
```
but you can get it in **Ropsten** testnet by the address
```javascript
const crp = await ConfigurableRightsPool.at('0x974327bdc8eF4367Af6E3A412E12EB4d7bb52D45')
```


### Update weights

```javascript
await weth.approve(crp.address, MAX)
await xyz.approve(crp.address, MAX)
```
and then pool could be created
```javascript
await crp.createPool(toWei('100'), 10, 10)
```



