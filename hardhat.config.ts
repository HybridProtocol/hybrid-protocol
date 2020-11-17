import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-typechain';

// import 'hardhat-gas-reporter';
// import 'solidity-coverage';

import { HardhatUserConfig } from 'hardhat/config';
import * as dotenv from 'dotenv';

dotenv.config();

const secret: string = process.env.MNEMONIC_OR_PRIVATE_KEY as string;

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  solidity: {
    version: '0.6.12',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      gas: 99999999,
      gasPrice: 20,
      blockGasLimit: 999999999,
      allowUnlimitedContractSize: true,
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [secret],
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [secret],
    },
    // coverage: {
    //   url: 'http://127.0.0.1:8555', // Coverage launches its own ganache-cli client
    // },
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  // gasReporter: {
  //   enabled: COINMARKETCAP_API_KEY ? true : false,
  //   // coinmarketcap: COINMARKETCAP_API_KEY,
  //   currency: 'GBP',
  //   src: './contracts'
  // }
};

export default config;
