// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @dev Local compiler/library fixture only. This is not a Mythseal card contract.
contract ToolkitERC721Fixture is ERC721 {
    constructor(address initialHolder, uint256 tokenId) ERC721("Local toolkit fixture", "LOCAL") {
        _mint(initialHolder, tokenId);
    }
}

/// @dev Forge runs this entirely inside its local EVM; no RPC or signing key is used.
contract ToolkitTest {
    function testLocalMintAndTransferPreserveTokenIdentity() public {
        uint256 tokenId = 77;
        address recipient = address(0xBEEF);
        ToolkitERC721Fixture token = new ToolkitERC721Fixture(address(this), tokenId);

        require(token.supportsInterface(0x80ac58cd), "ERC721 interface missing");
        require(token.ownerOf(tokenId) == address(this), "initial owner differs");
        require(token.balanceOf(address(this)) == 1, "initial balance differs");

        token.transferFrom(address(this), recipient, tokenId);

        require(token.ownerOf(tokenId) == recipient, "same token did not transfer");
        require(token.balanceOf(address(this)) == 0, "sender balance differs");
        require(token.balanceOf(recipient) == 1, "recipient balance differs");
    }
}
