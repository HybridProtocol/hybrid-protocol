//SPDX-License-Identifier: Unlicense
pragma solidity ^0.6.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../libraries/SafeTransfer.sol";

contract IndexStaking {
    using SafeMath for uint256;

    uint public constant duration = 3 * 365 * 6500; // blocks
    uint public constant totalSupply = 100000000 * 10**18;
    uint public constant rewardSupply = 48 * totalSupply / 100;

    address public stakingToken;
    address public rewardToken;

    uint public staked; // S
    uint public activeStakeDeposits; // T
    mapping(address => uint) public stake; // stake
    mapping(address => uint) public stakedSnapshot; // S0

    uint public accumulatedReward;
    uint public startedBlock;

    constructor(address _stakingTokenAddress, address _rewardTokenAddress) public {
        stakingToken = _stakingTokenAddress;
        rewardToken = _rewardTokenAddress;
        startedBlock = block.number;
    }

    function deposit(uint _amount) external {
        SafeTransfer.transferFromERC20(address(stakingToken), msg.sender, address(this), _amount);
        stake[msg.sender] = _amount;
        stakedSnapshot[msg.sender] = staked;
        activeStakeDeposits = activeStakeDeposits.add(_amount);
    }

    function withdraw() external {
        uint deposited = stake[msg.sender];
        uint reward = _calculateReward();
        if (activeStakeDeposits != 0) {
            staked = staked.add(reward.div(activeStakeDeposits));
        }
        uint userReward = deposited.mul(staked.sub(stakedSnapshot[msg.sender]));
        activeStakeDeposits = activeStakeDeposits.sub(deposited);
        stake[msg.sender] = 0;
        SafeTransfer.sendERC20(address(stakingToken), msg.sender, deposited);
        SafeTransfer.sendERC20(address(rewardToken), msg.sender, userReward);
    }

    function _calculateReward() private returns (uint reward) {
        if (startedBlock.add(duration) > block.number) {
            reward = rewardSupply
                .mul(block.number)
                .mul(block.number.sub(startedBlock))
                .div((startedBlock.add(duration)).mul(duration));
        }
        reward -= accumulatedReward;
        accumulatedReward += reward;
    }
}
