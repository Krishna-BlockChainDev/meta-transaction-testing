# Meta Transaction Testing

A sample project for deploying an ERC-20 smart contract and testing gasless transactions through a Relayer API using EIP-712 signatures and the ERC-20 Permit mechanism.

## Overview

This project demonstrates how a user can authorize token allowances by signing a message off-chain, while a relayer submits the transaction on-chain and pays the gas fees.

The API is implemented using **Node.js, Express, and ethers.js** and interacts with a deployed `MiniERC20` smart contract.

### Features

- Connect to the Sepolia test network.
- Retrieve network, relayer, and contract information.
- Fetch ERC-20 token details, balances, and allowances.
- Retrieve the current nonce for an account.
- Execute gasless token approval using the ERC-20 Permit mechanism.
- Test replay-attack prevention by reusing the same Permit signature.
- Verify transaction hashes, nonces, and allowances.

## Project Structure

```text
meta-transaction-testing/
└── relayer-api/
    ├── abi/
    │   └── MiniERC20.json
    ├── .env
    ├── package.json
    └── server.js
```

_The structure above is illustrative; adjust filenames to match your actual repository._

## Prerequisites

- Node.js and npm
- A Sepolia RPC endpoint
- A deployed `MiniERC20` contract address
- A relayer wallet funded with Sepolia ETH
- A user wallet for signing Permit messages

## Setup

### 1. Navigate to the API directory

```bash
cd relayer-api
```

### 2. Install dependencies

```bash
npm install
```

Ensure the project includes the following dependencies:

- `express`
- `dotenv`
- `ethers`

### 3. Configure environment variables

Create a `.env` file inside `relayer-api/`:

```env
PORT=3000
SEPOLIA_RPC_URL=YOUR_SEPOLIA_RPC_URL
CONTRACT_ADDRESS=YOUR_DEPLOYED_CONTRACT_ADDRESS
RELAYER_PRIVATE_KEY=YOUR_RELAYER_PRIVATE_KEY
```

**Security:** Never commit your `.env` file or expose private keys. Add `.env` to `.gitignore` and use dedicated test wallets.

### 4. Start the Relayer API

Run the command configured by your project's `package.json`. For example, if the entry point is `server.js`:

```bash
node server.js
```

The API will run at:

```text
http://localhost:3000
```

## API Endpoints

Replace `localhost:3000` with your deployed API URL when testing remotely.

### 1. Get relayer and network information

**GET** `/`

Returns network information, the deployed contract address, the relayer address, and the relayer's ETH balance.

Example response:

```json
{
  "success": true,
  "network": {
    "name": "sepolia",
    "chainId": "11155111"
  },
  "contract": "YOUR_CONTRACT_ADDRESS",
  "relayer": "YOUR_RELAYER_ADDRESS",
  "relayerBalance": "0.05"
}
```

### 2. Get token information

**GET** `/token`

Returns the token name, symbol, contract address, and total supply.

### 3. Get token balance

**GET** `/token/balance/:address`

Returns the token balance for the specified address.

Example:

```text
GET /token/balance/0xUSER_ADDRESS
```

### 4. Get token allowance

**GET** `/token/allowance/:owner/:spender`

Returns the allowance granted by an owner to a spender.

Example:

```text
GET /token/allowance/0xOWNER_ADDRESS/0xSPENDER_ADDRESS
```

### 5. Get Permit nonce

**GET** `/permit/nonce/:owner`

Returns the current Permit nonce for the specified owner.

Example:

```text
GET /permit/nonce/0xOWNER_ADDRESS
```

### 6. Execute a gasless Permit transaction

**POST** `/permit`

Submits a Permit transaction using a user-generated EIP-712 signature. The relayer sends the transaction and pays the network gas fee.

Request body:

```json
{
  "userPrivateKey": "USER_PRIVATE_KEY",
  "spender": "0xSPENDER_ADDRESS",
  "value": "1000000000000000000"
}
```

The `deadline` field is optional. If omitted, the API sets the Permit deadline to approximately one hour after the latest block timestamp.

The `value` is expressed in the token's smallest unit. For an 18-decimal token, `1000000000000000000` represents one token.

The API response includes the owner, spender, Permit nonce before and after execution, transaction hash, block number, and resulting allowance.

**Important:** This endpoint accepts a raw user private key and signs the message on the server. This is suitable only for controlled testing with disposable test wallets, not production use. In a production design, the user should sign the typed data client-side and send the signature to the relayer API.

### 7. Test Permit replay-attack prevention

**POST** `/permit/replay-test`

Tests whether a previously used Permit signature can be replayed.

Request body:

```json
{
  "userPrivateKey": "USER_PRIVATE_KEY",
  "spender": "0xSPENDER_ADDRESS",
  "value": "1000000000000000000"
}
```

The API:

1. Reads the user's current Permit nonce.
2. Generates an EIP-712 Permit signature.
3. Submits the first Permit transaction through the relayer.
4. Attempts to submit the same signature again.
5. Reports whether the second attempt was rejected or unexpectedly succeeded.
6. Returns the transaction hash, nonce information, and final allowance.

Expected behavior: the second attempt should fail because the first successful Permit consumes the nonce, assuming the contract correctly implements nonce validation.

## Gasless Transaction Flow

```text
User Wallet
    |
    | Create EIP-712 Permit signature
    v
Relayer API
    |
    | Submit Permit transaction
    v
MiniERC20 Smart Contract
    |
    | Validate signature and nonce
    | Update allowance
    v
Transaction Confirmed
```

The user authorizes the Permit off-chain, while the relayer pays the gas fee for submitting the on-chain transaction.

## Technology Stack

- **Smart Contract:** Solidity / MiniERC20
- **Backend:** Node.js and Express
- **Ethereum Library:** ethers.js
- **Signature Standard:** EIP-712
- **Token Authorization:** ERC-20 Permit
- **Network:** Sepolia testnet

## Notes

- Ensure the ABI matches the deployed contract.
- The contract must implement the expected Permit structure and EIP-712 domain.
- The relayer wallet must have sufficient Sepolia ETH.
- Use test wallets and test tokens only.
- The API should be secured before exposing it publicly.
- Confirm that the deployed contract's Permit implementation matches the domain name, version, nonce handling, and signature fields used by the API.

## Disclaimer

This repository is intended for development, experimentation, and testing of gasless ERC-20 Permit transactions. It is not intended for production deployment without additional security controls.
