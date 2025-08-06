class ReportManager {
	/*
	 * This function is intended to be the first step in a report generation process.
	 * It validates the user's input and packages it into a standard object for further processing.
	 *
	 * @returns {object} A structured report configuration object with a client ID map.
	 * @throws {Error} If the input is invalid (e.g., no client IDs provided).
	 */

	/**
	 * @private
	 * Validates the structure of the report request object.
	 * @param {object} request The request object from the client.
	 * @throws {Error} If the request is invalid.
	 */
	static _validateReportRequest(request) {
		if (!request || typeof request !== "object") {
			throw new Error("Richiesta non valida.");
		}
		if (!Array.isArray(request.clientIds) || request.clientIds.length === 0) {
			throw new Error("Nessun cliente selezionato per il report.");
		}
		if (!request.options || typeof request.options !== "object") {
			throw new Error("Opzioni del report non valide o mancanti.");
		}
	}

	/**
	 * @private
	 * Sanitizes an array of client IDs and converts it into a map.
	 * Skips invalid IDs and logs a warning.
	 * @param {string[]} clientIds Array of client UUIDs.
	 * @returns {object} A map of valid client IDs.
	 * @throws {Error} If no valid IDs are found.
	 */
	static _sanitizeClientIds(clientIds) {
		const clientMap = {};
		clientIds.forEach((id) => {
			try {
				// Use the global SanitizationServices class to ensure valid IDs
				const sanitizedId = SanitizationServices.sanitizeClientVendorId(id);
				clientMap[sanitizedId] = true;
			} catch (e) {
				Logger.log(
					`Warning: Skipping invalid client ID "${id}" during report generation. Reason: ${e.message}`
				);
			}
		});

		if (Object.keys(clientMap).length === 0) {
			throw new Error("Nessun ID cliente valido fornito per il report.");
		}
		return clientMap;
	}

	static generateClientReport(request) {
		try {
			Logger.log(
				`Received report generation request: ${JSON.stringify(request)}`
			);

			this._validateReportRequest(request);
			const clientMap = this._sanitizeClientIds(request.clientIds);

			const reportConfig = {
				clientMap: clientMap,
				options: {
					detailedView: !!request.options.detailedView, // Coerce to boolean
					flagAnomalies: !!request.options.flagAnomalies, // Coerce to boolean
				},
				createdAt: new Date().toISOString(),
			};

			Logger.log(
				`Successfully created report configuration: ${JSON.stringify(
					reportConfig
				)}`
			);

			return reportConfig;
		} catch (e) {
			Logger.log(
				`!!! CRITICAL ERROR in generateClientReport: ${e.message} \nStack: ${e.stack}`
			);
			throw new Error(`Preparazione report fallita: ${e.message}`);
		}
	}

	/**
	 * Retrieves the full data objects for clients specified in a report configuration.
	 * It filters the main client database based on the IDs in the report config.
	 *
	 * @param {object} reportConfig - The configuration object created by generateClientReport.
	 * @param {object} reportConfig.clientMap - A map of client UUIDs to include.
	 * @returns {object} A map of full ClientProductRelationAnalysis objects, keyed by client UUID.
	 * @throws {Error} If the configuration is invalid or data retrieval fails.
	 */
	static retrieveClientsFromReport(reportConfig) {
		try {
			Logger.log(
				`Received request to retrieve clients from report config: ${JSON.stringify(
					reportConfig
				)}`
			);

			const filteredClientMap =
				ReaderService.getPartialClientMarginMap(reportConfig);

			Logger.log(
				`Successfully filtered and found data for ${
					Object.keys(filteredClientMap).length
				} clients.`
			);

			return filteredClientMap;
		} catch (error) {
			Logger.log(
				`!!! CRITICAL ERROR in retrieveClientsFromReport: ${error.message} \nStack: ${error.stack}`
			);
			throw new Error(
				`Recupero dati clienti dal report fallito: ${error.message}`
			);
		}
	}
}
