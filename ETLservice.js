class ETLService {
  // ==!! Abandon all hope, ye who enter here !!==

  // =================================================================
  // == PUBLIC METHODS
  // =================================================================

  static runEtl(importSheet) {
    const COLUMN = clientImporterColumn();
    const HEADER_ROWS = 1;
    const TODAY = new Date();

    const stats = {
      skippedInvoices: 0,
      skippedWrongRows: 0,
      registeredNewInvoices: 0,
      registeredNewClients: 0,
      missingDataInvoiceArray: []
    };

    const dataRange = importSheet.getRange(
      HEADER_ROWS + 1,
      COLUMN.OVERDUE_DATE_COL.SHEET,
      importSheet.getLastRow() - HEADER_ROWS,
      importSheet.getLastColumn() - COLUMN.OVERDUE_DATE_COL.SHEET + 1
    );
    const dataRaw = dataRange.getValues();
    const clientInvoicesMap = {};

    for (const row of dataRaw) {
      const clientID = this._etlClientVendorIdLogger(row[COLUMN.CLIENT_UUID.JS], stats);
      const invoiceID = this._etlInvoiceIdLogger(row[COLUMN.INVOICE_UUID.JS], stats);
      const sanitizedInvoiceDate = this._etlDateLogger(row[COLUMN.INVOICE_DATE.JS], invoiceID, stats);
      const sanitizedInvoiceOverdueDate = this._etlDateLogger(row[COLUMN.OVERDUE_DATE_COL.JS], invoiceID, stats);
      const sanitizedAmount = this._etlAmountLogger(row[COLUMN.INVOICE_AMOUNT.JS], invoiceID, stats);
      let sanitizedPaid = this._etlAmountLogger(row[COLUMN.INVOICE_PAID_AMOUNT.JS], invoiceID, stats);

      if (sanitizedInvoiceOverdueDate === "missingDate" ||
        sanitizedInvoiceDate === "missingDate" ||
        sanitizedAmount === "missingData" ||
        invoiceID === "missingData" ||
        clientID === "missingData") {
        stats.skippedWrongRows++;
        continue;
      }

      const invoiceDefinition = defineInvoiceType(sanitizedAmount);
      if (sanitizedPaid === "missingData") sanitizedPaid = 0;

      if (!clientInvoicesMap[clientID]) {
        clientInvoicesMap[clientID] = new Client(clientID, row[COLUMN.CLIENT_NAME.JS], null);
        stats.registeredNewClients++;
      }

      const client = clientInvoicesMap[clientID];
      const existingInvoice = client.invoices.find(inv => inv.uuid === invoiceID);

      if (!existingInvoice) {
        const invoice = new Invoice(
          invoiceID,
          clientID,
          sanitizedAmount,
          sanitizedInvoiceDate,
          sanitizedInvoiceOverdueDate,
          sanitizedPaid,
          invoiceDefinition,
          '',
          TODAY
        );
        client.invoices.push(invoice);
        stats.registeredNewInvoices++;
      } else {
        stats.skippedInvoices++;
      }
    }

    return { clientInvoicesMap, ...stats };
  }

  static buildMapFromDbSheet(originSheet) {
    if (!originSheet) return {};

    try {
      const dataRange = originSheet.getDataRange();
      const allData = dataRange.getValues();
      const headers = allData.shift();
      const headerMap = {};

      headers.forEach((header, index) => { headerMap[header] = index; });

      if (headerMap['Codice Cliente'] === undefined) return {};

      const clientMap = {};

      for (const row of allData) {
        let uuid;
        const sanitizedAmount = SanitizationServices.sanitizeMoney(row[headerMap['Importo Totale']]);
        const sanitizedPaid = SanitizationServices.sanitizeMoney(row[headerMap['Importo Pagato']]);

        try {
          uuid = SanitizationServices.sanitizeClientVendorId(row[headerMap['Codice Cliente']]);
        } catch (e) {
          continue;
        }

        if (!uuid) continue;

        if (!clientMap[uuid]) {
          clientMap[uuid] = new Client(
            uuid,
            row[headerMap['Nominativo Cliente']],
            row[headerMap['Agente']]
          );
        }

        const invoiceDate = new Date(row[headerMap['Data Fattura']]);
        const dueDate = new Date(row[headerMap['Data Scadenza']]);
        const invoiceTypeString = row[headerMap['Tipo Documento']];
        const today = row[headerMap['Data Estrazione']]
        const typeObject = invoiceTypeString === invoiceType().INVOICE.IT_TEXT
          ? invoiceType().INVOICE
          : invoiceType().CREDIT_NOTE;

        const newInvoice = new Invoice(
          row[headerMap['ID Fattura']],
          uuid,
          sanitizedAmount,
          invoiceDate,
          dueDate,
          sanitizedPaid,
          typeObject,
          '',
          today
        );

        clientMap[uuid].invoices.push(newInvoice);
      }

      return clientMap;

    } catch (e) {
      Logger.log('CRITICAL ERROR in buildMapFromDbSheet: ' + e.stack);
      return {};
    }
  }

  static writeToDb(targetSheet, clientInvoicesMap) {
    const schema = getClientDbHeaders();
    const headers = Utilities.HeaderSorter(schema);
    const rows = this._mapClientsToDbArray(clientInvoicesMap, schema);
    SheetWriter.write(targetSheet, [headers, rows]);
  }

  static runProductIncomeEtl(originSheet) {
    const rows = Utilities.captureAllSheetData(originSheet);
    const headers = rows.shift();
    const headerMap = Utilities.createHeaderMap(headers);
    const productMap = {};
    let lastProductUuid = null;
    const debugUUIDs = ['GA091', 'CP009', 'SL015', 'SP021', 'MN091', 'SC022', 'CA028', 'BT003', 'GL030', 'SO092'];

    //Product UUIDs with a cost of 0 (debugUUIDS) are so due to being internally produced and manually inserted with price 0 or '' (NaN)
    //TODO: Fix it.
    //Somehow.
    //Lest the whole ETL for runProductIncomeEtl goes to the bushes.

    for (const row of rows) {
      const uuid = row[headerMap["UUID"]];

      if (debugUUIDs.includes(uuid)) {
        const status = REGEX_VARIABLES().ANALYSIS_INCOME.test(uuid) ? 'Processing as Product' : `Processing as Client for ${lastProductUuid}`;
        Logger.log(`
                Type: Array,
                Origin: ETLService.runProductIncomeEtl,
                Status: ${status},
                Content: ${JSON.stringify(row)}
            `);
      }

      if (!uuid || String(uuid).trim() === "") continue;

      // Product row detection and processing
      if (REGEX_VARIABLES().ANALYSIS_INCOME.test(uuid)) {
        if (!productMap[uuid]) {
          const totalSold = row[headerMap['Q.tà Vend.']];
          if (!totalSold || isNaN(totalSold) || !isFinite(totalSold)) {
            Logger.log('product sold value is 0! set it to 0% income')
            totalSold = 0;
          };
          const sanitizedValue = SanitizationServices.sanitizeMoney(row[headerMap['Val. Vend.']]);
          const sanitizedCost = SanitizationServices.sanitizeMoney(row[headerMap['Val. Costo']]);
          const percentage = parseFloat(row[headerMap['%']]) || 0;
          if (totalSold === 0) {
            percentage = 0;
          };
          if (sanitizedCost === 0) {
            lastProductUuid = errorMessages().INVALID_PRODUCT_COST.VALUE;
            Logger.log(errorMessages('ETLService -> runProductIncomeEtl -> client loop').INVALID_PRODUCT_COST.IT_TEXT)
            continue
          }
          const dateOfExtraction = new Date();

          productMap[uuid] = new productMarginAnalysis(
            uuid,
            row[headerMap['Nominativo']],
            totalSold,
            percentage,
            sanitizedValue,
            sanitizedCost,
            dateOfExtraction,
          );
        }
        lastProductUuid = uuid;
        continue;
      }

      // Client row processing
      if (!lastProductUuid || lastProductUuid === errorMessages().INVALID_PRODUCT_COST.VALUE) {
        continue;
      };

      const currentProduct = productMap[lastProductUuid];
      const clientUuid = SanitizationServices.sanitizeClientVendorId(uuid);

      if (currentProduct.clients[clientUuid]) continue;

      const soldAmount = Number(row[headerMap['Q.tà Vend.']]);
      if (isNaN(soldAmount) || !isFinite(soldAmount)) continue;

      const sanitizedValue = SanitizationServices.sanitizeMoney(row[headerMap['Val. Vend.']]);
      const sanitizedCost = SanitizationServices.sanitizeMoney(row[headerMap['Val. Costo']]);
      const name = row[headerMap['Nominativo']];
      const margin = sanitizedValue - sanitizedCost;
      const percentage = parseFloat(row[headerMap['%']]) || 0;

      currentProduct.clients[clientUuid] = new ProducClientRelationAnalysis(
        clientUuid,
        name,
        soldAmount,
        sanitizedValue,
        margin,
        percentage
      );
    }

    return productMap;
  }

  static writeClientExport(targetSheet, map) {
    const schema = getExporterHeaderMap();
    const headers = Utilities.HeaderSorter(schema);
    const rows = this._mapClientsToExporterArray(map, schema);
    SheetWriter.write(targetSheet, [headers, ...rows]);
  }

  static mapOverdueClientsToDbArray(rawMap, headerSchema) {
    const writingArray = [];
    const schemaKeys = Object.keys(headerSchema);
    const arrayLength = schemaKeys.length;

    for (const client of Object.values(rawMap)) {
      for (const invoice of client.invoices) {
        const invoiceRow = new Array(arrayLength);

        invoiceRow[headerSchema.CLIENT_UUID.COLUMN - 1] = client.uuid;
        invoiceRow[headerSchema.CLIENT_NAME.COLUMN - 1] = client.name;
        invoiceRow[headerSchema.CLIENT_AGENT.COLUMN - 1] = client.agent;
        invoiceRow[headerSchema.INVOICE_UUID.COLUMN - 1] = invoice.uuid;
        invoiceRow[headerSchema.INVOICE_DATE.COLUMN - 1] = invoice.date;
        invoiceRow[headerSchema.INVOICE_DUE_DATE.COLUMN - 1] = invoice.dueDate;
        invoiceRow[headerSchema.INVOICE_AMOUNT.COLUMN - 1] = invoice.amount;
        invoiceRow[headerSchema.INVOICE_PAID.COLUMN - 1] = invoice.paid;
        invoiceRow[headerSchema.INVOICE_LEFT_PAY.COLUMN - 1] = invoice.leftToPay;
        invoiceRow[headerSchema.INVOICE_TYPE.COLUMN - 1] = invoice.type.IT_TEXT;
        invoiceRow[headerSchema.INVOICE_STATUS.COLUMN - 1] = invoice.status;
        invoiceRow[headerSchema.INVOICE_ISOVERDUE.COLUMN - 1] = invoice.isOverdue ? "Si" : "No";
        invoiceRow[headerSchema.INVOICE_PARSING_DATE.COLUMN - 1] = invoice.parsingDate;

        writingArray.push(invoiceRow);

      }
    }

    return writingArray;
  }

  static mapAnalysisToDbArray(productMap, schema) {
    const rows = [];
    const schemaKeys = Object.keys(schema);
    const arrayLength = schemaKeys.length;

    for (const product of Object.values(productMap)) {
      for (const client of Object.values(product.clients)) {
        const row = new Array(arrayLength);
        const costValue = client.soldValue - client.soldIncome;

        row[schema.UUID.INDEX - 1] = client.uuid;
        row[schema.UUID_VENDOR.INDEX - 1] = product.uuid;
        row[schema.NAME.INDEX - 1] = client.name;
        row[schema.SOLD_QUANTITY.INDEX - 1] = client.soldAmount;
        row[schema.SOLD_INCOME_VALUE.INDEX - 1] = client.soldValue;
        row[schema.SOLD_COST.INDEX - 1] = costValue;
        row[schema.ROI_CLIENT.INDEX - 1] = client.soldIncome;
        row[schema.PERCENTAGE_INCOME_TO_COST.INDEX - 1] = client.percentageIncome;
        row[schema.PRODUCT_NAME.INDEX - 1] = product.name;
        row[schema.PRODUCT_PARSING_DATE.INDEX - 1] = product.extractionDate;

        rows.push(row);
      }
    }

    return rows;
  }

  // =================================================================
  // == PRIVATE HELPERS
  // =================================================================

  static _mapClientsToDbArray(clientInvoiceMap, schema) {
    const rows = [];
    const schemaKeys = Object.keys(schema);
    const arrayLength = schemaKeys.length;

    for (const client of Object.values(clientInvoiceMap)) {
      for (const invoice of client.invoices) {
        const row = new Array(arrayLength);

        row[schema.CLIENT_UUID.COLUMN - 1] = client.uuid;
        row[schema.CLIENT_NAME.COLUMN - 1] = client.name;
        row[schema.CLIENT_AGENT.COLUMN - 1] = client.agent;
        row[schema.INVOICE_UUID.COLUMN - 1] = invoice.uuid;
        row[schema.INVOICE_DATE.COLUMN - 1] = invoice.date.toLocaleDateString('it-IT');
        row[schema.INVOICE_DUE_DATE.COLUMN - 1] = invoice.dueDate.toLocaleDateString('it-IT');
        row[schema.INVOICE_AMOUNT.COLUMN - 1] = invoice.amount;
        row[schema.INVOICE_PAID.COLUMN - 1] = invoice.paid;
        row[schema.INVOICE_LEFT_PAY.COLUMN - 1] = invoice.leftToPay;
        row[schema.INVOICE_TYPE.COLUMN - 1] = invoice.type.IT_TEXT;
        row[schema.INVOICE_STATUS.COLUMN - 1] = invoice.status;
        row[schema.INVOICE_ISOVERDUE.COLUMN - 1] = invoice.isOverdue ? "Si" : "No";

        rows.push(row);
      }
    }
    return rows;
  }

  static _mapClientsToExporterArray(clientInvoiceMap, schema) {
    const headers = Utilities.HeaderSorter(schema);
    const rows = [];

    for (const client of Object.values(clientInvoiceMap)) {
      for (const invoice of client.invoices) {
        const row = new Array(headers.length);

        row[schema.UUID.INDEX - 1] = client.uuid;
        row[schema.CLIENT_NAME.INDEX - 1] = client.name;
        row[schema.INVOICE_DATE.INDEX - 1] = invoice.date.toLocaleDateString('it-IT');
        row[schema.INVOICE_UUID.INDEX - 1] = invoice.uuid;
        row[schema.INVOICE_AMOUNT.INDEX - 1] = invoice.amount;
        row[schema.INVOICE_PAID_AMOUNT.INDEX - 1] = invoice.paid;
        row[schema.OVERDUE_DATE.INDEX - 1] = invoice.dueDate.toLocaleDateString('it-IT');
        row[schema.STATUS.INDEX - 1] = invoice.status;
        row[schema.INVOICED_NOTE.INDEX - 1] = invoice.invoiceNote;
        row[schema.INVOICE_PARSING_DATE - 1] = invoice.date
        rows.push(row);
      }
    }
    return rows;
  }

  static _etlDateLogger(rawDateString, invoiceUUID, stats) {
    const uuid = invoiceUUID || "missing_invoice_uuid_in_row";
    try {
      return SanitizationServices.sanitizeDate(rawDateString);
    } catch (error) {
      Logger.log(`${errorMessages("ETLService._etlDateLogger").INVALID_DATE.IT_TEXT} Invoice UUID: "${uuid}". Original: "${rawDateString}". Error: ${error.message}`);
      stats.missingDataInvoiceArray.push(uuid);
      stats.skippedInvoices += 1;
      return "missingDate";
    }
  }

  static _etlClientVendorIdLogger(uuid, stats) {
    try {
      return SanitizationServices.sanitizeClientVendorId(uuid);
    } catch (error) {
      stats.missingDataInvoiceArray.push(uuid);
      stats.skippedInvoices += 1;
      Logger.log(`Failed to sanitize ClientVendorID. UUID: "${uuid}", Error: ${error.message}`);
      return "missingData";
    }
  }

  static _etlInvoiceIdLogger(invoiceId, stats) {
    try {
      return SanitizationServices.sanitizeInvoiceId(invoiceId);
    } catch (error) {
      stats.missingDataInvoiceArray.push(invoiceId);
      stats.skippedInvoices += 1;
      Logger.log(`Failed to sanitize invoiceId. UUID: "${invoiceId}", Error: ${error.message}`);
      return "missingData";
    }
  }

  static _etlAmountLogger(rawAmount, uuid, stats) {
    const invoiceUuid = uuid || "missing_invoice_uuid_in_row";
    try {
      return SanitizationServices.sanitizeMoney(rawAmount, invoiceUuid);
    } catch (error) {
      stats.missingDataInvoiceArray.push(invoiceUuid);
      stats.skippedInvoices += 1;
      Logger.log(`${errorMessages("ETLService._etlAmountLogger").WRONG_VALUE_TYPE.IT_TEXT} Invoice UUID: "${invoiceUuid}". Original: "${rawAmount}". Error: ${error.message}`);
      return "missingData";
    }
  }
}