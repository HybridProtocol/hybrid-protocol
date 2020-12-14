// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.6.6;

import "../../interfaces/ISaleHybridToken.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PresaleConstants.sol";
import "../../libraries/SafeTransfer.sol";


contract Presale is Ownable, PresaleConstants, ReentrancyGuard {
    using SafeMath for uint256;

    IERC20 USDC;
    ISaleHybridToken SHBT;

    uint internal duration; // blocks

    uint internal rate;
    uint internal startBlock;
    uint internal totalLimit;
    uint internal purchasedLimit;

    uint public totalSold;

    mapping(address => uint) private purchasedAmountOf;

    event Sold(address account, uint amount);

    constructor(address _USDC, address _SHBT, uint _duration) public {
        USDC = IERC20(_USDC);
        SHBT = ISaleHybridToken(_SHBT);
        duration = _duration;
    }

    function start() external nonReentrant onlyOwner {
        require(startBlock == 0, "Presale: ALREADY_STARTED");
        startBlock = block.number;
    }

    function burnRest() external nonReentrant onlyOwner {
        require(block.number > startBlock + duration, "Presale: INVALID_DATE");
        uint unreleasedAmount = SHBT.balanceOf(address(this));
        SHBT.burnForPresale(address(this), unreleasedAmount);
    }

    function sendUSDC(address _to, uint _amount) nonReentrant external onlyOwner {
        USDC.transfer(_to, _amount);
    }

    function buy(uint _amountUSDC) external nonReentrant {
        require(block.number <= startBlock + duration, "Presale: INVALID_DATE");
        uint availableAmountSHBT = purchasedLimit.sub(purchasedAmountOf[msg.sender]);
        uint amountSHBT = _amountUSDC.mul(ONE_HBT_IN_WEI).div(rate);
        if (amountSHBT > availableAmountSHBT) {
            amountSHBT = availableAmountSHBT;
            _amountUSDC = amountSHBT.mul(rate).div(ONE_HBT_IN_WEI);
        }
        require(_amountUSDC > 0, "Presale: ZERO_AMOUNT_USDC");
        require(amountSHBT > 0, "Presale: ZERO_AMOUNT_SHBT");
        SafeTransfer.transferFromERC20(address(USDC), msg.sender, address(this), _amountUSDC);
        SafeTransfer.sendERC20(address(SHBT), msg.sender, amountSHBT);
        purchasedAmountOf[msg.sender] = purchasedAmountOf[msg.sender].add(amountSHBT);
        totalSold = totalSold.add(amountSHBT);
        emit Sold(msg.sender, amountSHBT);
    }

    function purchasedAmount(address _account) external view returns (uint) {
        return purchasedAmountOf[_account];
    }

    function presaleIsActive() external view returns (bool) {
        return startBlock != 0 && block.number >= startBlock && block.number <= startBlock + duration;
    }
}
