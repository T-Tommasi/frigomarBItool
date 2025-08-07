function errorCatcher(uuid, errorArray) {
  if (!uuid) {
    uuid = errorMessages().NO_VALID_UUID.VALUE;
  }
  if (!errorArray) {
    throw new Error(
      "ErrorCatcher missing a valid array! (A error-error, ironic, isn't it?)"
    );
  }
  errorArray.push(uuid);
  return "missingData";
}

class Utilities {

  /**
   * Creates a map object from a header row array, mapping header names to their column index.
   * This is used for reading data from a sheet dynamically.
   * @param {string[]} headerRow - A 1D array of strings from the first row of a sheet.
   * @returns {{[key: string]: number}} An object where keys are header names and values are their indices.
   */

  static createHeaderMap(headerRow) {
    if (!headerRow || !Array.isArray(headerRow)) {
      Logger.log("Warning: createHeaderMap received an invalid or empty header row.");
      return {};
    }
    const headerMap = {};
    headerRow.forEach((header, index) => {
      headerMap[String(header).trim()] = index;
    });
    return headerMap;
  }

  /**
   * Sorts and maps a schema object to a 1D array of header strings.
   * This is used for writing headers to a sheet.
   */

  static HeaderSorter(headerObject, sortKey, textKey) {
    if (!headerObject || !sortKey || !textKey) {
      throw new Error("HeaderSorter is missing required arguments.");
    }

    let sortedHeaders = Object.values(headerObject)
      .sort((a, b) => a[sortKey] - b[sortKey])
      .map((col) => col[textKey]);

    return sortedHeaders;
  }

  static captureAllSheetData(sheetObject) {
    if (sheetObject.getLastRow() < 1) {
      return [];
    }

    const dataRange = sheetObject.getDataRange();
    return dataRange.getValues();
  }

  /**
   * Extracts the last modified date from a cell and returns it as a sanitized Date object
   * @param {string} cellAddress - The A1 notation of the cell (e.g., "A1", "B5")
   * @param {string} [sheetName] - Optional sheet name. If not provided, uses active sheet
   * @returns {Date} The sanitized date when the cell was last modified
   */

  static getCellModifiedDate(cellAddress, sheetName) {
    const sheet = sheetName
    const range = sheet.getRange(cellAddress);
    const lastUpdated = sheet.getLastUpdated();

    return SanitizationServices.sanitizeDate(lastUpdated);
  }

  /**
   * Retrieves values from a specified range in a sheet.
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheetObject The sheet to read from.
   * @param {number} startRow The starting row index (1-based).
   * @param {number} startCol The starting column index (1-based).
   * @param {number} [numRows=1] Optional. The number of rows to retrieve. Must be > 0.
   * @param {number} [numCols=1] Optional. The number of columns to retrieve. Must be > 0.
   * @returns {any[][]} A 2D array of the values from the specified range.
   * @throws {Error} If required parameters are missing or invalid.
   */
  static getRangeValues(sheetObject, startRow, startCol, numRows = 1, numCols = 1) {
    if (!sheetObject || typeof sheetObject.getRange !== 'function') {
      throw new Error("getRangeValues requires a valid Sheet object.");
    }
    if (!startRow || !startCol || startRow < 1 || startCol < 1 || numRows < 1 || numCols < 1) {
      throw new Error("Row, column, and number of rows/columns must be positive integers.");
    }

    return sheetObject.getRange(startRow, startCol, numRows, numCols).getValues();
  }
}