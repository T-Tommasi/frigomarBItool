function getInternalClientInvoiceMap() {
	return {
		UUID_CLIENT: { INDEX: 1, TEXT_IT: "Codice cliente" },
		NAME_CLIENT: { INDEX: 2, TEXT_IT: "Nominativo" },
		INVOICE_NUMBER: { INDEX: 3, TEXT_IT: "ID Fattura" },
		INVOICE_DATE: { INDEX: 4, TEXT_IT: "Data emissione" },
		INVOICE_OVERDUE_DATE: { INDEX: 5, TEXT_IT: "Scadenza" },
		INVOICE_TOTAL_AMOUNT: { INDEX: 6, TEXT_IT: "Totale da ricevere" },
		INVOICE_TOTAL_PAID: { INDEX: 7, TEXT_IT: "Pagamento ricevuto" },
		INVOICE_TYPE: { INDEX: 8, TEXT_IT: "Tipologia fattura" },
		PAYMENT_METHOD: { INDEX: 9, TEXT_IT: "Metodo di pagamento" },
		INVOICE_NOTE: { INDEX: 10, TEXT_IT: "Note fattura" }, //CLIENT_NOTES e VENDOR_NOTES are memorized in a specific sheet\DB for ease of access and usage
	};
}

const AppConfig = {
	/**
	 * A fixed value (as a percentage point) to subtract from the calculated
	 * margin percentage for reporting/cleaning purposes.
	 * e.g., A value of 1 will turn 25% into 24%.
	 */
	DECREASE_MARGIN_CLEANING: 1,
};

function invoiceType() {
	return {
		CREDIT_NOTE: { DEBT: false, IT_TEXT: "Nota di credito" },
		INVOICE: { DEBT: true, IT_TEXT: "Fattura" },
		ERROR: {
			DEBT: false,
			IT_TEXT: "Errore nel definire la tipologia del documento!",
		},
	};
}

function REGEX_VARIABLES() {
	return {
		ANALYSIS_INCOME: /^[a-zA-Z]{2}\d{3}$/,
	};
}

function defineInvoiceType(amount) {
	let invoiceDefinition = null;

	if (amount > 0) {
		invoiceDefinition = invoiceType().INVOICE;
	} else if (amount < 0) {
		invoiceDefinition = invoiceType().CREDIT_NOTE;
	} else {
		invoiceDefinition = invoiceType().ERROR;
		throw new Error(invoiceType().ERROR.IT_TEXT);
	}

	return invoiceDefinition;
}

function errorMessages(origin) {
	if (!origin) {
		origin = "unknown - missing origin parameter";
	}
	Logger.log(`new error message located in: - ${origin} -`);
	Logger.log("------");
	return {
		NO_NUMBER: {
			VALUE: null,
			INTERNAL_ERROR: true,
			IT_TEXT: "Nessun numero registrato",
			ORIGIN: origin,
		},

		NO_LOCATION: {
			VALUE: null,
			INTERNAL_ERROR: true,
			IT_TEXT: "Nessun indirizzo registrato",
			ORIGIN: origin,
		},

		NO_MAIL: {
			VALUE: null,
			INTERNAL_ERROR: true,
			IT_TEXT: "Nessun indirizzo email registrato",
			ORIGIN: origin,
		},

		INVALID_NOTE_ENTITY: {
			VALUE: null,
			INTERNAL_ERROR: true,
			IT_TEXT: "ID correlato non valido",
			ORIGIN: origin,
		},

		NO_VALID_UUID: {
			VALUE: null,
			INTERNAL_ERROR: true,
			IT_TEXT: "Codice univoco assente o non valido",
			ORIGIN: origin,
		},

		WRONG_VALUE_TYPE: {
			VALUE: null,
			INTERNAL_ERROR: false,
			IT_TEXT: "Valore non idoneo",
			ORIGIN: origin,
		}, //INTERNAL_ERROR: false since this error is due to G2 import being fussy, if it happens

		INVALID_DATE: {
			VALUE: null,
			INTERNAL_ERROR: false,
			IT_TEXT: "Data in formato sconosciuto",
			ORIGIN: origin,
		},

		IS_NAN_OR_INFINITE: {
			VALUE: NaN,
			INTERNAL_ERROR: true,
			IT_TEXT: "valore è NAN o infinito",
			ORIGIN: origin,
		},

		MISSING_SHEET_ID: {
			VALUE: null,
			INTERNAL_ERROR: true,
			IT_TEXT: "nessun ID foglio appropriato",
			ORIGIN: origin,
		},

		EMPTY_OR_INVALID_NOTE: {
			VALUE: null,
			INTERNAL_ERROR: false,
			IT_TEXT: "Il file note è vuoto o invalido",
			ORIGIN: origin,
		},

		INVALID_PRODUCT_COST: {
			VALUE: "invalid",
			INTERNAL_ERROR: false,
			IT_TEXT: "Prodotto con costo invalido da G2, skippato",
			ORIGIN: origin,
		},
	};
}

