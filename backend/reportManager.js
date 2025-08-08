class ReportManager {
    static generateDetailedClientMarginReport(clientsData, options = {}) {
        const {
            flagAnomalies = true,
            productDetails = false, // This option is available but not yet implemented in the logic below.
        } = options;

        // ReaderService.getPartialClientMarginMap returns a map (object), not an array.
        const clientMarginMap = ReaderService.getPartialClientMarginMap(clientsData);

        // Check the number of keys in the returned map.
        if (Object.keys(clientMarginMap).length === 0) {
            // Use the standard Error constructor and provide a more professional message.
            throw new Error('No client data found for the report based on the provided criteria.');
        }

        if (flagAnomalies) {
            this._flagProductAnomalies(clientMarginMap);
        }
        if (productDetails) {
            this._addProductDetails(clientMarginMap);
        }

        return clientMarginMap;
    }

    /**
     * @private
     * Iterates through a client map and flags products with known anomalies.
     * This method mutates the clientMarginMap object.
     * @param {object} clientMarginMap - A map of ClientProductRelationAnalysis objects.
     */
    static _flagProductAnomalies(clientMarginMap) {
        // 1. Create a unified, efficient lookup map for all anomalies.
        const allAnomalies = HARDCODED_ANOMALIES();
        const anomalyLookup = {};

        // Process internal production anomalies
        for (const [uuid, data] of Object.entries(allAnomalies.INTERNAL_PRODUCTION_NO_COST)) {
            anomalyLookup[uuid] = {
                text: `Prodotto interno con costo fisso manuale di ${data.COST}€`,
                type: 'INTERNAL_PRODUCTION'
            };
        }

        // Process erroneous UUID usage anomalies
        for (const [uuid, data] of Object.entries(allAnomalies.ERRONEOUS_UUID_USED)) {
            anomalyLookup[uuid] = {
                text: data.ANOMALY_TEXT,
                type: 'ERRONEOUS_UUID'
            };
        }

        // Process unknown price anomalies
        for (const [uuid, data] of Object.entries(allAnomalies.UNKNOWN_PRICE_ANOMALY)) {
            anomalyLookup[uuid] = {
                text: data.ANOMALY_TEXT,
                type: 'UNKNOWN_PRICE'
            };
        }

        // 2. Iterate through clients and their products to flag anomalies.
        for (const client of Object.values(clientMarginMap)) {
            for (const product of Object.values(client.productsMap)) {
                const anomaly = anomalyLookup[product.uuid];
                if (anomaly) {
                    product.hasAnomaly = true;
                    product.anomalyText = anomaly.text;
                }
            }
        }
    }
    /**
     * @private
     * Iterates through a client map and displays product margin details.
     * This method mutates the clientMarginMap object.
     * @param {object} clientMarginMap - A map of ClientProductRelationAnalysis objects.
     */
    
    _addProductDetails(clientMarginMap) {
        let detailedClientMarginManp = {};

        for (const client of Object.values(clientMarginMap)) {
            detailedClientMarginMap[client.id] = {
                products: []
            };
            for (const product of Object.values(client.productsMap)) {
                detailedClientMarginMap[client.id].products.push({
                    uuid: product.uuid,
                    margin: product.margin,
                    hasAnomaly: product.hasAnomaly,
                    anomalyText: product.anomalyText
                });
            }
        }
        // This method is not yet implemented.
        // Placeholder for future implementation.
        throw new Error('Product details feature is not yet implemented.');
    }
}