"use client";
import Image from "next/image";
import { ethers } from "ethers";
import { useState } from "react";

export default function Home() {
  const [account, setAccount] = useState(null);

  const connectWallet = async () => {
    //check if metamask is installed
    if (typeof window.ethereum !== "undefined") {
      try {
        // Request account access
        const [selectedAccount] = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        // Initialize provider and signer
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = provider.getSigner();

        // Get the account address (you can also get more details if needed)
        setAccount(selectedAccount);

        console.log("Connected with account:", selectedAccount);
      } catch (error) {
        console.error("Connection error:", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  return (
    <>
      <h1> Hello world!</h1>

      <button>Connect Wallet</button>
    </>
  );
}
