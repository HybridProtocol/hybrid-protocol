// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../libraries/PresaleConstants.sol";
import "../utils/Whitelist.sol";


contract SaleHybridToken is ERC20, Ownable, Whitelist {

    string internal constant NAME = "Sale Hybrid Token";
    string internal constant SYMBOL = "sHBT";

    address private alphaTokensale;
    address private betaTokensale;
    address private gammaTokensale;

    mapping(address => bool) isBurnedFor;


    modifier onlyFor(address _contract) {
        require(_contract == alphaTokensale ||
                _contract == betaTokensale  ||
                _contract == gammaTokensale
        );
        _;
    }

    modifier onlyAvailableAmount(address _contract, uint _amount) {
        if (_contract == alphaTokensale) {
            require(_amount <= PresaleConstants.ALPHA_PRESALE_LIMIT);
        } else if (_contract == betaTokensale) {
            require(_amount <= PresaleConstants.BETA_PRESALE_LIMIT);
        } else if (_contract == gammaTokensale) {
            require(_amount <= PresaleConstants.GAMMA_PRESALE_LIMIT);
        }
        _;
    }

    constructor() ERC20(NAME, SYMBOL) public {}

    function mintPresale(
        address _alphaTokensale,
        address _betaTokensale,
        address _gammaTokensale
    ) external onlyOwner {
        alphaTokensale = _alphaTokensale;
        betaTokensale = _betaTokensale;
        gammaTokensale = _gammaTokensale;

        _mint(_alphaTokensale, PresaleConstants.ALPHA_PRESALE_LIMIT);
        _mint(_betaTokensale, PresaleConstants.BETA_PRESALE_LIMIT);
        _mint(_gammaTokensale, PresaleConstants.GAMMA_PRESALE_LIMIT);
    }

    function burnFor(
        address _presale,
        uint _amount
    ) external onlyWhitelisted onlyFor(_presale) onlyAvailableAmount(_presale, _amount) {
        require(!isBurnedFor[_presale], "SaleHybridToken: ONLY_ONCE_BURN");
        _burn(msg.sender, _amount);
        isBurnedFor[_presale] = true;
    }
}