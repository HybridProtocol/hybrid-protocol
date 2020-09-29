// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

library PresaleConstants {
    // State variables (must be constant in a library)

    // Hybrid "ONE" - all math is in the "realm" of 10 ** 18;
    // where numeric 1 = 10 ** 18
    uint public constant HONE = 10**18;
    uint public constant ALPHA_PRESALE_LIMIT = 3000000 * HONE; // 3 000 000 sHBT
    uint public constant BETA_PRESALE_LIMIT = 5000000 * HONE;  // 5 000 000 sHBT
    uint public constant GAMMA_PRESALE_LIMIT = 4000000 * HONE; // 4 000 000 sHBT
    uint public constant ALPHA_PRESALE_RATE = 15 * HONE / 100; // 0.15 USD
    uint public constant BETA_PRESALE_RATE = 20 * HONE / 100;  // 0.2 USD
    uint public constant GAMMA_PRESALE_RATE = 25 * HONE / 100; // 0.25 USD
    uint public constant ALPHA_PURCHASE_LIMIT = 100000 * HONE; // 100 000 sHBT
    uint public constant BETA_PURCHASE_LIMIT = 20000 * HONE;   // 20 000 sHBT
    uint public constant GAMMA_PURCHASE_LIMIT = 4000 * HONE;   // 40 000 sHBT

}
