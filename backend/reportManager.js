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
 * @param {boolean} [options.trackAnomalies=true] - Whether to track and highlight anomalies.
 * @param {boolean} [options.trackDetails=true] - Whether to include product details.
 *
 * @throws {Error} If the target sheet or data preparation fails.
 */

static writeReportToSheet(clientMarginMap, options = {}) {
  const { trackAnomalies = true } = options;
  const targetSheet = INVOKE_SHEET().REPORT_PAGE;
  const writerArray = this._prepareWriteArray(clientMarginMap, options);

  targetSheet.clear();

  const dataRange = targetSheet.getRange(1, 1, writerArray.length, writerArray[0].length);
  dataRange.setValues(writerArray);

  // Header formatting
  const headerRange = targetSheet.getRange(1, 1, 1, writerArray[0].length);
  headerRange
    .setBackground("#4d4d4d")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  
  targetSheet.setFrozenRows(1);

  // Alternating row colors and anomaly highlighting
  const anomalyColumnIndex = trackAnomalies ? writerArray[0].length - 1 : -1;
  
  for (let i = 2; i <= writerArray.length; i++) {
    const rowRange = targetSheet.getRange(i, 1, 1, writerArray[0].length);
    const isEvenRow = (i % 2 === 0);
    
    rowRange.setBackground(isEvenRow ? "#f3f3f3" : "#ffffff");

    // Highlight anomalies if tracking is enabled
    if (trackAnomalies && anomalyColumnIndex !== -1) {
      const anomalyValue = writerArray[i - 1][anomalyColumnIndex];
      
      if (anomalyValue && anomalyValue.trim() !== '') {
        rowRange.setFontWeight("bold");
        const anomalyCell = targetSheet.getRange(i, anomalyColumnIndex + 1);
        anomalyCell.setBackground("#ffe6e6");
      }
    }
  }
  
  // Auto-resize columns
  for (let col = 1; col <= writerArray[0].length; col++) {
    targetSheet.autoResizeColumn(col);
  }
}
}



