import { BigNumber } from 'ethers/utils';

export class ContractDetails {
  public name: string;
  public symbol: string;
  public totalSupply: BigNumber;
  public maxMintedSupply: BigNumber;
  public decimals: number;
  public mintedAmount: BigNumber;

  constructor() {
    const name = process.env.CONTRACT_NAME;
    if (!name) {
      throw new Error('Unset CONTRACT_NAME');
    }
    const symbol = process.env.CONTRACT_SYMBOL;
    if (!symbol) {
      throw new Error('Unset CONTRACT_SYMBOL');
    }
    const totalSupply = process.env.CONTRACT_TOTAL_SUPPLY_IN_WEI;
    if (!totalSupply) {
      throw new Error('Unset CONTRACT_TOTAL_SUPPLY');
    }
    const decimals = process.env.CONTRACT_DECIMALS;
    if (!decimals) {
      throw new Error('Unset CONTRACT_DECIMALS');
    }
    const maxMintedSupply = process.env.CONTRACT_MAX_MINTED_AMOUNT_IN_WEI;
    if (!maxMintedSupply) {
      throw new Error('Unset CONTRACT_MAX_MINTED_AMOUNT');
    }
    this.name = name;
    this.symbol = symbol;
    this.decimals = Number.parseInt(decimals);
    this.maxMintedSupply = new BigNumber(maxMintedSupply);
    this.totalSupply = new BigNumber(totalSupply);
    this.mintedAmount = new BigNumber(this.maxMintedSupply).sub(new BigNumber(this.totalSupply));
  }
}
