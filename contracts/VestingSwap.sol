// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ISaleHybridToken.sol";
import "../interfaces/IPresale.sol";
import "../libraries/SafeTransfer.sol";
import "../libraries/PresaleConstants.sol";


contract VestingSwap is Ownable {
    using SafeMath for uint256;

    bytes32 public alphaPresale = keccak256("alphaPresale");
    bytes32 public betaPresale = keccak256("betaPresale");
    bytes32 public gammaPresale = keccak256("gammaPresale");

    uint32 private constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint32 private constant SECONDS_PER_MONTH = SECONDS_PER_DAY * 30;

    address private HBT;

    struct swapInfo {
        address addr;
        uint limit;
        uint[] vesting;
        uint start;
        uint swaped;
    }

    mapping(bytes32 => swapInfo) public swap;
    mapping(address => uint) public swapedAmountOf;

    event Swap(address account, uint amount);

    modifier isStarted(bytes32 _presale) {
        require(swap[_presale].start > 0);
        _;
    }

    constructor(address _alphaPresale, address _betaPresale, address _gammaPresale, address _HBT) public {
        HBT = _HBT;

        swap[alphaPresale].addr = _alphaPresale;
        swap[betaPresale].addr = _betaPresale;
        swap[gammaPresale].addr = _gammaPresale;

        swap[alphaPresale].limit = IPresale(swap[alphaPresale].addr).totalSold();
        swap[betaPresale].limit = IPresale(swap[betaPresale].addr).totalSold();
        swap[gammaPresale].limit = IPresale(swap[gammaPresale].addr).totalSold();

        _initVestingData();
    }

    function startAlphaSwap() external onlyOwner {
        swap[alphaPresale].start = now;
    }

    function startBetaSwap() external onlyOwner {
        swap[betaPresale].start = now;
    }

    function startGammaSwap() external onlyOwner {
        swap[gammaPresale].start = now;
    }

    function alphaSwap(uint _amount) external isStarted(alphaPresale) {
        _swap(alphaPresale, _amount);
    }

    function betaSwap(uint _amount) external isStarted(betaPresale) {
        _swap(betaPresale, _amount);
    }

    function gammaSwap(uint _amount) external isStarted(gammaPresale) {
        _swap(gammaPresale, _amount);
    }

    function availableAmountFor(bytes32 _presale) public view returns (uint) {
        uint256 currentMonth = now.sub(swap[_presale].start).div(SECONDS_PER_MONTH);
        uint256 totalUnlockedAmount;
        for(uint8 i = 0; i <= currentMonth; i++ ) {
            totalUnlockedAmount = totalUnlockedAmount.add(swap[_presale].vesting[i]);
        }
        return totalUnlockedAmount.sub(swap[_presale].swaped);
    }

    function _swap(bytes32 _presale, uint _amount) private {
        uint purchased = IPresale(swap[_presale].addr).purchasedAmount(msg.sender);
        require(_amount <= purchased.sub(swapedAmountOf[msg.sender]), "VestingSwap: USER_LIMIT");
        require(_amount <= swap[_presale].limit.sub(swap[_presale].swaped), "VestingSwap: VESTING_LIMIT");
        ISaleHybridToken(swap[_presale].addr).burnFor(msg.sender, _amount);
        require(SafeTransfer.sendERC20(address(HBT), msg.sender, _amount), "VestingSwap: SEND_ERC20");
        swapedAmountOf[msg.sender] = swapedAmountOf[msg.sender].add(_amount);
        emit Swap(msg.sender, _amount);
    }

    function _initVestingData() private {
        uint8[7] memory alphaPercentages = [10, 30, 30, 30, 0, 0, 0];
        uint8[7] memory betaPercentages  = [10, 15, 15, 15, 15, 15, 15];
        uint8[7] memory gammaPercentages = [10, 15, 15, 15, 15, 15, 15];

        _expandToAmounts(alphaPresale, alphaPercentages);
        _expandToAmounts(betaPresale, betaPercentages);
        _expandToAmounts(gammaPresale, gammaPercentages);
    }

    function _expandToAmounts(bytes32 _presale, uint8[7] memory _percentages) internal returns (uint256[] memory) {
        for(uint i = 0; i < _percentages.length; i++) {
            if (_percentages[i] != 0) {
                uint sold = IPresale(swap[_presale].addr).totalSold();
                swap[_presale].vesting[i] = sold.mul(_percentages[i]).div(100);
            }
        }
    }
}

