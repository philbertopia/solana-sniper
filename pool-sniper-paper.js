const express = require('express');
const axios = require('axios');

const app = express();
const port = 3000;
const tokenLogs = [];

// Paper Trading Settings
const MIN_SOL_LIQUIDITY = 1;
const MIN_TOKEN_LIQUIDITY = 100000;
const PAPER_TRADE_AMOUNT = 0.1; // SOL to simulate trading with
const SELL_DELAY = 180000; // 3 minutes

// Track paper trading performance
let paperTradingStats = {
    totalTrades: 0,
    successfulTrades: 0,
    failedTrades: 0,
    totalProfit: 0,
    bestTrade: 0,
    worstTrade: 0,
    trades: []
};

async function executePaperTrade(tokenMint, initialPrice) {
    try {
        const tradeId = paperTradingStats.totalTrades + 1;
        console.log(`\n📝 PAPER TRADE #${tradeId} STARTED:`);
        console.log(`• Token: ${tokenMint}`);
        console.log(`• Entry Price: ${initialPrice.toFixed(9)} SOL`);
        
        // Calculate entry
        const tokensReceived = PAPER_TRADE_AMOUNT * (1 / initialPrice);
        console.log(`• Paper Buying ${PAPER_TRADE_AMOUNT} SOL worth`);
        console.log(`• Tokens Received: ${tokensReceived.toLocaleString()}`);

        // Store trade start info
        const trade = {
            id: tradeId,
            token: tokenMint,
            entryTime: new Date(),
            entryPrice: initialPrice,
            tokensReceived: tokensReceived,
            solInvested: PAPER_TRADE_AMOUNT,
            status: 'PENDING'
        };

        paperTradingStats.trades.push(trade);
        paperTradingStats.totalTrades++;
        
        // Set up delayed sell simulation
        setTimeout(async () => {
            try {
                // Get exit price from Jupiter
                const jupiterPrice = await axios.get(`https://price.jup.ag/v4/price?ids=${tokenMint}`);
                const exitPrice = jupiterPrice.data.data[tokenMint]?.price || initialPrice;
                
                // Calculate results
                const solReceived = tokensReceived * exitPrice;
                const profit = solReceived - PAPER_TRADE_AMOUNT;
                const percentReturn = ((profit/PAPER_TRADE_AMOUNT) * 100);
                
                // Update trade record
                trade.exitTime = new Date();
                trade.exitPrice = exitPrice;
                trade.profit = profit;
                trade.percentReturn = percentReturn;
                trade.status = 'COMPLETED';

                // Update stats
                paperTradingStats.totalProfit += profit;
                if (profit > 0) paperTradingStats.successfulTrades++;
                else paperTradingStats.failedTrades++;
                
                if (profit > paperTradingStats.bestTrade) paperTradingStats.bestTrade = profit;
                if (profit < paperTradingStats.worstTrade) paperTradingStats.worstTrade = profit;

                // Log results
                console.log(`\n📊 PAPER TRADE #${tradeId} COMPLETED:`);
                console.log(`• Exit Price: ${exitPrice.toFixed(9)} SOL`);
                console.log(`• SOL Received: ${solReceived.toFixed(4)} SOL`);
                console.log(`• Profit/Loss: ${profit.toFixed(4)} SOL ($${(profit * 30).toFixed(2)})`);
                console.log(`• Return: ${percentReturn.toFixed(2)}%`);
                
                // Log overall performance
                console.log('\n📈 OVERALL PERFORMANCE:');
                console.log(`• Total Trades: ${paperTradingStats.totalTrades}`);
                console.log(`• Successful Trades: ${paperTradingStats.successfulTrades}`);
                console.log(`• Failed Trades: ${paperTradingStats.failedTrades}`);
                console.log(`• Total Profit: ${paperTradingStats.totalProfit.toFixed(4)} SOL ($${(paperTradingStats.totalProfit * 30).toFixed(2)})`);
                console.log(`• Best Trade: ${paperTradingStats.bestTrade.toFixed(4)} SOL`);
                console.log(`• Worst Trade: ${paperTradingStats.worstTrade.toFixed(4)} SOL`);
                console.log(`• Win Rate: ${((paperTradingStats.successfulTrades/paperTradingStats.totalTrades) * 100).toFixed(2)}%`);
                
            } catch (error) {
                trade.status = 'FAILED';
                console.error(`Error completing paper trade #${tradeId}:`, error.message);
            }
        }, SELL_DELAY);

    } catch (error) {
        console.error('Error executing paper trade:', error.message);
    }
}

app.use(express.json());

app.post('/webhook', async (request, response) => {
    try {
        const requestBody = request.body;
        const signature = requestBody[0].signature;
        let tokenData1 = requestBody[0].tokenTransfers[0];

        if (tokenLogs.includes(signature)) {
            return;
        }

        // Handle SOL transfers
        if (tokenData1.mint === 'So11111111111111111111111111111111111111112') {
            tokenData1 = requestBody[0].tokenTransfers[1];
        }

        // Only process CREATE_POOL transactions
        if (requestBody[0].type === "CREATE_POOL") {
            const solTransfer = requestBody[0].tokenTransfers.find(t => 
                t.mint === 'So11111111111111111111111111111111111111112'
            );
            const tokenTransfer = requestBody[0].tokenTransfers.find(t => 
                t.mint !== 'So11111111111111111111111111111111111111112'
            );

            const initialSolLiquidity = solTransfer.tokenAmount;
            const initialTokenLiquidity = tokenTransfer.tokenAmount;
            const priceInSOL = solTransfer.tokenAmount / tokenTransfer.tokenAmount;

            console.log("\n🔍 NEW POOL DETECTED:");
            console.log(`• Token: ${tokenTransfer.mint}`);
            console.log(`• Initial SOL: ${initialSolLiquidity} SOL`);
            console.log(`• Initial Tokens: ${initialTokenLiquidity}`);
            console.log(`• Initial Price: ${priceInSOL.toFixed(9)} SOL`);

            // Check if pool meets criteria
            if (initialSolLiquidity >= MIN_SOL_LIQUIDITY && 
                initialTokenLiquidity >= MIN_TOKEN_LIQUIDITY) {
                console.log('✅ POOL MEETS CRITERIA - STARTING PAPER TRADE');
                await executePaperTrade(tokenTransfer.mint, priceInSOL);
            } else {
                console.log('❌ POOL DOES NOT MEET CRITERIA');
            }
        }

        tokenLogs.push(signature);
        response.status(200).send('Webhook processed');

    } catch (error) {
        console.error('Error processing webhook:', error);
        response.status(500).send('Error processing webhook');
    }
});

// Add endpoint to get trading stats
app.get('/stats', (req, res) => {
    res.json(paperTradingStats);
});

app.listen(port, () => {
    console.log(`🚀 Paper Trading Bot Started`);
    console.log(`Strategy Settings:`);
    console.log(`• Minimum SOL Liquidity: ${MIN_SOL_LIQUIDITY} SOL`);
    console.log(`• Minimum Token Liquidity: ${MIN_TOKEN_LIQUIDITY} tokens`);
    console.log(`• Paper Trade Amount: ${PAPER_TRADE_AMOUNT} SOL`);
    console.log(`• Sell Delay: 3 minutes`);
    console.log(`\nTracking performance at http://localhost:${port}/stats\n`);
});
