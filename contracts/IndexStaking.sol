// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.6.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../libraries/SafeTransfer.sol";

contract IndexStaking is ReentrancyGuard {
    using SafeMath for uint256;

    uint public duration; // blocks
    uint public totalSupply;
    uint public rewardSupply;

    address public stakingToken;
    address public rewardToken;

    uint public staked; // S
    uint public activeStakeDeposits; // T
    mapping(address => uint) public stake; // stake
    mapping(address => uint) public stakedSnapshot; // S0

    uint public accumulatedReward;
    uint public startBlock;

    event Deposited(address account, uint amount);
    event Withdrawn(address account, uint deposited, uint reward);

    constructor(address _stakingTokenAddress, address _rewardTokenAddress, uint _duration, uint _totalSupply, uint _rewardSupply) public {
        stakingToken = _stakingTokenAddress;
        rewardToken = _rewardTokenAddress;
        duration = _duration;
        totalSupply = _totalSupply;
        rewardSupply = _rewardSupply;
        startBlock = block.number;
    }

    function deposit(uint _amount) public {
        require(startBlock.add(duration) > block.number, "IndexStaking: INVALID_DATE");
        if (stake[msg.sender] != 0) {
            withdraw();
        }
        SafeTransfer.transferFromERC20(address(stakingToken), msg.sender, address(this), _amount);
        stake[msg.sender] = _amount;
        stakedSnapshot[msg.sender] = staked;
        activeStakeDeposits = activeStakeDeposits.add(_amount);
        emit Deposited(msg.sender, _amount);
    }

    function withdraw(uint _amount) external nonReentrant {
        (uint deposited,) = withdraw();
        deposit(deposited.sub(_amount));
    }

    function withdraw() public returns (uint deposited, uint reward) {
        uint currentTotalReward;
        deposited = stake[msg.sender];
        (reward, currentTotalReward) = _getRewards(msg.sender);
        accumulatedReward += currentTotalReward;
        if (activeStakeDeposits != 0) {
            staked = staked.add(currentTotalReward.div(activeStakeDeposits));
        }
        activeStakeDeposits = activeStakeDeposits.sub(deposited);
        stake[msg.sender] = 0;
        SafeTransfer.sendERC20(address(stakingToken), msg.sender, deposited);
        SafeTransfer.sendERC20(address(rewardToken), msg.sender, reward);
        emit Withdrawn(msg.sender, deposited, reward);
    }

    function rewardOf(address _account) external view returns (uint reward) {
        (reward, ) = _getRewards(_account);
    }

    function _getRewards(address _account) private view returns (uint userReward, uint currentTotalReward) {
        uint stakedForCalculation;
        currentTotalReward = _calculatecurrentTotalReward();
        if (activeStakeDeposits != 0) {
            stakedForCalculation = staked.add(currentTotalReward.div(activeStakeDeposits));
        }
        userReward = stake[msg.sender].mul(stakedForCalculation.sub(stakedSnapshot[_account]));
    }

    function _calculatecurrentTotalReward() private view returns (uint reward) {
        if (startBlock.add(duration) > block.number) {
            reward = rewardSupply
                .mul(block.number)
                .mul(block.number.sub(startBlock))
                .div(startBlock.add(duration).mul(duration));
        } else {
            reward = rewardSupply;
        }
        reward -= accumulatedReward;
    }
}
