#  Installation
1. Make sure to use node 10.20.1
2. Run `npm install` in project root directory
3. Create `.env` file:
```
MNEMONIC_OR_PRIVATE_KEY="{YOUR_PRIVATE_KEY}"
INFURA_API_KEY={YOUR_INFURA_API_KEY}
CONTRACT_NAME={YOUR_CONTRACT_NAME}
CONTRACT_SYMBOL={YOUR_CONTRACT_SYMBOL}
CONTRACT_TOTAL_SUPPLY_IN_WEI={YOUR_CONTRACT_TOTAL_SUPPLY}
CONTRACT_DECIMALS={YOUR_CONTRACT_DECIMALS}
CONTRACT_MAX_MINTED_AMOUNT_IN_WEI={YOUR_CONTRACT_MAX_MINTED_AMOUNT_IN_WEI}
```
4. Run `npm run rebuild` in project root directory

# Deploy Mintable ERC20
1. Deploy contract example `NAME=Hello SYMBOL=WORLD DECIMALS=18 TOTAL_SUPPLY=10000000000 npx buidler run --network ropsten scripts/deploy_custom.ts`
2. Mint amount example `CONTRACT=0x3653aC9A46482Fb00B87B5002b7Be20706F83E26 ACCOUNTS=0x7754E650CC1D8b4cA4cBD49526b2A01953481a1A,0xa42aCE1C87De02eD1e4B4Cf53A3b4d5e0Fbb0667 AMOUNT=0.3333 npx buidler run --network ropsten scripts/mint_amount.ts`
3. Mint amounts example `CONTRACT=0x3653aC9A46482Fb00B87B5002b7Be20706F83E26 ACCOUNTS=0x7754E650CC1D8b4cA4cBD49526b2A01953481a1A,0xa42aCE1C87De02eD1e4B4Cf53A3b4d5e0Fbb0667 AMOUNTS=0.3333,0.1 npx buidler run --network ropsten scripts/mint_amounts.ts`

#  Boilerplate

This is a starter kit for developing, testing, and deploying smart contracts with a full Typescript environment. This stack uses [Buidler](https://buidler.dev) as the platform layer to orchestrate all the tasks. [Ethers](https://docs.ethers.io/ethers.js/html/index.html) is used for all Ethereum interactions and testing.

[Blog Post](https://medium.com/@rahulsethuram/the-new-solidity-dev-stack-buidler-ethers-waffle-typescript-tutorial-f07917de48ae)