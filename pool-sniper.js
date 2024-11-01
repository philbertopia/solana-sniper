// https://www.youtube.com/watch?v=GDE4HS26cY4&t=208s
const express = require('express');

const app = express();
const port = 3000;
const tokenLogs = [];

app.use(express.json());

app.post('/webhook', (request, resposne) => {
    const requestBody = request.body;
    const signature = requestBody[0].signature;
    tokenData1 = requestBody[0].tokenTransfers[0];
    tokenData2 = requestBody[0].tokenTransfers[1];

    if (requestBody[0].tokenTransfers[0].mint === 'So11111111111111111111111111111111111111112') {
        tokenData1 = requestBody[0].tokenTransfers[1];
        tokenData2 = requestBody[0].tokenTransfers[0];
    }

    if (tokenLogs.includes(signature)) {
        return;
    }

    // tokenLogs.push(signature);

    console.log("****************************************************************/")
    console.log("Signature: ", `https://solscan.io/tx/${signature}`)
    console.log('Mint: ', tokenData1.mint);
    console.log('SOL Invested: ', tokenData1.tokenAmount);
    console.log('Dexscreener: ', `https://dexscreener.com/solana/${tokenData1.mint}`);
    console.log("****************************************************************/", "\n");


    // console.log("response", requestBody);
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
