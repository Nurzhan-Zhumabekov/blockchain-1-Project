import { ethers } from 'ethers';

const crowdfunding_contact_adress = "";
const token_contract_adress = "";

const crowdfunding_abi = [];
const token_abi = [];

let provider;
let signer;
let userAdress;
let crowdfundingContract;
let tokenContract;

async function connectWallet() {
    const provider= new ethers.BrowserProvider(window.ethereum);
    const accounts= await provider.send('eth_requestAccounts', []);
    userAdress= accounts[0];

    signer= await provider.getSigner();
    await initializeContracts();
    await updateWalletUI();
    await loadInitialData();
    showStatus("Succesfully conected", "success");
}
