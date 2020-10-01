// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../../libraries/PresaleConstants.sol";
import "../../interfaces/ISaleHybridToken.sol";


contract Presale is Ownable {
    using SafeMath for uint256;

    IERC20 USDC;
    ISaleHybridToken SHBT;

    uint internal constant duration = 6500 * 5; // blocks

    uint internal rate;
    uint internal startBlock;
    uint internal totalLimit;
    uint internal purchasedLimit;

    mapping(address => uint) private purchasedAmountOf;

    event Sold(address account, uint amount);

    constructor(address _USDC, address _SHBT) public {
        USDC = IERC20(_USDC);
        SHBT = ISaleHybridToken(_SHBT);
    }

    function start() external onlyOwner {
        startBlock = block.number;
    }

    function burn() external onlyOwner {
        require(block.number > startBlock + duration, "Presale: INVALID_DATE");
        uint unreleasedAmount = totalLimit.sub(SHBT.balanceOf(address(this)));
        SHBT.burnFor(address(this), unreleasedAmount);
    }

    function sendUSDC(address _to, uint _amount) external onlyOwner {
        USDC.transfer(_to, _amount);
    }

    function buy(uint _amountUSDC) external {
        require(block.number <= startBlock + duration, "Presale: INVALID_DATE");
        require(_amountUSDC > 0, "Presale: ZERO_AMOUNT_USDC");
        uint availableAmountSHBT = purchasedLimit.sub(purchasedAmountOf[msg.sender]);
        uint amountSHBT = _amountUSDC.mul(PresaleConstants.ONE_HBT_IN_WEI).div(rate);
        if (amountSHBT > availableAmountSHBT) {
            _amountUSDC = amountSHBT.sub(availableAmountSHBT).mul(rate);
            amountSHBT = availableAmountSHBT;
        }
        require(_transferFromERC20(SHBT, msg.sender, address(this), _amountUSDC), "Presale: TRANSFER_FROM");
        require(_sendERC20(SHBT, msg.sender, amountSHBT), "Presale: SEND_ERC20");
        purchasedAmountOf[msg.sender] = purchasedAmountOf[msg.sender].add(amountSHBT);
        emit Sold(msg.sender, amountSHBT);
    }

    function _sendERC20(IERC20 _token, address _to, uint256 _amount) internal returns (bool) {
        (bool callSuccess, bytes memory callReturnValueEncoded) = address(_token).call(
            abi.encodeWithSignature("transfer(address,uint256)", _to, _amount)
        );
        // `transfer` method may return (bool) or nothing.
        bool returnedSuccess = callReturnValueEncoded.length == 0 || abi.decode(callReturnValueEncoded, (bool));
        return callSuccess && returnedSuccess;
    }

    function _transferFromERC20(IERC20 _token, address _from, address _to, uint256 _amount) internal returns (bool) {
        (bool callSuccess, bytes memory callReturnValueEncoded) = address(_token).call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", _from, _to, _amount)
        );
        // `transferFrom` method may return (bool) or nothing.
        bool returnedSuccess = callReturnValueEncoded.length == 0 || abi.decode(callReturnValueEncoded, (bool));
        return callSuccess && returnedSuccess;
    }
}