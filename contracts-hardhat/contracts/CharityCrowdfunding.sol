// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CharityToken.sol";

contract CharityCrowdfunding {
    struct Campaign {
        address creator;
        string title;
        uint256 goalWei;
        uint256 deadline;
        uint256 totalRaisedWei;
        bool finalized;
        bool goalReached;
    }

    CharityToken public rewardToken;
    uint256 public campaignCount;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    event CampaignCreated(
        uint256 indexed id,
        address indexed creator,
        string title,
        uint256 goalWei,
        uint256 deadline
    );

    event Contributed(
        uint256 indexed id,
        address indexed contributor,
        uint256 amountWei,
        uint256 tokensMinted
    );

    event Finalized(
        uint256 indexed id,
        bool goalReached,
        uint256 totalRaisedWei
    );

    event Refunded(
        uint256 indexed id,
        address indexed contributor,
        uint256 amountWei
    );

    constructor(address tokenAddress) {
        rewardToken = CharityToken(tokenAddress);
    }

    modifier campaignExists(uint256 id) {
        require(id < campaignCount, "Campaign does not exist");
        _;
    }

    function createCampaign(
        string calldata title,
        uint256 goalWei,
        uint256 durationSeconds
    ) external {
        require(goalWei > 0, "Goal must be > 0");
        require(durationSeconds > 0, "Duration must be > 0");

        uint256 deadline = block.timestamp + durationSeconds;

        campaigns[campaignCount] = Campaign({
            creator: msg.sender,
            title: title,
            goalWei: goalWei,
            deadline: deadline,
            totalRaisedWei: 0,
            finalized: false,
            goalReached: false
        });

        emit CampaignCreated(
            campaignCount,
            msg.sender,
            title,
            goalWei,
            deadline
        );

        campaignCount++;
    }

    function contribute(uint256 id)
        external
        payable
        campaignExists(id)
    {
        Campaign storage c = campaigns[id];

        require(block.timestamp < c.deadline, "Campaign ended");
        require(msg.value > 0, "Amount must be > 0");

        c.totalRaisedWei += msg.value;
        contributions[id][msg.sender] += msg.value;

        // 1 ETH → 100 CHAR
        uint256 tokensToMint = msg.value * 100;
        rewardToken.mint(msg.sender, tokensToMint);

        emit Contributed(id, msg.sender, msg.value, tokensToMint);
    }

    function finalizeCampaign(uint256 id)
        external
        campaignExists(id)
    {
        Campaign storage c = campaigns[id];

        require(block.timestamp >= c.deadline, "Not ended yet");
        require(!c.finalized, "Already finalized");

        c.finalized = true;

        if (c.totalRaisedWei >= c.goalWei) {
            c.goalReached = true;
            (bool ok, ) = c.creator.call{value: c.totalRaisedWei}("");
            require(ok, "Transfer failed");
        } else {
            c.goalReached = false;
        }

        emit Finalized(id, c.goalReached, c.totalRaisedWei);
    }

    function refund(uint256 id)
        external
        campaignExists(id)
    {
        Campaign storage c = campaigns[id];

        require(c.finalized, "Not finalized");
        require(!c.goalReached, "Goal reached");

        uint256 amount = contributions[id][msg.sender];
        require(amount > 0, "Nothing to refund");

        contributions[id][msg.sender] = 0;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Refund failed");

        emit Refunded(id, msg.sender, amount);
    }
}
