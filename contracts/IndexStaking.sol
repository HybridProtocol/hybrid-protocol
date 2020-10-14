//SPDX-License-Identifier: Unlicense
pragma solidity ^0.6.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../interfaces/IIndexHybridToken.sol";
import "../interfaces/IHybridToken.sol";
import "../libraries/SafeTransfer.sol";

contract IndexStaking {
    using SafeMath for uint256;

    address public stakingToken;
    address public rewardToken;

    // init T, S, stake, S0
    uint public staked; // S
    uint public activeStakeDeposits; // T
    mapping(address => uint) public stake; // stake
    mapping(address => uint) public stakedSnapshot; // S0

    constructor(address _stakingTokenAddress, address _rewardTokenAddress) public {
        stakingToken = _stakingTokenAddress;
        rewardToken = _rewardTokenAddress;
    }

    function deposit(uint _amount) external {
        _update();
        SafeTransfer.transferFromERC20(address(stakingToken), msg.sender, address(this), _amount);
        stake[msg.sender] = _amount;
        stakedSnapshot[msg.sender] = staked;
        activeStakeDeposits = activeStakeDeposits.add(_amount);
    }

    function withdraw() external {
        _update();
        uint deposited = stake[msg.sender];
        uint reward = deposited.mul(staked.sub(stakedSnapshot[msg.sender]));
        activeStakeDeposits = activeStakeDeposits.sub(deposited);
        stake[msg.sender] = 0;
        SafeTransfer.sendERC20(address(stakingToken), msg.sender, deposited);
        SafeTransfer.sendERC20(address(rewardToken), msg.sender, reward);
    }


    function _update() private {
        uint reward = _calculateReward();
        if (activeStakeDeposits != 0) {
            staked = staked.add(reward.div(activeStakeDeposits));
        }
    }

    function _calculateReward() private returns (uint) {
        // k = 1
        // r = k * reward share * total supply (N current block - N block last reward)
    }
}