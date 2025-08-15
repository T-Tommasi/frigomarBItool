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

    if (Object.keys(clientMarginMap).length === 0) {
      throw new Error(
        "No client data found for the report based on the provided criteria."
      );
    }

    if (flagAnomalies) {
      this._flagProductAnomalies(clientMarginMap);
    }

    if (productDetails) {
      this._addProductDetails(clientMarginMap);
    }

    return {
      clientMarginMap,
      hasAnomalies: flagAnomalies,
      hasDetails: productDetails,
    };
  }

  /**
   * @private
   * Iterates through a client map and flags products with known anomalies.
   * This method mutates the clientMarginMap object.
   * @param {object} clientMarginMap - A map of ClientProductRelationAnalysis objects.
   */
  static _flagProductAnomalies(clientMarginMap) {
    const allAnomalies = HARDCODED_ANOMALIES();
    const anomalyLookup = {};

    const anomalyConfigs = {
      INTERNAL_PRODUCTION: {
        source: allAnomalies.INTERNAL_PRODUCTION_NO_COST,
        textFn: (data) =>
          `Prodotto interno con costo fisso manuale di ${data.COST}€`,
      },
      ERRONEOUS_UUID: {
        source: allAnomalies.ERRONEOUS_UUID_USED,
        textFn: (data) => data.ANOMALY_TEXT,
      },
      UNKNOWN_PRICE: {
        source: allAnomalies.UNKNOWN_PRICE_ANOMALY,
        textFn: (data) => data.ANOMALY_TEXT,
      },
    };

    for (const [type, config] of Object.entries(anomalyConfigs)) {
      for (const [uuid, data] of Object.entries(config.source)) {
        anomalyLookup[uuid] = {
          text: config.textFn(data),
          type,
        };
      }
    }

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

  static _prepareWriteArray(clientMarginMap, options = {}) {
    const { trackAnomalies = true, trackDetails = true } = options;

    const headers = ["Client UUID", "Client Margin"];
    if (trackDetails) {
      headers.push("Product UUID", "Product Margin");
    }
    if (trackAnomalies) {
      headers.push("Anomaly Text");
    }

    const writerArray = [headers];

    const marginReportData = this._generateDetailedClientMarginReport(
      clientMarginMap,
      {
        flagAnomalies: trackAnomalies,
        productDetails: trackDetails,
      }
    );

    for (const client of Object.values(marginReportData.clientMarginMap)) {
      client.calculateMetrics();

      if (trackDetails) {
        for (const product of Object.values(client.productsMap)) {
          const row = [client.uuid, client.margin, product.uuid, product.margin];
          if (trackAnomalies) {
            row.push(product.anomalyText || "");
          }
          writerArray.push(row);
        }
      } else {
        const row = [client.uuid, client.margin];
        if (trackAnomalies) {
          const clientAnomalies = Object.values(client.productsMap)
            .filter((p) => p.hasAnomaly)
            .map((p) => p.anomalyText)
            .join(", ");
          row.push(clientAnomalies || "");
        }
        writerArray.push(row);
      }
    }
    return writerArray;
  }

/**
 * Writes a report to the designated sheet, formatting headers, alternating row colors,
 * highlighting anomalies, and auto-resizing columns for readability.
 *
 * @param {Object} clientMarginMap - The data map containing client margin information to be written to the sheet.
 * @param {Object} [options={}] - Optional settings to customize report generation.
 * @param {Object} options.<key> - Additional options passed to _prepareWriteArray (see implementation for details).
 *
 * @throws {Error} If the target sheet or data preparation fails.
 *
 * @example
 * ReportManager.writeReportToSheet(clientMarginMap, { filter: 'active' });
 */
  static writeReportToSheet(clientMarginMap, options = {}) {
    const targetSheet = INVOKE_SHEET().REPORT_PAGE;
    const writerArray = this._prepareWriteArray(clientMarginMap, options);

    // Clear previous content and formatting
    targetSheet.clear();

    const dataRange = targetSheet.getRange(1, 1, writerArray.length, writerArray[0].length);
    dataRange.setValues(writerArray);

    // Header formatting
    const headerRange = targetSheet.getRange(1, 1, 1, writerArray[0].length);
    headerRange
      .setBackground("#4d4d4d") // A dark grey color
      .setFontColor("#ffffff") // White text
      .setFontWeight("bold");
    targetSheet.setFrozenRows(1);

    // Alternating row colors and anomaly highlighting
    const anomalyColumnIndex = writerArray[0].indexOf("Anomaly Text");
    for (let i = 1; i < writerArray.length; i++) {
      const rowRange = targetSheet.getRange(i + 1, 1, 1, writerArray[0].length);
      if (i % 2 === 0) {
        rowRange.setBackground("#f3f3f3"); // Very light grey
      } else {
        rowRange.setBackground("#ffffff"); // White
      }

      // Bold anomalies
      if (anomalyColumnIndex !== -1 && writerArray[i][anomalyColumnIndex]) {
        rowRange.setFontWeight("bold");
      }
    }
    
    // Auto-resize columns for better readability
    for (let i = 1; i <= writerArray[0].length; i++) {
      targetSheet.autoResizeColumn(i);
    }
  }
}



