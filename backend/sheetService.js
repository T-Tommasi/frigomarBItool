class SheetWriter {

  static write(targetSheet, rows, headers, options = {}) {
    const finalOptions = {
      clearSheet: true,
      ...options,
    };
    Logger.log(`Parameters rows to write: ${headers}, ${typeof rows}`)

    if (!targetSheet || !Array.isArray(headers) || !Array.isArray(rows)) {
      throw new Error("SheetWriter.write requires a valid targetSheet, headers array, and rows array.");
    }

    if (finalOptions.clearSheet) {
      targetSheet.clear();
    }

    if (rows.length === 0 && headers.length === 0) {
      return;
    }

    const dataToWrite = [headers, ...rows];
    const numRows = dataToWrite.length;
    const numCols = headers.length > 0 ? headers.length : 1;

    targetSheet.getRange(1, 1, numRows, numCols).setValues(dataToWrite);
  }

  static createNewPage(pageName) {
    if (!pageName) {
      throw new Error('invalid pageName parameter');
    }
    if (pageName != typeof 'string') {
      throw new Error('invalid pageName, not a string');
    }
  }

  static _cleanContent(target) {
    if (target.getLastRow() > 1) {
      target
        .getRange(2, 1, target.getLastRow() - 1, target.getLastColumn())
        .clearContent();
    }
  }
}



