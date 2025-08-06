class Orchestrator {
  static writeToInvoiceDb() {
    const UPLOAD_SHEET = INVOKE_SHEET().CLIENTS_ETL
    const RAW_MAP = ETLService.runEtl(UPLOAD_SHEET);
    const TARGET_SHEET = INVOKE_SHEET().CLIENTS
    
    const SCHEMA = getClientDbHeaders();
    const HEADERS = Utilities.HeaderSorter(SCHEMA, 'COLUMN', 'TEXT');
    Logger.log(`Schema is running as ${SCHEMA}, Headers are: ${HEADERS}`)
    const ROWS = ETLService.mapOverdueClientsToDbArray(RAW_MAP.clientInvoicesMap, SCHEMA);

    SheetWriter.write(TARGET_SHEET, ROWS, HEADERS);

    const INFO_OBJECT = {
      SKIPPED_INVOICES: RAW_MAP.skippedInvoices,
      NEW_CLIENTS: RAW_MAP.registeredNewClients,
      REGISTERED_INVOICES: RAW_MAP.registeredNewInvoices,
    };
    return INFO_OBJECT;
  }

  static writeToAnalysisDb() {
  const SCHEMA = getAnalysisDbHeaders();
  const HEADERS = Utilities.HeaderSorter(SCHEMA, 'INDEX', 'TEXT_IT');
  const RAW_MAP = ETLService.runProductIncomeEtl(INVOKE_SHEET().PRODUCT_INCOME_ETL);
  
  const writingArray = ETLService.mapAnalysisToDbArray(RAW_MAP, SCHEMA);
  SheetWriter.write(INVOKE_SHEET().PRODUCT_INCOME, writingArray, HEADERS)
  }
}

function runScriptAnalysis() {
  Orchestrator.writeToAnalysisDb()
}

function runScriptClientEtl() {
  Orchestrator.writeToInvoiceDb()
}