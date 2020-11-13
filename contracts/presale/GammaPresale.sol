// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

import "./Presale.sol";


contract GammaPresale is Presale {

    constructor(address _USDC, address _sHBT, uint _duration) public Presale(_USDC, _sHBT, _duration) {
        rate = GAMMA_PRESALE_RATE;              // 0.25 USDC
        purchasedLimit = GAMMA_PURCHASE_LIMIT;  // 40 000 sHBT
        totalLimit = GAMMA_PRESALE_LIMIT;       // 4 000 000 sHBT
    }
}
