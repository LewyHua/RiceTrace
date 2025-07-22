cd ./fabric-samples/test-network


./network.sh down
./network.sh up createChannel -c channel1

cd addOrg3
./addOrg3.sh up -c channel1

cd ..



export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=Org3MSP
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp
export CORE_PEER_ADDRESS=localhost:11051


./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/my-go/ -ccl go -c channel1

peer channel join -b channel-artifacts/channel1.block


CORE_PEER_GOSSIP_USELEADERELECTION=false
CORE_PEER_GOSSIP_ORGLEADER=true



export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=Org3MSP
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp
export CORE_PEER_ADDRESS=localhost:11051


peer lifecycle chaincode package basic.tar.gz --path ../asset-transfer-basic/my-go/ --lang golang --label basic_1.0


peer lifecycle chaincode install basic.tar.gz


# peer lifecycle chaincode queryinstalled
# Package ID: basic_1.0:712609564ecd7e71e90dfb1b19e652e837a4095dceeb2daf55664cf5fa34335a, Label: basic_1.0


#export CC_PACKAGE_ID=
export CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep "basic_1.0" | awk -F'[, ]+' '{print $3}')
echo $CC_PACKAGE_ID

 

peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" --channelID channel1 --name basic --version 1.0 --package-id $CC_PACKAGE_ID --sequence 1

peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C channel1 -n basic --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" --peerAddresses localhost:11051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt" -c '{"function":"InitLedger","Args":[]}'


