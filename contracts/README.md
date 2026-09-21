# Local Solidity toolkit

This directory validates the compiler and ERC-721 dependency in Forge's local EVM. It contains **one test fixture, not a production Mythseal contract**. The fixture mints a synthetic token locally and verifies that a transfer keeps the same token ID while changing its owner and balances.

Verified toolchain:

- Foundry `forge`, `cast`, and `anvil`: **1.7.1**.
- Solidity: **0.8.30**, pinned in `foundry.toml`.
- EVM target: **Cancun**.
- OpenZeppelin Contracts: **5.6.1**, pinned by the root `package.json` and `package-lock.json` and resolved through an explicit npm remapping.

From the repository root:

```sh
npm ci
forge test --root contracts
```

The first test run may download the pinned Solidity compiler. No running Anvil node, RPC URL, account, wallet, private key, or testnet funds are required. There are no deployment scripts, network transactions, game issuance rules, or NFT metadata in this scaffold. Generated compiler output, cache, and broadcast files are ignored by Git.

The future game contract remains specified in [the NFT design](../docs/NFT-STACK.md); passing this fixture verifies tool compatibility only.
