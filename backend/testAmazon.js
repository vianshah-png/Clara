import { createAmazonPurchase } from './amazonService.js';

/**
 * Amazon Fresh API Dry-Run Test
 * This script validates our payload structure against the provided API spec.
 */

async function runTest() {
  console.log('--- STARTING AMAZON FRESH API TEST ---');

  const testItems = [
    {
      sku: "B00OATS-001",
      qty: "500",
      unit: "GRAMS",
      upc: "041234567890"
    },
    {
      sku: "B00GHEE-002",
      qty: "1",
      unit: "COUNT",
      upc: "071234567891"
    }
  ];

  const result = await createAmazonPurchase(testItems);

  if (result.success) {
    console.log('✅ TEST SUCCESSFUL: Purchase record accepted.');
    console.log('Transaction ID:', result.data?.transactionId || 'N/A');
  } else {
    console.log('❌ TEST FAILED: Connection or Validation error.');
    console.log('Error Details:', JSON.stringify(result.error, null, 2));
    
    console.log('\n--- PAYLOAD SENT FOR DEBUGGING ---');
    console.log(JSON.stringify(result.payload_sent, null, 2));
  }
}

runTest();