function getClientDbHeaders() {
	return {
		CLIENT_UUID: { TEXT: "Codice Cliente", COLUMN: 1 },
		CLIENT_NAME: { TEXT: "Nominativo Cliente", COLUMN: 2 },
		CLIENT_AGENT: { TEXT: "Agente", COLUMN: 3 },
		INVOICE_UUID: { TEXT: "ID Fattura", COLUMN: 4 },
		INVOICE_DATE: { TEXT: "Data Fattura", COLUMN: 5 },
		INVOICE_DUE_DATE: { TEXT: "Data Scadenza", COLUMN: 6 },
		INVOICE_AMOUNT: { TEXT: "Importo Totale", COLUMN: 7 },
		INVOICE_PAID: { TEXT: "Importo Pagato", COLUMN: 8 },
		INVOICE_LEFT_PAY: { TEXT: "Importo Residuo", COLUMN: 9 },
		INVOICE_TYPE: { TEXT: "Tipo Documento", COLUMN: 10 },
		INVOICE_STATUS: { TEXT: "Stato Fattura", COLUMN: 11 },
		INVOICE_ISOVERDUE: { TEXT: "Scaduta?", COLUMN: 12 },
		INVOICE_PARSING_DATE: { TEXT: "Data Estrazione", COLUMN: 13 },
	};
}

function getAnalysisDbHeaders() {
	return {
		UUID: { INDEX: 1, TEXT_IT: "UUID" }, //If vendor it should be === to UUID_VENDOR
		UUID_VENDOR: { INDEX: 2, TEXT_IT: "UUID origine" },
		NAME: { INDEX: 3, TEXT_IT: "Nominativo" },
		SOLD_QUANTITY: { INDEX: 4, TEXT_IT: "Q.tà Vend." },
		SOLD_INCOME_VALUE: { INDEX: 5, TEXT_IT: "Val. Vend." },
		SOLD_COST: { INDEX: 6, TEXT_IT: "Val. Costo" },
		ROI_CLIENT: { INDEX: 7, TEXT_IT: "Differenza" },
		PERCENTAGE_INCOME_TO_COST: { INDEX: 8, TEXT_IT: "Percentuale" },
		PRODUCT_NAME: { INDEX: 9, TEXT_IT: "Nome prodotto" },
		PRODUCT_PARSING_DATE: { INDEX: 10, TEXT_IT: "Data Estrazione" },
	};
}

function getInternalVendorInvoiceMap() {
	return {
		UUID_VENDOR: { INDEX: 1, TEXT_IT: "Codice fornitore" },
		NAME_VENDOR: { INDEX: 2, TEXT_IT: "Nominativo" },
		INVOICE_NUMBER: { INDEX: 3, TEXT_IT: "ID Fattura" },
		INVOICE_DATE: { INDEX: 4, TEXT_IT: "Data emissione" },
		INVOICE_OVERDUE_DATE: { INDEX: 5, TEXT_IT: "Scadenza" },
		INVOICE_TOTAL_AMOUNT: { INDEX: 6, TEXT_IT: "Totale dovuto" },
		INVOICE_TOTAL_PAID: { INDEX: 7, TEXT_IT: "Pagato" },
		INVOICE_TYPE: { INDEX: 8, TEXT_IT: "Tipologia fattura" },
		PAYMENT_METHOD: { INDEX: 9, TEXT_IT: "Metodo di pagamento" },
		INVOICE_NOTE: { INDEX: 10, TEXT_IT: "Note fattura" }, //This serves the mere purpose of adding very short notes for a specific invoice, to then be displayed (if any) in the UI.
		//CLIENT_NOTES e VENDOR_NOTES are memorized in a specific sheet\DB for ease of access and usage
	};
}

function getInternalNoteMap() {
	return {
		NOTE_UUID: { INDEX: 1, TEXT_IT: "ID nota" }, //This wont be displayed to the end-user
		VENDOR_UUID: { INDEX: 2, TEXT_IT: "Codice venditore" },
		CLIENT_UUID: { INDEX: 3, TEXT_IT: "Codice cliente" }, //A single client might be both a vendor or a client, so we store both - if one is empty we will simply ignore it
		NOTE_CREATION_DATE: { INDEX: 4, TEXT_IT: "Data creazione nota" },
		NOTE_CREATION_USER: { INDEX: 5, TEXT_IT: "Utente che ha creato la nota" },
		NOTE_CONTENT: { INDEX: 6, TEXT_IT: "Contenuto nota" },
		UI_DISPLAY_ACTIVE: { INDEX: 7, STATE: true },
		UI_DISPLAY_INACTIVE: { INDEX: 8, STATE: false }, //Defines if the note should be displayed for the end-user or was either removed or hidden by him
	};
}

