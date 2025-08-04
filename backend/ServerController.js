function doGet(e) {
  // --- AUTHORIZATION CHECK ---
  const activeUserEmail = Session.getActiveUser().getEmail();
  const authorizedUsersList = AUTHORIZED_USERS();

  const isAuthorized = Object.values(authorizedUsersList).some(user => user.MAIL === activeUserEmail);

  if (!isAuthorized) {
    return HtmlService.createHtmlOutput(
      `<div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                <h1>Accesso Negato</h1>
                <p>Non sei autorizzato a visualizzare questa applicazione. Contatta l'amministratore.</p>
            </div>`
    );
  }
  return HtmlService.createTemplateFromFile('Index.html')
    .evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getClientSummaryData() {
  return ReaderService.getClientSummaryData();
} //A necessary evil, google.script.run cannot summon a class method

function loadVendorsView() { return "<h2>Scadenzario Fornitori - In Costruzione</h2>"; };

function loadClientAnalysisView() {
  return HtmlService.createHtmlOutputFromFile('clientAnalysisView').getContent();
};

function loadProductAnalysisView() {
  return HtmlService.createHtmlOutputFromFile('productAnalyticsView').getContent();
}

function loadProductAnalysisView() {
  return HtmlService.createHtmlOutputFromFile('productAnalyticsView').getContent();
};

function loadProductsView() { return "<h2>Prodotti & Residuo - In Costruzione</h2>"; };
function loadAboutView() { return "<h2>About - In Costruzione</h2>"; };
function loadMarginsView() {
  return "<h2>Analisi Margini - In Costruzione</h2>";
};
function loadInvoicesView() {
  return HtmlService.createHtmlOutputFromFile('invoicesPage').getContent();
}

/**
 * Here be dragons. or, well, global variables neded for google.run ...
 */

/**
 * Retrieves the full data object for a single client by their ID.
 * This function is called by the frontend to populate the details modal.
 *
 * @param {string} clientId The unique identifier for the client.
 * @returns {Client} The complete Client object, including its nested 'invoices' array.
 * @throws {Error} Throws an error if the client ID is missing or the client cannot be found,
 * which will trigger the .withFailureHandler() on the frontend.
 */
function getClientDetails(clientId) {
  try {
    if (!clientId) {
      throw new Error("ID cliente non fornito.");
    }

    const clientSheet = INVOKE_SHEET().CLIENTS;
    const clientMap = ETLService.buildMapFromDbSheet(clientSheet);

    Logger.log(`Requesting clientId: "${clientId}" (Type: ${typeof clientId})`);
    Logger.log(`Available keys in map: ${JSON.stringify(Object.keys(clientMap).slice(0, 10))}...`);

    const client = clientMap[clientId];

    if (!client) {
      throw new Error(`Nessun cliente trovato con l'ID: ${clientId}`);
    }
    return client.toPlainObject();

  } catch (e) {
    Logger.log(`!!! CRITICAL ERROR in getClientDetails for clientId: ${clientId}. Error: ${e.message} \nStack: ${e.stack}`);
    throw new Error(`Recupero dettagli fallito: ${e.message}`);
  }
}

function getProductMarginData() {
  try {
    Logger.log('Starting getProductMarginData...');

    const { productMap, negativeIncomeProductMap } = ReaderService.readAnalysisDb();

    Logger.log(`Raw productMap keys: ${Object.keys(productMap || {}).length}`);
    Logger.log(`Raw negativeIncomeProductMap keys: ${Object.keys(negativeIncomeProductMap || {}).length}`);

    if (!productMap || Object.keys(productMap).length === 0) {
      Logger.log('WARNING: No products found in productMap');
      return {
        productMap: {},
        negativeIncomeProductMap: {}
      };
    }

    const plainProductMap = {};
    const plainNegativeIncomeProductMap = {};

    // Convert products to plain objects
    for (const key in productMap) {
      try {
        if (productMap[key] && typeof productMap[key].toPlainObject === 'function') {
          plainProductMap[key] = productMap[key].toPlainObject();
        } else {
          Logger.log(`WARNING: Product ${key} doesn't have toPlainObject method`);
          plainProductMap[key] = productMap[key]; // Fallback to raw object
        }
      } catch (e) {
        Logger.log(`ERROR converting product ${key}: ${e.message}`);
      }
    }

    // Convert negative income products to plain objects
    for (const key in negativeIncomeProductMap) {
      try {
        if (negativeIncomeProductMap[key] && typeof negativeIncomeProductMap[key].toPlainObject === 'function') {
          plainNegativeIncomeProductMap[key] = negativeIncomeProductMap[key].toPlainObject();
        } else {
          Logger.log(`WARNING: Negative product ${key} doesn't have toPlainObject method`);
          plainNegativeIncomeProductMap[key] = negativeIncomeProductMap[key]; // Fallback to raw object
        }
      } catch (e) {
        Logger.log(`ERROR converting negative product ${key}: ${e.message}`);
      }
    }

    Logger.log(`Final plainProductMap keys: ${Object.keys(plainProductMap).length}`);
    Logger.log(`Final plainNegativeIncomeProductMap keys: ${Object.keys(plainNegativeIncomeProductMap).length}`);

    // Log a sample product to verify structure
    const sampleKey = Object.keys(plainProductMap)[0];
    if (sampleKey) {
      Logger.log(`Sample product structure for ${sampleKey}:`, JSON.stringify(plainProductMap[sampleKey], null, 2));
    }

    return {
      productMap: plainProductMap,
      negativeIncomeProductMap: plainNegativeIncomeProductMap
    };

  } catch (e) {
    Logger.log(`!!! CRITICAL ERROR in getProductMarginData: ${e.message}`);
    Logger.log(`Stack trace: ${e.stack}`);
    throw new Error(`Recupero analisi margini fallito: ${e.message}`);
  }
}

/**
 * Retrieves and aggregates margin data grouped by client.
 * Called by the frontend for the "Analisi Clienti" view.
 * @returns {{clientMap: Object, negativeIncomeClientMap: Object}} Plain objects ready for the client.
 */
function getClientAnalysisData() {
  try {
    // 1. Call the backend service to get the data
    const { clientMap, negativeIncomeClientMap } = ReaderService.readClientMarginDb();

    // 2. Convert the class instances to plain objects for transport
    const plainClientMap = {};
    for (const key in clientMap) {
      plainClientMap[key] = clientMap[key].toPlainObject();
    }

    const plainNegativeIncomeClientMap = {};
    for (const key in negativeIncomeClientMap) {
      plainNegativeIncomeClientMap[key] = negativeIncomeClientMap[key].toPlainObject();
    }

    // 3. Return the clean data to the frontend
    return {
      clientMap: plainClientMap,
      negativeIncomeClientMap: plainNegativeIncomeClientMap
    };

  } catch (e) {
    Logger.log(`!!! CRITICAL ERROR in getClientAnalysisData: ${e.stack}`);
    throw new Error(`Recupero analisi clienti fallito: ${e.message}`);
  }
}