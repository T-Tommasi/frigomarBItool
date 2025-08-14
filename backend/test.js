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

/**
 * Tests the ReportManager._addProductDetails private method to ensure it correctly
 * mutates the client map to include product margin details.
 */
function runAddProductDetailsTest() {
    Logger.log('--- Running ReportManager._addProductDetails Test ---');
    let passed = 0;
    let totalTests = 0;

    try {
        // --- 1. ARRANGE ---
        // Create a mock clientMarginMap. These are simplified objects for the test.
        const mockClientMarginMap = {
            '101': {
                uuid: '101',
                name: 'Test Client A',
                productsMap: {
                    'P01': { uuid: 'P01', margin: 100 },
                    'P02': { uuid: 'P02', margin: 150 }
                }
            },
            '102': {
                uuid: '102',
                name: 'Test Client B',
                productsMap: {
                    'P03': { uuid: 'P03', margin: -20 }
                }
            }
        };

        // --- 2. ACT ---
        // Call the private static method to test its logic directly.
        ReportManager._addProductDetails(mockClientMarginMap);

        // --- 3. ASSERT ---
        totalTests++;
        const clientA = mockClientMarginMap['101'];
        if (clientA.productDetails && Array.isArray(clientA.productDetails) && clientA.productDetails.length === 2 && clientA.productDetails[1].margin === 150) {
            Logger.log('✅ PASS: Client A was mutated correctly with productDetails.');
            passed++;
        } else {
            Logger.log('❌ FAIL: Client A was not mutated correctly.');
            Logger.log('   L Received: ' + JSON.stringify(clientA));
        }

    } catch (e) {
        Logger.log(`❌ CRITICAL FAIL: The function threw an unexpected error: ${e.stack}`);
    } finally {
        Logger.log(`--- Test Complete. ${passed}/${totalTests} tests passed. ---`);
    }
}

/**
 * Tests the data enrichment logic within the ReportManager class, specifically
 * the _flagProductAnomalies and _addProductDetails methods.
 */
function runReportManagerTest() {
    Logger.log('--- Running ReportManager Enrichment Logic Test ---');
    let passed = 0;
    let totalTests = 0;

    try {
        // --- 1. ARRANGE ---
        // Create a mock map that resembles the output of ReaderService.getPartialClientMarginMap
        const mockClientMarginMap = {
            'client1': {
                uuid: 'client1',
                productsMap: {
                    'normalProd': { uuid: 'normalProd', margin: 50 },
                    // This product UUID is in the HARDCODED_ANOMALIES list
                    'SC022': { uuid: 'SC022', margin: 100 }
                }
            },
            'client2': {
                uuid: 'client2',
                productsMap: {
                    // This product UUID has a different type of anomaly
                    'BR014': { uuid: 'BR014', margin: -20 }
                }
            }
        };

        // --- 2. ACT ---
        // Run the private methods directly to test their logic.
        // This is a pragmatic approach in Apps Script where mocking dependencies is complex.
        ReportManager._flagProductAnomalies(mockClientMarginMap);
        ReportManager._addProductDetails(mockClientMarginMap);

        // --- 3. ASSERT ---
        const client1 = mockClientMarginMap['client1'];
        const client2 = mockClientMarginMap['client2'];

        // Test 1: Anomaly flagging
        totalTests++;
        const anomalyProduct = client1.productsMap['SC022'];
        if (anomalyProduct.hasAnomaly === true && typeof anomalyProduct.anomalyText === 'string') {
            Logger.log('✅ PASS: Correctly flagged a product with an anomaly.');
            passed++;
        } else {
            Logger.log('❌ FAIL: Did not correctly flag an anomalous product.');
        }

        // Test 2: Product details addition
        totalTests++;
        if (Array.isArray(client2.productDetails) && client2.productDetails.length === 1 && client2.productDetails[0].margin === -20) {
            Logger.log('✅ PASS: Correctly added product details to a client object.');
            passed++;
        } else {
            Logger.log('❌ FAIL: Did not correctly add product details.');
            Logger.log('   L Received: ' + JSON.stringify(client2));
        }

    } catch (e) {
        Logger.log(`❌ CRITICAL FAIL: The test threw an unexpected error: ${e.stack}`);
    } finally {
        Logger.log(`--- Test Complete. ${passed}/${totalTests} tests passed. ---`);
    }
}
