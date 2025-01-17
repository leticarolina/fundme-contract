"use client";
import { ethers } from "ethers";
import { useState } from "react";

export default function Home() {
  const [account, setAccount] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [contractBalance, setContractBalance] = useState(null);

  //to be checked
  const contractAddress = "CONTRACT_ADDRESS";
  const abi = [
    "function withdraw() public",
    "function getOwner() external view returns (address)",
  ];

  const provider = new ethers.BrowserProvider(window.ethereum);

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== "undefined") {
        const [selectedAccount] = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(selectedAccount);
        console.log("Connected account:", selectedAccount);
      } else {
        alert("Please install MetaMask!");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  const checkContractBalance = async () => {
    try {
      const balance = await provider.getBalance(contractAddress);
      setContractBalance(ethers.formatEther(balance)); // Convert from wei to ETH
    } catch (error) {
      console.error("Error fetching contract balance:", error);
    }
  };

  const withdrawFunds = async () => {
    try {
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);

      // Call withdraw function
      const tx = await contract.withdraw();
      console.log("Withdraw transaction sent:", tx.hash);
      await tx.wait();
      console.log("Withdraw transaction confirmed!");
    } catch (error) {
      console.error("Error during withdrawal:", error);
    }
  };

  return (
    <>
      <h1> Fund Leticia</h1>
      <h3>Contract interaction</h3>
      <button onClick={connectWallet}>Connect Wallet</button>
      {account && <p>Connected Wallet: {account}</p>}

      <button onClick={checkContractBalance}>Contract Balance</button>

      {contractBalance && (
        <div style={{ marginTop: "20px" }}>
          <p>Contract Balance: {contractBalance} ETH</p>
          <button
            onClick={withdrawFunds}
            style={{
              padding: "10px 20px",
              marginTop: "10px",
              backgroundColor: "green",
              color: "white",
            }}
          >
            Withdraw Funds
          </button>
        </div>
      )}
    </>
  );
}
