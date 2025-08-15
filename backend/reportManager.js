class ReportManager {
  /**
   * Enriches a map of client data with additional details based on provided options.
   * @param {object} clientsData - The report configuration object, typically from `generateClientReport`.
   * @param {object} [options={}] - Options to control data enrichment.
   * @returns {object} The enriched map of ClientProductRelationAnalysis objects.
   */
  static _generateDetailedClientMarginReport(clientsData, options = {}) {
    const { flagAnomalies = true, productDetails = false } = options;

    const clientMarginMap =
      ReaderService.getPartialClientMarginMap(clientsData);

    // Check the number of keys in the returned map.
    if (Object.keys(clientMarginMap).length === 0) {
      throw new Error(
        "No client data found for the report based on the provided criteria."
      );
    }

    if (flagAnomalies && !productDetails) {
      this._flagProductAnomalies(clientMarginMap);
      return {
        clientMarginMap,
        hasAnomalies: true,
        hasDetails: false,
      };
    }

    if (productDetails && !flagAnomalies) {
      this._addProductDetails(clientMarginMap);
      return {
        clientMarginMap,
        hasAnomalies: false,
        hasDetails: true,
      };
    }

    if (productDetails && flagAnomalies) {
      this._addProductDetails(clientMarginMap);
      this._flagProductAnomalies(clientMarginMap);
      return {
        clientMarginMap,
        hasAnomalies: true,
        hasDetails: true,
      };
    }

    if (!productDetails && !flagAnomalies) {
      return {
        clientMarginMap,
        hasAnomalies: false,
        hasDetails: false,
      };
    }
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
    for (const [uuid, data] of Object.entries(
      allAnomalies.INTERNAL_PRODUCTION_NO_COST
    )) {
      anomalyLookup[uuid] = {
        text: `Prodotto interno con costo fisso manuale di ${data.COST}€`,
        type: "INTERNAL_PRODUCTION",
      };
    }

    // Process erroneous UUID usage anomalies
    for (const [uuid, data] of Object.entries(
      allAnomalies.ERRONEOUS_UUID_USED
    )) {
      anomalyLookup[uuid] = {
        text: data.ANOMALY_TEXT,
        type: "ERRONEOUS_UUID",
      };
    }

    // Process unknown price anomalies
    for (const [uuid, data] of Object.entries(
      allAnomalies.UNKNOWN_PRICE_ANOMALY
    )) {
      anomalyLookup[uuid] = {
        text: data.ANOMALY_TEXT,
        type: "UNKNOWN_PRICE",
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

  static _addProductDetails(clientMarginMap) {
    for (const client of Object.values(clientMarginMap)) {
      // Add a new property to the existing client object.
      client.productDetails = [];
      for (const product of Object.values(client.productsMap)) {
        client.productDetails.push({
          uuid: product.uuid,
          margin: product.margin,
        });
      }
    }
  }

  static writeReportToSheet(clientMarginMap, options = {}) {
    const targetSheet = INVOKE_SHEET().REPORT_PAGE;
    targetSheet.clear();
    let { trackAnomalies = true, trackDetails = true } = options;

    const headers = ["Client UUID", "Margin", "Has Anomaly", "Anomaly Text"];
    let marginReportData = null;

    let writerArray = [[...headers]];
    if (!options.trackAnomalies && !options.trackDetails) {
      marginReportData =
        this._generateDetailedClientMarginReport(clientMarginMap, { flagAnomalies: false, productDetails: false });
    } else if (options.trackAnomalies && !options.trackDetails) {
      marginReportData =
        this._generateDetailedClientMarginReport(clientMarginMap, { flagAnomalies: true, productDetails: false });
    } else if (!options.trackAnomalies && options.trackDetails) {
      marginReportData =
        this._generateDetailedClientMarginReport(clientMarginMap, { flagAnomalies: false, productDetails: true });
    } else if (options.trackAnomalies && options.trackDetails) {
      marginReportData =
        this._generateDetailedClientMarginReport(clientMarginMap, { flagAnomalies: true, productDetails: true });
    }
  }
}
