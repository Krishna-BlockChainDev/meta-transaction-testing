import { network } from 'hardhat';

const { ethers } = await network.connect();

async function main() {
  console.log('Deploying MiniERC20...');

  // --------------------------------------------------
  // Get deployer
  // --------------------------------------------------

  const [deployer] = await ethers.getSigners();

  console.log('Deployer:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);

  console.log('Deployer balance:', ethers.formatEther(balance));

  // --------------------------------------------------
  // Deploy contract
  // --------------------------------------------------

  const MiniERC20 = await ethers.getContractFactory('MiniERC20');

  const token = await MiniERC20.deploy('Mini ERC20', 'M20');

  // --------------------------------------------------
  // Wait for deployment
  // --------------------------------------------------

  await token.waitForDeployment();

  const contractAddress = await token.getAddress();

  console.log('\n================================');
  console.log('MiniERC20 deployed successfully');
  console.log('================================');

  console.log('Contract Address:', contractAddress);

  console.log('Name:', await token.name());

  console.log('Symbol:', await token.symbol());

  // --------------------------------------------------
  // Check roles
  // --------------------------------------------------

  console.log('\nRoles:');

  console.log('DEFAULT_ADMIN_ROLE:', await token.DEFAULT_ADMIN_ROLE());

  console.log('MINTER_ROLE:', await token.MINTER_ROLE());

  console.log('PAUSER_ROLE:', await token.PAUSER_ROLE());

  console.log('COMPLIANCE_ROLE:', await token.COMPLIANCE_ROLE());

  // --------------------------------------------------
  // Check EIP-712 data
  // --------------------------------------------------

  console.log('\nEIP-712:');

  console.log('DOMAIN_SEPARATOR:', await token.DOMAIN_SEPARATOR());

  console.log('PERMIT_TYPEHASH:', await token.PERMIT_TYPEHASH());

  // --------------------------------------------------
  // Check initial nonce
  // --------------------------------------------------

  console.log(
    '\nDeployer nonce:',
    (await token.nonces(deployer.address)).toString(),
  );

  console.log('\nDeployment complete.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
