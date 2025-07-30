#!/bin/bash

echo "🚀 Starting Fabric network with TypeScript chaincode..."

# enter test-network directory
cd ./fabric-samples/test-network

# clean up existing network
echo "🧹 Cleaning up existing network..."
./network.sh down
docker system prune -f
docker volume prune -f

# restart network
echo "🆙 Starting Fabric network..."
./network.sh up createChannel -c channel1

# add third organization
echo "🏢 Adding Org3..."
cd addOrg3
./addOrg3.sh up -c channel1
cd ..

# build TypeScript chaincode
echo "🔨 Building TypeScript chaincode..."
cd ../asset-transfer-basic/my-ts
npm install
npm run build
cd ../../test-network

# deploy TypeScript chaincode
echo "📦 Deploying TypeScript chaincode..."
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/my-ts/ -ccl typescript -c channel1

echo "✅ TypeScript chaincode deployment completed!"
echo "🎯 You can now start the Node.js API server with: cd fabric-samples/asset-transfer-basic/my-js && npm start" 