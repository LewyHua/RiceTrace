# Rice Tracer 后端（区块链服务）启动与使用指南

---

## 目录结构

```
fabric-samples/asset-transfer-basic/my-go/
├── chaincode-go
│   ├── sc.go            // 智能合约
│   └── sc_test.go
├── go.mod
├── go.sum
├── riceTracer.go        // 启动地址
└── ...
```
---

## 环境要求

- docker...
- 详情指南：
    - https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html

---

## 1. 启动 Fabric 网络，直接在项目根目录运行脚本

```bash
./start_backend.sh
```

