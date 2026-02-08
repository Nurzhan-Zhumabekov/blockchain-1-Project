const CROWDFUNDING_ADDRESS = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
const TOKEN_ADDRESS = "0x0165878A594ca255338adfa4d48449f69242Eb8F";

const crowdfundingABI = [
    {
        "inputs": [
            { "name": "title", "type": "string" },
            { "name": "goalWei", "type": "uint256" },
            { "name": "durationSeconds", "type": "uint256" }
        ],
        "name": "createCampaign",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "id", "type": "uint256" }],
        "name": "contribute",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "id", "type": "uint256" }],
        "name": "finalizeCampaign",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "id", "type": "uint256" }],
        "name": "refund",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "", "type": "uint256" }],
        "name": "campaigns",
        "outputs": [
            { "name": "creator", "type": "address" },
            { "name": "title", "type": "string" },
            { "name": "goalWei", "type": "uint256" },
            { "name": "deadline", "type": "uint256" },
            { "name": "totalRaisedWei", "type": "uint256" },
            { "name": "finalized", "type": "bool" },
            { "name": "goalReached", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "campaignCount",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "name": "", "type": "uint256" },
            { "name": "", "type": "address" }
        ],
        "name": "contributions",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
];

const tokenABI = [
    "function balanceOf(address account) view returns (uint256)"
];

let provider, signer, userAddress, crowdfundingContract, tokenContract;
async function connectWallet() {
    if (!window.ethereum) { alert("MetaMask not installed!"); return; }
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7A69' }]
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0x7A69',
                    chainName: 'GoChain Testnet',
                    rpcUrls: ['http://127.0.0.1:8545'],
                    nativeCurrency: { name: 'GO', symbol: 'GO', decimals: 18 }
                }]
            });
        }
    }
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    userAddress = accounts[0];
    signer = await provider.getSigner();

    crowdfundingContract = new ethers.Contract(CROWDFUNDING_ADDRESS, crowdfundingABI, signer);
    tokenContract = new ethers.Contract(TOKEN_ADDRESS, tokenABI, provider);

    document.getElementById("walletAddress").textContent = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);

    const network = await provider.getNetwork();
    document.getElementById("network").textContent = "GoChain Testnet";

    const balance = await provider.getBalance(userAddress);
    document.getElementById("ethBalance").textContent = parseFloat(ethers.formatEther(balance)).toFixed(4) + " GO";

    const count = await crowdfundingContract.campaignCount();
    let totalContributed = 0n;
    for (let i = 0; i < Number(count); i++) {
        const amount = await crowdfundingContract.contributions(i, userAddress);
        totalContributed += amount;
    }
    document.getElementById("tokenBalance").textContent = parseFloat(ethers.formatEther(totalContributed)).toFixed(2) + " GO";

    showStatus("Wallet connected!");
}
async function createCampaign() {
    const title = document.getElementById("campaignTitle").value;
    const goal = document.getElementById("campaignGoal").value;
    const duration = document.getElementById("campaignDuration").value;

    if (!title || !goal || !duration) { alert("Fill all fields"); return; }

    showStatus("Creating campaign...");
    const tx = await crowdfundingContract.createCampaign(title, ethers.parseEther(goal), parseInt(duration) * 86400);
    await tx.wait();

    document.getElementById("campaignTitle").value = "";
    document.getElementById("campaignGoal").value = "";
    document.getElementById("campaignDuration").value = "";

    showStatus("Campaign created!");
    loadCampaign();
}
async function loadCampaign() {
    const count = await crowdfundingContract.campaignCount();
    const listDiv = document.getElementById("campaigList");

    listDiv.innerHTML = "";
    const title = document.createElement("h3");
    title.textContent = "CAMPAIGN LIST:";
    listDiv.appendChild(title);

    if (count === 0n) {
        const p = document.createElement("p");
        p.textContent = "No campaigns";
        listDiv.appendChild(p);
    } else {
        for (let i = 0; i < count; i++) {
            const c = await crowdfundingContract.campaigns(i);
            const card = document.createElement("div");
            card.className = "campaign-card";

            const status = c.finalized ? (c.goalReached ? "Reached" : "Failed") : "Active";
            const statusClass = "status-" + status.toLowerCase();

            card.innerHTML = `
                <b>ID: ${i}</b> - ${c.title} <span class="status-tag ${statusClass}">${status}</span><br>
                Goal: ${ethers.formatEther(c.goalWei)} GO | Raised: ${ethers.formatEther(c.totalRaisedWei)} GO<br>
                Deadline: ${new Date(Number(c.deadline) * 1000).toLocaleDateString()}
            `;
            listDiv.appendChild(card);
        }
    }
    const refreshBtn = document.createElement("button");
    refreshBtn.textContent = "Refresh";
    refreshBtn.onclick = loadCampaign;
    listDiv.appendChild(refreshBtn);
}

async function contributeCampaign() {
    const id = document.getElementById("contributeCampaignID").value;
    const amount = document.getElementById("contributeCampaignAmount").value;

    if (!id || !amount) { alert("Fill all fields"); return; }

    showStatus("Contributing...");
    const tx = await crowdfundingContract.contribute(id, { value: ethers.parseEther(amount) });
    await tx.wait();

    document.getElementById("contributeCampaignID").value = "";
    document.getElementById("contributeCampaignAmount").value = "";

    showStatus("Contribution done!");
    loadCampaign();
}

async function getCampaignInfo() {
    const count = await crowdfundingContract.campaignCount();
    document.getElementById("totalCampaigns").textContent = count.toString();

    let total = 0n;
    for (let i = 0; i < count; i++) {
        const c = await crowdfundingContract.campaigns(i);
        total += c.totalRaisedWei;
    }
    document.getElementById("totalContributions").textContent = ethers.formatEther(total) + " GO";
}

function showStatus(msg) {
    const div = document.createElement("div");
    div.className = "status-msg";
    div.textContent = "[" + new Date().toLocaleTimeString() + "] " + msg;

    const status = document.getElementById("transactionStatus");
    status.prepend(div);

    while (status.children.length > 5) {
        status.removeChild(status.lastChild);
    }
}
window.connectWallet = connectWallet;
window.createCampaign = createCampaign;
window.loadCampaign = loadCampaign;
window.contributeCampaign = contributeCampaign;
window.getCampaignInfo = getCampaignInfo;
