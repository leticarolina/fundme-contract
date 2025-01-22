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

  const checkContractBalance = async () => {
    try {
      const balance = await provider.getBalance(contractAddress);
      setContractBalance(ethers.formatEther(balance)); // Convert from wei to ETH
      console.log("Contract Balance:", ethers.formatEther(balance));
    } catch (error) {
      console.error("Error fetching contract balance:", error);
      alert("Failed to fetch contract balance.");
    }
  };

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== "undefined") {
        const [selectedAccount] = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        if (!selectedAccount) {
          throw new Error("No account returned. Please try again.");
        }

        setAccount(selectedAccount);
        console.log("Connected account:", selectedAccount);
      } else {
        alert("Please install MetaMask!");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
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
      if (typeof window.ethereum === "undefined") {
        throw new Error("MetaMask is not installed");
      }

      // Get the signer
      const signer = await provider.getSigner();
      if (!signer) {
        throw new Error("No signer found. Please connect your wallet.");
      }

      // Ensure the signer has an address property
      const connectedAccount = await signer.getAddress();
      if (!connectedAccount) {
        throw new Error("Unable to fetch connected account. Please reconnect.");
      }
      console.log("Connected Account:", connectedAccount);

      // Load contract with signer
      const contract = new ethers.Contract(contractAddress, abi, signer);

      // Use provider to check owner
      const owner = await contract.connect(provider).getOwner();
      console.log("Contract Owner:", owner);

      if (connectedAccount.toLowerCase() !== owner.toLowerCase()) {
        throw new Error("You are not the contract owner!");
      }

      // Call withdraw function
      const tx = await contract.withdraw();
      console.log("Withdraw transaction sent:", tx.hash);
      await tx.wait();
      console.log("Withdraw transaction confirmed!");
    } catch (error) {
      console.error("Error during withdrawal:", error.message);
      alert(error.message);
    }
  };

  return (
    <div className="bg-pattern bg-cover bg-center h-screen opacity-70 flex flex-col items-center justify-center text-white">
      {/* Connect Wallet Button positioned at the top-left */}
      <div className="absolute top-5 right-5">
        {account ? (
          <button className="bg-green-500 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:bg-green-600 transition">
            Connected
          </button>
        ) : (
          <button
            onClick={connectWallet}
            className="bg-white text-black font-semibold py-2 px-4 rounded-lg shadow-lg hover:bg-gray-200 transition"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Centered Content */}
      <div className="text-center">
        <h1 className="text-4xl font-bold font-sans text-white">
          Leti's Funding Portal
        </h1>

        <h3 className="text-xl mb-6">Smart Contract Interaction</h3>

        <div className="mt-6 p-4 bg-white/20 backdrop-blur-lg rounded-sm shadow-md text-center text-lg font-medium text-white max-w-lg mx-auto">
          {account ? (
            <p className="truncate">
              Connected Wallet:{" "}
              <span className="font-bold text-green-300">{account}</span>
            </p>
          ) : (
            <p className="text-red-500 font-semibold text-lg">
              No wallet connected.
            </p>
          )}
        </div>

        <div className="mt-4">
          <input
            type="text"
            placeholder="Enter amount in ETH"
            value={ethAmount}
            onChange={(e) => setEthAmount(e.target.value)}
            className="py-2 px-4 rounded-lg border border-gray-300 text-black mr-4"
          />
          <button
            onClick={fundContract}
            className="bg-green-500 text-white py-2 px-6 rounded-lg shadow-md hover:bg-green-600 transition"
          >
            Contribute Now
          </button>
        </div>

        <button
          onClick={checkContractBalance}
          className="mt-6 bg-purple-600/70 text-white py-2 px-6 rounded-lg shadow-md 
  hover:bg-purple-400/80 transition"
        >
          Check Contract Balance
        </button>

        {contractBalance && (
          <div className="mt-6">
            <p className="text-lg">Contract Balance: {contractBalance} ETH</p>
            <button
              onClick={withdrawFunds}
              className="mt-4 bg-red-500 text-white py-2 px-6 rounded-lg shadow-md hover:bg-red-600 transition"
            >
              Withdraw Funds
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
