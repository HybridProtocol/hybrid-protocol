### How to create Configurable Right Pool
At first need to get factory for Configurable Right Pool creation. It avaiable by address in **Rinkeby** testnet

```javascript
const crpFactory = await CRPFactory.at('0x999A3Ab5CF12F884DAc51B426eF1B04A7C3C8deD')
```
For this one need to describe permission and pool parameters
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
For pool params need to get deployed test WETH and XYZ tokens and determine additional values

```javascript
const WETH = '0x1c6b4a446157FB1d609A7F8f077DAF82936a5191'
const XYZ = '0x9D1944Fda601A031Ceb0a2b180ae36238eCb2C13'

const startWeights = [toWei('1'), toWei('39')];
const startBalances = [toWei('80000'), toWei('40')];
const swapFee = 10 ** 15;
```
Pool params:

```javascript
const poolParams = { 
  poolTokenSymbol: 'AYE',
  poolTokenName: 'AYE',
  constituentTokens: [WETH, XYZ],
  tokenBalances: startBalances,
  tokenWeights: startWeights,
  swapFee: swapFee
}
```
In addition need to know Balancer Factory address

```javascript
const BFactoryAddress = '0x3D088F1Ed83B32D141934973042FBc5A0980F89a'
```
Finally CRP could be created
```javascript
const crp = await crpFactory.newCrp(BFactoryAddress, poolParams, permissions)
```
but you can get it in **Rinkeby** testnet by the address
```javascript
const crp = await ConfigurableRightsPool.at('0x974327bdc8eF4367Af6E3A412E12EB4d7bb52D45')
```




### Update weights
In order to make the contract update weights according to plan, you need to call external function `pokeWeights()`. But at first pool has to be created by the CRP. For this one need approve pool tokens
for CRP address 

```javascript
await weth.approve(crp.address, MAX)
await xyz.approve(crp.address, MAX)
```
and then pool could be created
```javascript
await crp.createPool(toWei('100'), 10, 10)
```
Finally, weights could be changed

```javascript
await crp.pokeWeights()
```

Example of transaction you can find by the link https://rinkeby.etherscan.io/tx/0x4b9b36945f2629adeb1228543bc836bb8160a9c9b133b021c54a838032285511
