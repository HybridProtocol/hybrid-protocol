// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./presale/AlphaPresale.sol";
import "./presale/BetaPresale.sol";
import "./presale/GammaPresale.sol";
import "./presale/PresaleConstants.sol";
import "../utils/Maintenance.sol";


contract SaleHybridToken is ERC20, Ownable, Maintenance, PresaleConstants, ReentrancyGuard {

    string internal constant NAME = "Sale Hybrid Token";
    string internal constant SYMBOL = "sHBT";

    address private alphaPresale;
    address private betaPresale;
    address private gammaPresale;

    mapping(address => bool) isBurnedFor;


    modifier onlyFor(address _contract) {
        require(_contract == alphaPresale ||
                _contract == betaPresale  ||
                _contract == gammaPresale,
                "SaleHybridToken: ONLY_PRESALE_CONTRACTS"
        );
        _;
    }

    modifier onlyAvailableAmount(address _contract, uint _amount) {
        if (_contract == alphaPresale) {
            require(_amount <= ALPHA_PRESALE_LIMIT, "SaleHybridToken: ALPHA_PRESALE_LIMIT");
        } else if (_contract == betaPresale) {
            require(_amount <= BETA_PRESALE_LIMIT, "SaleHybridToken: BETA_PRESALE_LIMIT");
        } else if (_contract == gammaPresale) {
            require(_amount <= GAMMA_PRESALE_LIMIT, "SaleHybridToken: GAMMA_PRESALE_LIMIT");
        }
        _;
    }

    constructor() ERC20(NAME, SYMBOL) public {}

    function mintPresale(
        address _alphaPresale,
        address _betaPresale,
        address _gammaPresale
    ) external onlyOwner nonReentrant {
        alphaPresale = _alphaPresale;
        betaPresale = _betaPresale;
        gammaPresale = _gammaPresale;

        _mint(_alphaPresale, ALPHA_PRESALE_LIMIT);
        _mint(_betaPresale, BETA_PRESALE_LIMIT);
        _mint(_gammaPresale, GAMMA_PRESALE_LIMIT);
    }

    function burnFor(
        address _presale,
        uint _amount
    ) external onlyMaintainers nonReentrant onlyFor(_presale) onlyAvailableAmount(_presale, _amount) {
        require(!isBurnedFor[_presale], "SaleHybridToken: ONLY_ONCE_BURN");
        _burn(_presale, _amount);
        isBurnedFor[_presale] = true;
    }

    function activePresaleAddress() external view returns (address) {
        AlphaPresale alphaPresaleContract = AlphaPresale(alphaPresale);
        if (alphaPresaleContract.presaleIsActive()) { return address(alphaPresale); }

        BetaPresale betaPresaleContract = BetaPresale(betaPresale);
        if (betaPresaleContract.presaleIsActive()) { return address(betaPresale); }

        GammaPresale gammaPresaleContract = GammaPresale(gammaPresale);
        if (gammaPresaleContract.presaleIsActive()) { return address(gammaPresale); }

        return address(0);
    }
}
