"use client";
import { ethers } from "ethers";
import { useState } from "react";

export default function Home() {
  const [account, setAccount] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [contractBalance, setContractBalance] = useState(null);
  const [ethAmount, setEthAmount] = useState("");

  //to be checked
  const contractAddress = "0x933b20396aa6214a5795cdb0b13aef7c4cf160bb";
  const abi = [
    "function withdraw() public",
    "function getOwner() external view returns (address)",
    "function getFunds() public payable",
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

  const fundContract = async () => {
    try {
      if (!ethAmount || isNaN(ethAmount) || parseFloat(ethAmount) <= 0) {
        alert("Please enter a valid amount of ETH!");
        return;
      }

      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);

      // Call getFunds with the entered ETH amount
      const tx = await contract.getFunds({
        value: ethers.parseEther(ethAmount), // Convert ETH to wei
      });
      console.log("Funds transaction sent:", tx.hash);
      await tx.wait();
      alert("Funds transaction confirmed!");
      setEthAmount(""); // Clear the input after sending funds
    } catch (error) {
      console.error("Error sending funds:", error);
      alert("Transaction failed! Please try again.");
    }
  };

  const withdrawFunds = async () => {
    try {
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);

      // Use provider for read-only calls
      const owner = await contract.connect(provider).getOwner();
      console.log("Contract Owner:", owner);

      const connectedAccount = await signer.address;
      console.log("Connected Account:", connectedAccount);

      if (connectedAccount !== owner) {
        throw new Error("You are not the owner!");
      }

      // Use signer for state-changing calls
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
      <div style={{ marginTop: "20px" }}>
        <input
          type="text"
          placeholder="Enter amount in ETH"
          value={ethAmount}
          onChange={(e) => setEthAmount(e.target.value)}
          style={{ padding: "10px", marginRight: "10px" }}
        />
        <button onClick={fundContract} style={{ padding: "10px 20px" }}>
          Fund Contract
        </button>
      </div>

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
