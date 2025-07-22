# Rice Tracer 后端（区块链服务）启动与使用指南

---

## 目录结构

```
fabric-samples/asset-transfer-basic/my-js/
│
├── fabricClient.js    // Fabric 网络连接与合约调用逻辑
├── server.js          // Express REST API 服务
├── package.json
├── backend-README.md
└── ...
```

---

## 环境要求

- Node.js >= 16
- NPM 或 Yarn
- Hyperledger Fabric 示例网络（test-network）

---

## 1. 启动 Fabric 示例网络

进入 Fabric 示例目录（假设已下载 fabric-samples）：

```bash
cd fabric-samples/test-network
./network.sh up createChannel -c channel1 -ca
```

> 这将启动网络并创建 `channel1`。

---

## 2. 部署链码

```bash
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-javascript/ -ccl javascript -c channel1
```

> 这会将名为 `basic` 的链码部署到 `channel1`。

---

## 3. 安装依赖

在 `fabric-samples/asset-transfer-basic/my-js` 目录下执行：

```bash
npm install express body-parser @grpc/grpc-js @hyperledger/fabric-gateway
```

---

## 4. 启动后端 REST API 服务

在 `fabric-samples/asset-transfer-basic/my-js` 目录下执行：

```bash
node server.js
```

服务默认监听 3000 端口。

---

## 5. 角色与权限说明

- farmer: 查询/创建批次
- processor: 转移批次、添加质检/加工记录、创建产品
- consumer: 查询批次、查询产品

通过 HTTP 请求头 `X-User-Role` 或 URL 参数 `?role=` 指定角色。

---

## 6. 常见问题

- 确保 Fabric 网络已启动且链码已部署。
- 如遇证书、连接等错误，请检查 `fabricClient.js` 配置。
- 端口冲突请修改 `server.js` 中监听端口。

---

如需进一步帮助，请查阅 Hyperledger Fabric 官方文档或联系开发者。 