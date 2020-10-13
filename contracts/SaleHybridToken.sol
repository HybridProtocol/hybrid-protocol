// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../libraries/PresaleConstants.sol";
import "../utils/Maintenance.sol";


contract SaleHybridToken is ERC20, Ownable, Maintenance {

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
            require(_amount <= PresaleConstants.ALPHA_PRESALE_LIMIT, "SaleHybridToken: ALPHA_PRESALE_LIMIT");
        } else if (_contract == betaPresale) {
            require(_amount <= PresaleConstants.BETA_PRESALE_LIMIT, "SaleHybridToken: BETA_PRESALE_LIMIT");
        } else if (_contract == gammaPresale) {
            require(_amount <= PresaleConstants.GAMMA_PRESALE_LIMIT, "SaleHybridToken: GAMMA_PRESALE_LIMIT");
        }
        _;
    }

    constructor() ERC20(NAME, SYMBOL) public {}

    function mintPresale(
        address _alphaPresale,
        address _betaPresale,
        address _gammaPresale
    ) external onlyOwner {
        alphaPresale = _alphaPresale;
        betaPresale = _betaPresale;
        gammaPresale = _gammaPresale;

        _mint(_alphaPresale, PresaleConstants.ALPHA_PRESALE_LIMIT);
        _mint(_betaPresale, PresaleConstants.BETA_PRESALE_LIMIT);
        _mint(_gammaPresale, PresaleConstants.GAMMA_PRESALE_LIMIT);
    }

    function burnFor(
        address _presale,
        uint _amount
    ) external onlyMaintainers onlyFor(_presale) onlyAvailableAmount(_presale, _amount) {
        require(!isBurnedFor[_presale], "SaleHybridToken: ONLY_ONCE_BURN");
        _burn(msg.sender, _amount);
        isBurnedFor[_presale] = true;
    }
}