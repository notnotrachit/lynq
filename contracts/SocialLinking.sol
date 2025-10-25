// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SocialLinking
 * @dev Social media linking and token transfer contract for PYUSD on Base
 */
contract SocialLinking is Ownable, ReentrancyGuard {
    IERC20 public immutable pyusdToken;

    struct SocialLink {
        address owner;
        string twitter;
        string instagram;
        string linkedin;
    }

    struct PendingClaim {
        string socialHandle;
        uint256 amount;
        bool claimed;
        uint256 paymentCount;
    }

    struct PaymentRecord {
        address sender;
        string socialHandle;
        uint256 amount;
        uint256 timestamp;
        bool claimed;
    }

    // Mappings
    mapping(address => SocialLink) public socialLinks;
    mapping(string => PendingClaim) public pendingClaims;
    mapping(bytes32 => PaymentRecord) public paymentRecords;
    
    // Events
    event TwitterLinked(address indexed user, string handle);
    event InstagramLinked(address indexed user, string handle);
    event LinkedInLinked(address indexed user, string handle);
    event TokenSent(address indexed from, address indexed to, uint256 amount);
    event TokenSentToUnlinked(address indexed from, string socialHandle, uint256 amount, uint256 paymentIndex);
    event TokenClaimed(address indexed claimer, string socialHandle, uint256 amount);

    constructor(address _pyusdToken) Ownable(msg.sender) {
        require(_pyusdToken != address(0), "Invalid PYUSD token address");
        pyusdToken = IERC20(_pyusdToken);
    }

    /**
     * @dev Link Twitter account to wallet
     */
    function linkTwitter(address user, string calldata twitterHandle) external onlyOwner {
        require(bytes(twitterHandle).length > 0 && bytes(twitterHandle).length <= 30, "Invalid handle length");
        
        if (socialLinks[user].owner == address(0)) {
            socialLinks[user].owner = user;
        }
        socialLinks[user].twitter = twitterHandle;
        
        emit TwitterLinked(user, twitterHandle);
    }

    /**
     * @dev Link Instagram account to wallet
     */
    function linkInstagram(address user, string calldata instagramHandle) external onlyOwner {
        require(bytes(instagramHandle).length > 0 && bytes(instagramHandle).length <= 30, "Invalid handle length");
        
        if (socialLinks[user].owner == address(0)) {
            socialLinks[user].owner = user;
        }
        socialLinks[user].instagram = instagramHandle;
        
        emit InstagramLinked(user, instagramHandle);
    }

    /**
     * @dev Link LinkedIn account to wallet
     */
    function linkLinkedIn(address user, string calldata linkedinHandle) external onlyOwner {
        require(bytes(linkedinHandle).length > 0 && bytes(linkedinHandle).length <= 30, "Invalid handle length");
        
        if (socialLinks[user].owner == address(0)) {
            socialLinks[user].owner = user;
        }
        socialLinks[user].linkedin = linkedinHandle;
        
        emit LinkedInLinked(user, linkedinHandle);
    }

    /**
     * @dev Send PYUSD tokens directly to a linked wallet
     */
    function sendToken(address recipient, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");
        
        bool success = pyusdToken.transferFrom(msg.sender, recipient, amount);
        require(success, "Token transfer failed");
        
        emit TokenSent(msg.sender, recipient, amount);
    }

    /**
     * @dev Send PYUSD tokens to an unlinked social handle (held in escrow)
     */
    function sendTokenToUnlinked(
        string calldata socialHandle,
        uint256 amount,
        uint256 paymentIndex
    ) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(bytes(socialHandle).length > 0 && bytes(socialHandle).length <= 30, "Invalid handle length");
        
        // Transfer tokens to this contract (escrow)
        bool success = pyusdToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");
        
        // Update or create pending claim
        PendingClaim storage claim = pendingClaims[socialHandle];
        
        if (claim.claimed || claim.amount == 0) {
            // Initialize new claim
            claim.socialHandle = socialHandle;
            claim.amount = amount;
            claim.claimed = false;
            claim.paymentCount = 1;
        } else {
            // Accumulate to existing claim
            claim.amount += amount;
            claim.paymentCount += 1;
        }
        
        // Create payment record
        bytes32 recordKey = keccak256(abi.encodePacked(socialHandle, paymentIndex));
        paymentRecords[recordKey] = PaymentRecord({
            sender: msg.sender,
            socialHandle: socialHandle,
            amount: amount,
            timestamp: block.timestamp,
            claimed: false
        });
        
        emit TokenSentToUnlinked(msg.sender, socialHandle, amount, paymentIndex);
    }

    /**
     * @dev Claim tokens sent to a social handle
     */
    function claimToken(string calldata socialHandle) external nonReentrant {
        PendingClaim storage claim = pendingClaims[socialHandle];
        
        require(!claim.claimed, "Already claimed");
        require(claim.amount > 0, "No pending claim");
        
        // Verify caller has linked this social handle
        SocialLink storage link = socialLinks[msg.sender];
        require(
            keccak256(bytes(link.twitter)) == keccak256(bytes(socialHandle)) ||
            keccak256(bytes(link.instagram)) == keccak256(bytes(socialHandle)) ||
            keccak256(bytes(link.linkedin)) == keccak256(bytes(socialHandle)),
            "Social handle not linked to your wallet"
        );
        
        uint256 amount = claim.amount;
        claim.claimed = true;
        
        // Transfer tokens from contract to claimer
        bool success = pyusdToken.transfer(msg.sender, amount);
        require(success, "Token transfer failed");
        
        emit TokenClaimed(msg.sender, socialHandle, amount);
    }

    /**
     * @dev Get social link for a user
     */
    function getSocialLink(address user) external view returns (SocialLink memory) {
        return socialLinks[user];
    }

    /**
     * @dev Get pending claim for a social handle
     */
    function getPendingClaim(string calldata socialHandle) external view returns (PendingClaim memory) {
        return pendingClaims[socialHandle];
    }

    /**
     * @dev Get payment record
     */
    function getPaymentRecord(string calldata socialHandle, uint256 paymentIndex) external view returns (PaymentRecord memory) {
        bytes32 recordKey = keccak256(abi.encodePacked(socialHandle, paymentIndex));
        return paymentRecords[recordKey];
    }

    /**
     * @dev Emergency withdraw function (only owner)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        bool success = pyusdToken.transfer(owner(), amount);
        require(success, "Token transfer failed");
    }
}
