import { publicClient } from '../lib/public-api';

async function testPublicApi() {
    console.log('Testing Public.com API Integration...');

    try {
        console.log('\n1. Testing Stock Quote (AAPL)...');
        const quote = await publicClient.getQuote('AAPL');
        if (quote) {
            console.log('✅ Quote Success:', quote);
        } else {
            console.log('❌ Quote Failed (is API Key set?)');
        }

        console.log('\n2. Testing Option Chain (AAPL)...');
        const chain = await publicClient.getOptionChain('AAPL');
        if (chain) {
            console.log('✅ Chain Success. Expirations:', chain.expirations.length);
        } else {
            console.log('❌ Chain Failed (is API Key set?)');
        }

    } catch (e) {
        console.error('Test Failed:', e);
    }
}

testPublicApi();
