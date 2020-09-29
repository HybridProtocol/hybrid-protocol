// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../../libraries/PresaleConstants.sol";
import "../../interfaces/IServiceHybridToken.sol";


contract Presale is Ownable {
    using SafeMath for uint256;

    IERC20 USDC;
    IServiceHybridToken SHBT;

    uint internal constant duration = 6500 * 5; // blocks

    uint internal rate;
    uint internal startBlock;
    uint internal totalLimit;
    uint internal purchasedLimit;

    mapping(address => uint) private purchasedAmountOf;

    event Sold(address account, uint amount);

    constructor(address _USDC, address _SHBT) public {
        USDC = IERC20(_USDC);
        SHBT = IServiceHybridToken(_SHBT);
    }

    function start() external onlyOwner {
        startBlock = block.number;
    }

    function burn() external onlyOwner {
        require(block.number > startBlock + duration, "Prensale: INVALID_DATE");
        uint unreleasedAmount = totalLimit.sub(SHBT.balanceOf(address(this)));
        SHBT.burnFor(address(this), unreleasedAmount);
    }

    function sendUSDC(address _to, uint _amount) external onlyOwner {
        USDC.transfer(_to, _amount);
    }

    function _buy(uint _amountUSDC) internal {
        require(block.number <= startBlock + duration, "Prensale: INVALID_DATE");
        require(_amountUSDC > 0, "Prensale: ZERO_AMOUNT_USDC");
        // TODO: Add return change for over limit instead of revert 
        assert(_amountUSDC <= purchasedLimit.sub(purchasedAmountOf[msg.sender]));
        uint amountSHBT = _amountUSDC.div(rate).mul(PresaleConstants.HONE);
        USDC.approve(address(this), _amountUSDC);
        // TODO: This check probably could be removed for optimization
        uint allowance = USDC.allowance(msg.sender, address(this));
        require(allowance >= _amountUSDC, "Prensale: ALLOWANCE");
        USDC.transferFrom(msg.sender, address(this), _amountUSDC);
        SHBT.transfer(msg.sender, amountSHBT);
        purchasedAmountOf[msg.sender] = purchasedAmountOf[msg.sender].add(amountSHBT);
        emit Sold(msg.sender, amountSHBT);
    }
}