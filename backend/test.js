/**
 * Test suite for backend data processing functions.
 * To run, select a test function from the dropdown in the Apps Script editor and click "Run".
 */

/**
 * Tests the ReaderService.readClientMarginDb function to ensure it correctly
 * aggregates transaction data into a client-centric map.
 */
function runClientMarginAnalysisTest() {
    Logger.log('--- Running Client Margin Analysis Test ---');
    let passed = 0;
    let totalTests = 0;

    try {
        // --- 1. ACT ---
        // Call the function we want to test
        const result = ReaderService.readClientMarginDb();

        // --- 2. ASSERT ---
        // A series of checks to validate the result

        // Test 1: Correct data structure
        totalTests++;
        if (result && typeof result.clientMap === 'object' && typeof result.negativeIncomeClientMap === 'object') {
            Logger.log('✅ PASS: Function returned the correct top-level structure.');
            passed++;
        } else {
            Logger.log('❌ FAIL: Function did not return the expected { clientMap, negativeIncomeClientMap } object.');
            Logger.log('--- TEST HALTED ---');
            return;
        }

        const clients = Object.values(result.clientMap);

        // Test 2: Data processing
        totalTests++;
        if (clients.length > 0) {
            Logger.log(`✅ PASS: Successfully processed ${clients.length} unique clients.`);
            passed++;
        } else {
            Logger.log('⚠️ WARN: No clients were processed. The clientMap is empty. (This may be expected if the source sheet is empty).');
        }

        // Test 3: Integrity of a sample client object
        if (clients.length > 0) {
            totalTests++;
            const sampleClient = clients[0]; // Get the first client for inspection
            if (sampleClient.uuid && sampleClient.name && typeof sampleClient.totalMargin === 'number' && typeof sampleClient.productsMap === 'object') {
                Logger.log('✅ PASS: Sample client object has the correct properties and data types.');
                passed++;
                
                // Log a sample of the data for visual inspection
                const sampleForLog = {
                    uuid: sampleClient.uuid,
                    name: sampleClient.name,
                    totalMargin: sampleClient.totalMargin,
                    marginPercentage: sampleClient.marginPercentage.toFixed(2) + '%',
                    isHighRisk: sampleClient.isHighRisk,
                    productsCount: Object.keys(sampleClient.productsMap).length
                };
                Logger.log('   L Sample Data: ' + JSON.stringify(sampleForLog, null, 2));

            } else {
                Logger.log('❌ FAIL: Sample client object is missing properties or has incorrect data types.');
                Logger.log('   L Received: ' + JSON.stringify(sampleClient));
            }
        }
        
    } catch (e) {
        Logger.log(`❌ CRITICAL FAIL: The function threw an unexpected error.`);
        Logger.log(e.stack);
    } finally {
        Logger.log(`--- Test Complete. ${passed}/${totalTests} tests passed. ---`);
    }
}