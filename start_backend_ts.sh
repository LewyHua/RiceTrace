#!/bin/bash

echo "🚀 Starting Fabric network with TypeScript chaincode..."

# 进入test-network目录
cd ./fabric-samples/test-network

# 完全清理网络状态
echo "🧹 Cleaning up existing network..."
./network.sh down
docker system prune -f
docker volume prune -f

# 重新启动网络
echo "🆙 Starting Fabric network..."
./network.sh up createChannel -c channel1

# 添加第三个组织
echo "🏢 Adding Org3..."
cd addOrg3
./addOrg3.sh up -c channel1
cd ..

# 编译TypeScript智能合约
echo "🔨 Building TypeScript chaincode..."
cd ../asset-transfer-basic/my-ts
npm install
npm run build
cd ../../test-network

# 使用network.sh部署TypeScript智能合约
echo "📦 Deploying TypeScript chaincode..."
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/my-ts/ -ccl typescript -c channel1

echo "✅ TypeScript chaincode deployment completed!"
echo "🎯 You can now start the Node.js API server with: cd fabric-samples/asset-transfer-basic/my-js && npm start" 