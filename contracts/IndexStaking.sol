// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.6.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../libraries/SafeTransfer.sol";

contract IndexStaking is ReentrancyGuard {
    using SafeMath for uint256;

    uint constant private MULTIPLICATOR = 10**20;

    uint public duration; // blocks
    uint public totalSupply;
    uint public rewardSupply;

    address public stakingToken;
    address public rewardToken;

    uint public staked; // S
    uint public activeStakeDeposits; // T
    mapping(address => uint) public stake; // stake
    mapping(address => uint) public stakedSnapshot; // S0
    mapping(address => uint) public userStartBlock;

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
        userStartBlock[msg.sender] = block.number;
        activeStakeDeposits = activeStakeDeposits.add(_amount);
        emit Deposited(msg.sender, _amount);
    }

    function withdraw() public {
        require(activeStakeDeposits != 0, "IndexStaking: NO_STAKERS");
        (uint userReward, uint totalReward) = rewardOf(msg.sender);
        console.logUint(totalReward);
        console.logUint(userReward);
        staked = _getActualStaked(totalReward);
        uint deposited = stake[msg.sender];
        activeStakeDeposits = activeStakeDeposits.sub(deposited);
        stake[msg.sender] = 0;
        SafeTransfer.sendERC20(address(stakingToken), msg.sender, deposited);
        SafeTransfer.sendERC20(address(rewardToken), msg.sender, userReward);
        emit Withdrawn(msg.sender, deposited, userReward);
    }

    function rewardOf(address _account) public view returns (uint reward, uint totalReward) {
        totalReward = _getTotalReward();
        uint actualStaked = _getActualStaked(totalReward);
        reward = stake[_account].mul(actualStaked.sub(stakedSnapshot[_account])).div(MULTIPLICATOR);
    }

    function withdraw(uint _amount) external nonReentrant {
        uint deposited = stake[msg.sender];
        withdraw();
        deposit(deposited.sub(_amount));
    }

    function _getActualStaked(uint _totalReward) private view returns (uint) {
        return staked.add(_totalReward.mul(MULTIPLICATOR).div(activeStakeDeposits));
    }

    function _getTotalReward() private view returns (uint) {
        uint currentCirculatingSupply = _calculateCirculatingSupply(block.number);
        uint initCirculatingSupply = _calculateCirculatingSupply(userStartBlock[msg.sender]);
        return (currentCirculatingSupply.sub(initCirculatingSupply));
    }

    function _calculateCirculatingSupply(uint _blockNumber) private view returns (uint circulatingSupply) {
        // 0.48 * totalSupply * N * (N - N1) / ((N1 + duration) * duration)

        // if (startBlock.add(duration) > _blockNumber) {
        if (startBlock.add(duration) > block.number) {
            circulatingSupply = rewardSupply
                .mul(_blockNumber)
                .mul(_blockNumber.sub(startBlock))
                .div((startBlock.add(duration)).mul(duration));
        } else {
            circulatingSupply = rewardSupply;
        }
    }
}
