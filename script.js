const CROWDFUNDING_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
const TOKEN_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

const crowdfundingABI = [
    { "inputs": [{ "name": "title", "type": "string" }, { "name": "goalWei", "type": "uint256" }, { "name": "durationSeconds", "type": "uint256" }], "name": "createCampaign", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "name": "id", "type": "uint256" }], "name": "contribute", "outputs": [], "stateMutability": "payable", "type": "function" },
    { "inputs": [{ "name": "id", "type": "uint256" }], "name": "finalizeCampaign", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "name": "id", "type": "uint256" }], "name": "refund", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "name": "", "type": "uint256" }], "name": "campaigns", "outputs": [{ "name": "creator", "type": "address" }, { "name": "title", "type": "string" }, { "name": "goalWei", "type": "uint256" }, { "name": "deadline", "type": "uint256" }, { "name": "totalRaisedWei", "type": "uint256" }, { "name": "finalized", "type": "bool" }, { "name": "goalReached", "type": "bool" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "campaignCount", "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "name": "", "type": "uint256" }, { "name": "", "type": "address" }], "name": "contributions", "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
];

const tokenABI = [
    { "inputs": [{ "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
];

let provider, signer, userAddress, crowdfundingContract, tokenContract;

async function connectWallet() {
    if (!window.ethereum) { alert("MetaMask not installed!"); return; }

    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    userAddress = accounts[0];
    signer = await provider.getSigner();

    crowdfundingContract = new ethers.Contract(CROWDFUNDING_ADDRESS, crowdfundingABI, signer);
    tokenContract = new ethers.Contract(TOKEN_ADDRESS, tokenABI, provider);

    document.getElementById("walletAddress").textContent = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);

    const network = await provider.getNetwork();
    document.getElementById("network").textContent = network.name || "localhost";

    const balance = await provider.getBalance(userAddress);
    document.getElementById("ethBalance").textContent = parseFloat(ethers.formatEther(balance)).toFixed(4) + " GO";

    const tokenBal = await tokenContract.balanceOf(userAddress);
    document.getElementById("tokenBalance").textContent = parseFloat(ethers.formatEther(tokenBal)).toFixed(2) + " CHAR";

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

    if (count === 0n) {
        listDiv.innerHTML = "<h3>CAMPAIGN LIST:</h3><p>No campaigns</p><button onclick='loadCampaign()'>Refresh</button>";
        return;
    }

    let html = "<h3>CAMPAIGN LIST:</h3>";
    for (let i = 0; i < count; i++) {
        const c = await crowdfundingContract.campaigns(i);
        const status = c.finalized ? (c.goalReached ? "✅ Reached" : "❌ Failed") : "🔵 Active";
        html += `<div style="border:1px solid #ccc;padding:10px;margin:5px 0;">
            <b>ID: ${i}</b> - ${c.title}<br>
            Goal: ${ethers.formatEther(c.goalWei)} GO | Raised: ${ethers.formatEther(c.totalRaisedWei)} GO<br>
            Deadline: ${new Date(Number(c.deadline) * 1000).toLocaleDateString()} | ${status}
        </div>`;
    }
    html += "<button onclick='loadCampaign()'>Refresh</button>";
    listDiv.innerHTML = html;
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
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    div.style.cssText = "padding:5px;margin-bottom:5px;background:#f0f0f0;border-radius:4px;";
    const status = document.getElementById("transactionStatus");
    status.prepend(div);
    while (status.children.length > 5) status.removeChild(status.lastChild);
}

window.connectWallet = connectWallet;
window.createCampaign = createCampaign;
window.loadCampaign = loadCampaign;
window.contributeCampaign = contributeCampaign;
window.getCampaignInfo = getCampaignInfo;