function getExporterHeaderMap() {
	return {
		OVERDUE_DATE: { INDEX: 1, TEXT_IT: "Scadenza" },
		UUID: { INDEX: 2, TEXT_IT: "Codice" },
		CLIENT_NAME: { INDEX: 3, TEXT_IT: "Descrizione" },
		INVOICE_DATE: { INDEX: 4, TEXT_IT: "Data fattura" },
		INVOICE_UUID: { INDEX: 5, TEXT_IT: "Nr. rif. fatt." },
		INVOICE_OVERDUE_TYPE: { INDEX: 6, TEXT_IT: "Tipo scadenza" }, //I have absolutely no clue what this is, what the usage of it is, and why it exists the only text is 'D - Rimessa diretta'
		INVOICE_AMOUNT: { INDEX: 7, TEXT_IT: "Importo" },
		INVOICE_PAID_AMOUNT: { INDEX: 8, TEXT_IT: "Importo pagato" },
		UNKNOWN_USELESS_VARIABLE: { INDEX: 9, TEXT_IT: "Sal./Acc." },
		SEEN_STATUS: { INDEX: 10, TEXT_IT: "Vista" }, //Another utterly useless stat
		INVOICED_NOTE: { INDEX: 11, TEXT_IT: "Note" }, //Empty array, useless
		STATUS: { INDEX: 12, TEXT_IT: "Banca" }, //It's called 'Banca' by the software, but its actually the invoice status
	};
}

function getFinancialSnapshotMap() {
	return {
		CLIENT_UUID: { INDEX: 1, TEXT_IT: "Id cliente" },
		CLIENT_NAME: { INDEX: 2, TEXT_IT: "Nominativo" },
		MONTHLY_EARNING: { INDEX: 3, TEXT_IT: "Incasso mese" },
		MONTHLY_COSTS: { INDEX: 4, TEXT_IT: "Spese mese" }, //If any, and if applicable
		DATE_OF_SNAPSHOT: { INDEX: 5, TEXT_IT: "Mese e anno dello snapshot" }, //We dont need precise to-the-day tracking - unless someone proposes it, at least
		PERCENTAGE_CHANGE_TO_LAST_YEAR: {
			INDEX: 6,
			TEXT_IT: "Cambio percentile all'anno precedente",
		}, //If we have previous-year data.
	};
}

function INVOKE_SHEET() {
	const _SHEET = SpreadsheetApp.getActiveSpreadsheet();

	return {
		CLIENTS: _SHEET.getSheetByName("ClientInvoices"),
		VENDORS: _SHEET.getSheetByName("FornitoriInvoices"),
		NOTES: _SHEET.getSheetByName("RegistroNote"),
		CLIENTS_ETL: _SHEET.getSheetByName("uploadSheetClients"),
		PRODUCT_INCOME_ETL: _SHEET.getSheetByName("UploadPercentiliProdotto"),
		PRODUCT_INCOME: _SHEET.getSheetByName("productIncome"),
	};
}

//Column identifiers for ETLservice & cleaned ETLdata

function clientImporterColumn() {
	return {
		OVERDUE_DATE_COL: { SHEET: 1, JS: 0 },
		CLIENT_UUID: { SHEET: 2, JS: 1 },
		CLIENT_NAME: { SHEET: 3, JS: 2 },
		INVOICE_DATE: { SHEET: 4, JS: 3 },
		INVOICE_UUID: { SHEET: 5, JS: 4 },
		INVOICE_PAYMENT_TYPE: { SHEET: 6, JS: 5 },
		INVOICE_AMOUNT: { SHEET: 7, JS: 6 },
		INVOICE_PAID_AMOUNT: { SHEET: 8, JS: 7 },
		//INVOICE_EARLY_PAYMENT: {SHEET: 9, JS: 8} //-- NOT IN USE, no clue what this does in the ERP or what it means, besides it's always 'S'
		INVOICE_NOTE: { SHEET: 10, JS: 9 }, //-- Always empty when parsed by ERP
		//INVOICE_STATUS: {SHEET:11, JS: 10}, //-- Commented out - status will be dinamically calculated,
	};
}

function cleanClientDbColumn() {
	return {
		CLIENT_UUID: { SHEET: 1, JS: 0 }, //UUID of the single invoice
		CLIENT_NAME: { SHEET: 2, JS: 1 }, //Name of the entity
		CLIENT_AGENT: { SHEET: 3, JS: 2 }, //Agent assigned to client
		INVOICE_UUID: { SHEET: 4, JS: 3 }, //Unique UUID of invoices
		INVOICE_DATE: { SHEET: 5, JS: 4 }, //Invoice release date
		INVOICE_OVERDUE_DATE: { SHEET: 6, JS: 5 }, //Date from when the invoice will be officially OVERDUE
		INVOICE_TOTAL_AMOUNT: { SHEET: 7, JS: 6 }, //Total amount due for the invoice
		INVOICE_PAID: { SHEET: 8, JS: 7 }, //Amount already paid
		INVOICE_RESIDUAL: { SHEET: 9, JS: 8 }, //Amount left to pay
		DOCUMENT_TYPE: { SHEET: 10, JS: 9 }, //Is the document a 'fattura' or a 'nota di credito'?
		DOCUMENT_STATE: { SHEET: 11, JS: 10 }, //Paid-Unpaid-Half paid
		OVERDUE: { SHEET: 12, JS: 11 }, //Is the invoice overdue?
	};
}
