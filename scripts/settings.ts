import { BigNumber } from 'ethers';

export class Settings {
  public USDC: string;
  public stakingDuration: BigNumber;
  public hbtTotalSupply: BigNumber;
  public hbtStakingRewardSupplyPercentages: BigNumber;
  public maxXHBTSupply: BigNumber;
  public XHBTInitSupply: BigNumber;

  constructor() {
    const USDC = process.env.USDC_ADDRESS;
    if (!USDC) {
      throw new Error('Unset USDC Address');
    }

    this.USDC = USDC;

    const stakingDuration = BigNumber.from(process.env.STAKING_DURATION);
    if (!stakingDuration) {
      throw new Error('Unset staking duration');
    }

    this.stakingDuration = stakingDuration;

    const hbtTotalSupply = BigNumber.from(process.env.HBT_TOTAL_SUPPLY);
    if (!hbtTotalSupply) {
      throw new Error('Unset HBT total supply');
    }

    this.hbtTotalSupply = hbtTotalSupply;

    const hbtStakingRewardSupplyPercentages = BigNumber.from(process.env.HBT_STAKING_REWARD_SUPPLY_PERCENTAGES);
    if (!hbtStakingRewardSupplyPercentages) {
      throw new Error('Unset HBT Staking Reward Supply Percentages');
    }

    this.hbtStakingRewardSupplyPercentages = hbtStakingRewardSupplyPercentages;

    const maxXHBTSupply = BigNumber.from(process.env.MAX_XHBT_TOTAL_SUPPLY);
    if (!maxXHBTSupply) {
      throw new Error('Unset HBT Staking Reward Supply Percentages');
    }

    this.maxXHBTSupply = maxXHBTSupply;

    const XHBTInitSupply = BigNumber.from(process.env.XHBT_INIT_SUPPLY);
    if (!XHBTInitSupply) {
      throw new Error('Unset HBT Staking Reward Supply Percentages');
    }

    this.XHBTInitSupply = XHBTInitSupply;
  }
}
