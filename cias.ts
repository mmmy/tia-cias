import { readFile } from "fs/promises"
import { DirectSecp256k1HdWallet, OfflineDirectSigner } from "@cosmjs/proto-signing"
import { IndexedTx, SigningStargateClient, StargateClient } from "@cosmjs/stargate"
// import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx"
// import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx"
import * as config from "config"

const runConfig: { run_times: number; gas_amount: number; key_paths: string[] } = config.get("cias")
console.log(runConfig)

const rpc = "https://rpc-1.celestia.nodes.guru"

//-------cias挖矿程序-----------
// ---------------------配置--------------------------
// const KEY_PATH = "../temp/tempkeys"
// //958 1958
// const GAS_AMOUNT = 58
// // 循环运行次数
// const RUN_TIMES = 3

const getAliceSignerFromMnemonic = async (keyPath: string): Promise<OfflineDirectSigner> => {
    return DirectSecp256k1HdWallet.fromMnemonic((await readFile(keyPath)).toString(), {
        prefix: "celestia",
    })
}

const runAll = async (keyPath: string): Promise<void> => {
    const startTime = new Date()
    const client = await StargateClient.connect(rpc)
    // console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight())
    // console.log(
    //     "TIA balances:",
    //     await client.getAllBalances("celestia12rg66ggrjz8yaquhqlvnh2y5fpghr3sfs4dzl9")
    // )

    const aliceSigner: OfflineDirectSigner = await getAliceSignerFromMnemonic(keyPath)
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
            amount: [{ denom: "utia", amount: runConfig.gas_amount + "" }],
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
async function run_recursion(keyPath: string) {
    // new Array(RUN_TIMES).fill(0).map(async (v, index) => {})
    let successCount = 0
    for (let i = 0; i < runConfig.run_times; i++) {
        console.log("---------------------------")
        console.log(
            "开始执行: ",
            `${i + 1}/${runConfig.run_times}`,
            `成功 ${successCount}次`,
            keyPath,
            "现在时间",
            new Date().toLocaleTimeString()
        )
        console.log("---------------------------")
        try {
            await runAll(keyPath)
            successCount += 1
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
