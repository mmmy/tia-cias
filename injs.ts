import { readFile } from "fs/promises"
import { DirectSecp256k1HdWallet, OfflineDirectSigner } from "@cosmjs/proto-signing"
import { IndexedTx, SigningStargateClient, StargateClient } from "@cosmjs/stargate"
import {
    InjectiveDirectEthSecp256k1Wallet,
    TxClient,
    PrivateKey,
    TxGrpcClient,
    ChainRestAuthApi,
    createTransaction,
} from "@injectivelabs/sdk-ts"
import { MsgSend } from "@injectivelabs/sdk-ts"
import { BigNumberInBase, DEFAULT_STD_FEE } from "@injectivelabs/utils"
import { getNetworkInfo, Network } from "@injectivelabs/networks"
// import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx"
// import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx"
import * as config from "config"

const runConfig: { run_times: number; gas_amount: number; key_paths: string[] } = config.get("inj")
console.log(runConfig)

const rpc = "https://injective-rpc.polkachu.com"
// const rpc = "https://sentry.tm.injective.network/"
// const rpc = "https://rpc-injective.keplr.app"

const getAliceSignerFromMnemonic = async (keyPath: string): Promise<OfflineDirectSigner> => {
    return DirectSecp256k1HdWallet.fromMnemonic((await readFile(keyPath)).toString(), {
        // hdPaths: ["0", "0", "0"],
        prefix: "inj",
    })
}
const network = getNetworkInfo(Network.Public)
const runAll = async (keyPath: string): Promise<void> => {
    const startTime = new Date()
    const client = await StargateClient.connect(rpc)
    // console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight())
    // console.log(
    //     "TIA balances:",
    //     await client.getAllBalances("celestia12rg66ggrjz8yaquhqlvnh2y5fpghr3sfs4dzl9")
    // )
    const mmm = (await readFile(keyPath)).toString()
    const privateKeyFromMnemonic = PrivateKey.fromMnemonic(mmm)

    const privateKeyHex = Buffer.from(privateKeyFromMnemonic.toPrivateKeyHex().substring(2), "hex")
    // console.log(privateKeyFromMnemonic.toPrivateKeyHex())
    const privateKey = privateKeyFromMnemonic

    const aliceSigner = (await InjectiveDirectEthSecp256k1Wallet.fromKey(
        privateKeyHex
    )) as OfflineDirectSigner
    // console.log("88888888888", aliceSigner.getAccounts())
    // return
    // const aliceSigner: OfflineDirectSigner = await getAliceSignerFromMnemonic(keyPath)
    const data = await aliceSigner.getAccounts()
    const address = data[0].address
    const injectiveAddress = address
    const publicKey = privateKey.toPublicKey().toBase64()
    console.log("address:", address)
    const signingClient = await SigningStargateClient.connectWithSigner(rpc, aliceSigner, {
        // gasPrice: {
        //     denom: "utia",
        //     amount: "958",
        // },
    })
    console.log(
        "With signing client, chain id:",
        await signingClient.getChainId(),
        ", height:",
        await signingClient.getHeight()
    )
    console.log("INJ balance before:", await client.getAllBalances(address))
    // await client.getAllBalances("inj10txpvlu8ynmfe2u2t98jtxxqz4tax0nvwp69e9")

    /** Account Details **/
    const accountDetails = await new ChainRestAuthApi(network.rest).fetchAccount(injectiveAddress)
    const amount = {
        amount: new BigNumberInBase(0.00001).toWei().toFixed(),
        denom: "inj",
    }

    const msg = MsgSend.fromJSON({
        amount,
        srcInjectiveAddress: injectiveAddress,
        dstInjectiveAddress: injectiveAddress,
    })

    /** Prepare the Transaction **/
    const { signBytes, txRaw } = createTransaction({
        message: msg,
        memo: "ZGF0YToseyJwIjoiaW5qcmMtMjAiLCJvcCI6Im1pbnQiLCJ0aWNrIjoiSU5KUyIsImFtdCI6IjIwMDAifQ==",
        // fee: DEFAULT_STD_FEE,
        fee: {
            amount: [{ denom: "inj", amount: runConfig.gas_amount + "" }],
            gas: "124049",
        },
        pubKey: publicKey,
        sequence: parseInt(accountDetails.account.base_account.sequence, 10),
        accountNumber: parseInt(accountDetails.account.base_account.account_number, 10),
        chainId: network.chainId,
    })

    /** Sign transaction */
    const signature = await privateKey.sign(Buffer.from(signBytes))

    /** Append Signatures */
    txRaw.signatures = [signature]

    /** Calculate hash of the transaction */
    console.log(`Transaction Hash: ${TxClient.hash(txRaw)}`)

    const txService = new TxGrpcClient(network.grpc)

    /** Simulate transaction */
    // const simulationResponse = await txService.simulate(txRaw)
    // console.log(`Transaction simulation response: ${JSON.stringify(simulationResponse.gasInfo)}`)

    /** Broadcast transaction */
    const txResponse = await txService.broadcast(txRaw)

    if (txResponse.code !== 0) {
        console.log(`失败Transaction failed: ${txResponse.rawLog}`)
    } else {
        console.log(`成功!Broadcasted transaction hash: ${JSON.stringify(txResponse.txHash)}`)
    }

    console.log("balance after:", await client.getAllBalances(address))
    const timeUsed = Math.round((+new Date() - +startTime) / 1000)
    console.log("用时:", timeUsed, "秒")
}

// async function test() {
//     return new Promise((resolve, reject) => {
//         setTimeout(() => {
//             reject()
//             // resolve(undefined)
//         }, 2000)
//     })
// }
async function run_recursion(keyPath: string) {
    // new Array(RUN_TIMES).fill(0).map(async (v, index) => {})
    let successCount = 0
    for (let i = 0; i < runConfig.run_times; i++) {
        console.log("---------------------------")
        console.log(
            "开始执行: ",
            `${i + 1}/${runConfig.run_times}`,
            // `成功 ${successCount}次`,
            keyPath,
            "现在时间",
            new Date().toLocaleTimeString()
        )
        console.log("---------------------------")
        try {
            await runAll(keyPath)
            successCount += 1
            console.log(keyPath, `成功 ${successCount}次`, `已执行${i + 1}次`)
        } catch (e) {
            console.log(keyPath, `第${i + 1}次`, "出现错误", e)
        }
    }
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
    console.log(keyPath, "已经全部结束")
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
}

runConfig.key_paths.forEach((pathStr) => {
    run_recursion(pathStr)
})

// let count = 0
// let successCount = 0
// if (RUN_TIMES > 0) {
//     runAll().then
// }

// Promise.all(
//     new Array(RUN_TIMES).fill(0).map(async (v, index) => {
//         console.log("执行进度: ", `${index + 1}/${RUN_TIMES}`, "-------------------------")
//         return runAll()
//     })
// )
// runAll()
