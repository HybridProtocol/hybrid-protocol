// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

import "../../libraries/PresaleConstants.sol";
import "./Presale.sol";


contract AlphaPresale is Presale {

    constructor(address _USDC, address _sHBT) public Presale(_USDC, _sHBT) {
        rate = PresaleConstants.ALPHA_PRESALE_RATE;              // 0.15 USDC
        purchasedLimit = PresaleConstants.ALPHA_PURCHASE_LIMIT;  // 100 000 sHBT
        totalLimit = PresaleConstants.ALPHA_PRESALE_LIMIT;       // 3 000 000 sHBT
    }
}