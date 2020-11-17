// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.6.6;

import "./Presale.sol";


contract AlphaPresale is Presale {

    constructor(address _USDC, address _sHBT, uint _duration) public Presale(_USDC, _sHBT, _duration) {
        rate = ALPHA_PRESALE_RATE;              // 0.15 USDC
        purchasedLimit = ALPHA_PURCHASE_LIMIT;  // 100 000 sHBT
        totalLimit = ALPHA_PRESALE_LIMIT;       // 3 000 000 sHBT
    }
}
