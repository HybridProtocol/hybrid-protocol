// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

import "./Presale.sol";


contract BetaPresale is Presale {

    constructor(address _USDC, address _sHBT, uint _duration) public Presale(_USDC, _sHBT, _duration) {
        rate = BETA_PRESALE_RATE;              // 0.2 USDC
        purchasedLimit = BETA_PURCHASE_LIMIT;  // 20 000 sHBT
        totalLimit = BETA_PRESALE_LIMIT;       // 5 000 000 sHBT
    }
}
