class ReaderService {
  static readAnalysisDb() {
    const rawData = this._readProductIncomeData();
    if (!rawData) return null;

    const productMap = this._buildProductMap(rawData.data, rawData.headerMap);
    const negativeIncomeProductMap = this._identifyNegativeIncomeProducts(productMap);

    return { productMap, negativeIncomeProductMap };
  }

  static readClientMarginDb() {
    const rawData = this._readProductIncomeData();
    if (!rawData) return null;

    const clientMap = this._buildClientMap(rawData.data, rawData.headerMap);
    const negativeIncomeClientMap = this._identifyHighRiskClients(clientMap);

    return { clientMap, negativeIncomeClientMap };
  }

  static getClientSummaryData(options = {}) {
    const { sortby = 'totalDue', limit = null } = options;

    try {
      const clientSheet = INVOKE_SHEET().CLIENTS;
      const clientObject = ETLService.buildMapFromDbSheet(clientSheet);
      const clients = Object.values(clientObject);

      const summaryData = this._processSummaryData(clients);
      const sortedData = this._sortSummaryData(summaryData, sortby);

      return limit ? sortedData.slice(0, limit) : sortedData;

    } catch (e) {
      Logger.log("!!! CRITICAL ERROR in getClientSummaryData: " + e.stack);
      throw new Error("Si è verificato un errore critico durante l'aggregazione dei dati.");
    }
  }

  static _readProductIncomeData() {
    const source = INVOKE_SHEET().PRODUCT_INCOME;
    const data = source.getDataRange().getValues();

    if (data.length < 2) {
      Logger.log(`ERROR: Insufficient data rows. Expected >= 2, got ${data.length}`);
      return null;
    }

    const headers = data.shift();
    const headerMap = Utilities.createHeaderMap(headers);

    return { data, headerMap };
  }

  static _buildProductMap(data, headerMap) {
    const productMap = {};
    const today = new Date();
    const debugUUIDs = ['GA091', 'CP009', 'SL015', 'SP021', 'MN091', 'SC022', 'CA028', 'BT003', 'GL030', 'SO092'];

    for (const row of data) {
      const productUUID = row[headerMap['UUID origine']];
      const clientUUID = row[headerMap['UUID']];

      if (debugUUIDs.includes(productUUID)) {
        Logger.log(`
                    Type: Array,
                    Origin: ReaderService.readAnalysisDbProduct,
                    Status: Reading row for product ${productUUID},
                    Content: ${JSON.stringify(row)}
                `);
      }

      if (!productUUID || !clientUUID || String(clientUUID).trim() === '') {
        continue;
      }

      if (!productMap[productUUID]) {
        productMap[productUUID] = new productMarginAnalysis(
          productUUID,
          row[headerMap['Nome prodotto']],
          0, 0, 0, 0,
          today
        );
      }

      const product = productMap[productUUID];

      if (product.clients[clientUUID]) {
        continue;
      }

      this._processProductClient(product, row, headerMap, clientUUID);
    }

    this._calculateProductMetrics(productMap);
    return productMap;
  }

  static _processProductClient(product, row, headerMap, clientUUID) {
    const soldQuantity = Math.ceil(Number(row[headerMap['Q.tà Vend.']]) || 0);
    const percentage = Number(row[headerMap['Percentuale']]) || 0;
    const saleIncome = SanitizationServices.sanitizeMoney(row[headerMap['Val. Vend.']]);
    const saleOriginValue = SanitizationServices.sanitizeMoney(row[headerMap['Val. Costo']]);
    const margin = saleIncome - saleOriginValue;

    product.clients[clientUUID] = new ProductClientRelationAnalysis(
      clientUUID,
      row[headerMap['Nominativo']],
      soldQuantity,
      saleOriginValue,
      saleIncome,
      percentage,
      margin
    );

    product.totalSold += soldQuantity;
    product.saleIncome += saleIncome;
    product.totalCost += saleOriginValue;
  }

  static _calculateProductMetrics(productMap) {
    for (const product of Object.values(productMap)) {
      product.margin = product.saleIncome - product.totalCost;
      product.percentageIncome = product.saleIncome > 0
        ? (product.margin / product.saleIncome) * 100
        : 0;
    }
  }

  static _identifyNegativeIncomeProducts(productMap) {
    const negativeIncomeProductMap = {};

    for (const product of Object.values(productMap)) {
      if (product.saleIncome <= 0) {
        Logger.log(`WARNING: Product ${product.uuid} has negative/zero income: ${product.saleIncome}`);
        negativeIncomeProductMap[product.uuid] = product;
      }
    }

    return negativeIncomeProductMap;
  }

  static _buildClientMap(data, headerMap) {
    const clientMap = {};

    for (const row of data) {
      const clientUUID = row[headerMap['UUID']];
      const productUUID = row[headerMap['UUID origine']];

      if (!clientUUID || !productUUID || String(clientUUID).trim() === '') {
        continue;
      }

      if (!clientMap[clientUUID]) {
        const clientName = row[headerMap['Nominativo']];
        const parseDate = new Date(row[headerMap['Data Estrazione']]);
        clientMap[clientUUID] = new ClientProductRelationAnalysis(clientUUID, clientName, parseDate);
      }

      const client = clientMap[clientUUID];

      if (client.productsMap[productUUID]) {
        continue;
      }

      this._processClientProduct(client, row, headerMap, productUUID);
    }

    this._calculateClientMetrics(clientMap);
    return clientMap;
  }

  static _processClientProduct(client, row, headerMap, productUUID) {
    const productName = row[headerMap['Nome prodotto']];
    const productSoldAmount = Number(row[headerMap['Q.tà Vend.']]) || 0;
    const revenue = SanitizationServices.sanitizeMoney(row[headerMap['Val. Vend.']]);
    const cost = SanitizationServices.sanitizeMoney(row[headerMap['Val. Costo']]);

    client.productsMap[productUUID] = new ClientMappedProduct(
      productUUID,
      productName,
      client.uuid,
      productSoldAmount,
      cost,
      revenue,
      client.parseDate
    );
  }

  static _calculateClientMetrics(clientMap) {
    for (const client of Object.values(clientMap)) {
      client.calculateMetrics();
    }
  }

  static _identifyHighRiskClients(clientMap) {
    const negativeIncomeClientMap = {};

    for (const client of Object.values(clientMap)) {
      if (client.isHighRisk) {
        negativeIncomeClientMap[client.uuid] = client;
      }
    }

    return negativeIncomeClientMap;
  }

  static _processSummaryData(clients) {
    const summaryData = [];

    for (const client of clients) {
      const totalDue = client.totalLeftToPay();

      if (totalDue > 0) {
        summaryData.push({
          clientName: client.name,
          clientId: client.uuid,
          invoiceCount: client.invoices.length,
          totalDue: totalDue,
          totalPaid: client.totalPaid(),
          totalOverdue: client.totalOverdue()
        });
      }
    }

    return summaryData;
  }

  static _sortSummaryData(summaryData, sortby) {
    return summaryData.sort((a, b) => b[sortby] - a[sortby]);
  }

  static _getLastNColumnValues(sourceSheet, columnIndex, numRowsToRead) {
    const lastRow = sourceSheet.getLastRow();

    if (lastRow < 2) {
      return [];
    }

    const startRow = Math.max(2, lastRow - numRowsToRead + 1);
    const numRows = lastRow - startRow + 1;

    return sourceSheet.getRange(startRow, columnIndex, numRows, 1).getValues();
  }
}
