import { readFile } from "fs/promises"
import { DirectSecp256k1HdWallet, OfflineDirectSigner } from "@cosmjs/proto-signing"
import { IndexedTx, SigningStargateClient, StargateClient } from "@cosmjs/stargate"
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx"
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx"

const rpc = "https://rpc-1.celestia.nodes.guru"

//-------cias挖矿程序-----------
// ---------------------配置--------------------------
const KEY_PATH = "../temp/tempkeys"
//958 1958
const GAS_AMOUNT = 58
// 循环运行次数
const RUN_TIMES = 3

const getAliceSignerFromMnemonic = async (): Promise<OfflineDirectSigner> => {
    return DirectSecp256k1HdWallet.fromMnemonic((await readFile(KEY_PATH)).toString(), {
        prefix: "celestia",
    })
}

const runAll = async (): Promise<void> => {
    const startTime = new Date()
    const client = await StargateClient.connect(rpc)
    // console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight())
    // console.log(
    //     "TIA balances:",
    //     await client.getAllBalances("celestia12rg66ggrjz8yaquhqlvnh2y5fpghr3sfs4dzl9")
    // )

    const aliceSigner: OfflineDirectSigner = await getAliceSignerFromMnemonic()
    const address = (await aliceSigner.getAccounts())[0].address
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
    console.log("TIA balance before:", await client.getAllBalances(address))
    const result = await signingClient.sendTokens(
        address,
        address,
        [{ denom: "utia", amount: "1000" }],
        // "auto",
        {
            amount: [{ denom: "utia", amount: GAS_AMOUNT + "" }],
            gas: "74110",
        },
        "ZGF0YToseyJvcCI6Im1pbnQiLCJhbXQiOjEwMDAwLCJ0aWNrIjoiY2lhcyIsInAiOiJjaWEtMjAifQ=="
    )
    console.log("Transfer result:", result)
    console.log("Alice balance after:", await client.getAllBalances(address))
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
async function run_recursion() {
    // new Array(RUN_TIMES).fill(0).map(async (v, index) => {})
    for (let i = 0; i < RUN_TIMES; i++) {
        console.log("---------------------------")
        console.log("开始执行: ", `${i + 1}/${RUN_TIMES}`, "现在时间", new Date().toLocaleTimeString())
        console.log("---------------------------")
        await runAll()
    }
}

run_recursion()

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
