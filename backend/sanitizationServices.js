class SanitizationServices {
  static sanitizeDate(date) {
    let _dateArray = null;
    if (!date) {
      throw new Error(
        errorMessages(
          "SanitizationServices.sanitizeDate"
        ).WRONG_VALUE_TYPE.IT_TEXT
      );
    }
    if (date instanceof Date) {
      if (
        date.getFullYear() > 2030 ||
        date.getMonth() > 11 ||
        date.getDate() > 31 ||
        date.getDate() < 1
      ) {
        throw new Error(
          errorMessages(
            "SanitizationServices.sanitizeDate"
          ).INVALID_DATE.IT_TEXT
        );
      }

      return date;
    }

    if (typeof date != "string") {
      Logger.log(
        errorMessages("SanitizationServices.sanitizeDate").WRONG_VALUE_TYPE
          .IT_TEXT
      );
      let _dateString = date.toString();
      _dateArray = _dateString.split("/");
    } else {
      _dateArray = date.split("/");
    }

    if (_dateArray.length != 3) {
      throw new Error(
        errorMessages(
          "SanitizationServices.sanitizeDate._dateArray"
        ).WRONG_VALUE_TYPE.IT_TEXT
      );
    }

    let year = parseInt(_dateArray[2], 10);
    let month = parseInt(_dateArray[1], 10);
    let day = parseInt(_dateArray[0], 10);

    let sanitizedDate = new Date(year, month - 1, day);
    if (isNaN(sanitizedDate.getTime())) {
      throw new Error(
        "CRITICAL ERROR - SANITIZER FAILED FOR NO REASON WHATSOEVER"
      );
    } else {
      if (
        sanitizedDate.getFullYear() === year &&
        sanitizedDate.getDate() === day &&
        sanitizedDate.getMonth() === month - 1
      ) {
        return sanitizedDate;
      } else {
        throw new Error(
          errorMessages(
            "SanitizationServices.sanitizeData.sanitizedDate"
          ).INVALID_DATE.IT_TEXT
        );
      }
    }
  }

  static sanitizeMoney(amount, uuid) {
    if (typeof amount === "number" && isFinite(amount)) {
      return amount;
    }

    if (typeof amount === 'string' && amount.startsWith("#")) {
    Logger.log(`SanitizeMoney (for UUID: ${uuid}): Received spreadsheet error '${amount}'. Returning 0.`);
    return 0;
    }
    
    if (amount === null || amount == "") {
      return 0;
    }

    if (typeof amount != "string") {
      throw new Error(
        errorMessages(
          `SanitizeMoney for UUID: ${uuid}is NOT_STRING`
        ).WRONG_VALUE_TYPE.IT_TEXT
      );
    }

    let rawAmount = amount.replace(/\./g, "");
    let trimmedAmount = rawAmount.replace(",", ".");
    let sanitizedAmount = parseFloat(trimmedAmount);

    if (isNaN(sanitizedAmount) || !isFinite(sanitizedAmount)) {
      Logger.log(
        `SanitizeMoney (for UUID: ${uuid}): Failed to parse string to number. Original: "${rawAmount}", Cleaned attempt: "${sanitizedAmount}"`
      );
      throw new Error(
        errorMessages(
          "SanitationServices.sanitizeMoney"
        ).IS_NAN_OR_INFINITE.IT_TEXT
      );
    }
    return sanitizedAmount;
  }

  static sanitizeClientVendorId(uuid) {
    if (!uuid || uuid === "") {
      throw new Error(errorMessages("sanitizeUuid").NO_VALID_UUID.IT_TEXT);
    }
    const trimmedID = uuid.toString().trim();
    if (trimmedID === "" || trimmedID === undefined || trimmedID === null) {
      throw new Error(
        errorMessages("sanitizeUuid.VALUE_TYPE").WRONG_VALUE_TYPE.IT_TEXT
      );
    }
    let trimmedArray = [];
    for (let trim of trimmedID) {
      if (
        trim === "C" ||
        trim === "c" ||
        trim === "F" ||
        trim === "f" ||
        trim === "/"
      ) {
        continue; //Skips the 'C' '/' and 'F' that is sometimes in front of a UUID to discern between Client and Vendor
      }
      if (typeof trim === "string") {
        trimmedArray.push(trim);
      } else {
        throw new Error(
          "Something went, somehow, in unexplicable ways, completely wrong with the UUID sanitizer loop."
        );
      }
    }
    let cleansedID = trimmedArray.join("");
    if (cleansedID === "") {
      throw new Error(
        errorMessages("sanitizeUuid.NULL_OR_UNDEFINED").WRONG_VALUE_TYPE.IT_TEXT
      );
    }
    if (
      cleansedID.length > 0 &&
      cleansedID.length <= 4 &&
      /^\d+$/.test(cleansedID)
    ) {
      return cleansedID;
    } else {
      throw new Error(
        errorMessages("sanitizeUuid.LOOP_FINAL").NO_VALID_UUID.IT_TEXT
      );
    }
  }

  static sanitizeInvoiceId(uuid) {
    if (!uuid) {
      throw new Error(errorMessages("sanitizeInvoiceId").NO_VALID_UUID.IT_TEXT);
    }
    if (
      (typeof uuid != "string" && isNaN(uuid)) ||
      (typeof uuid != "string" && !isFinite(uuid))
    ) {
      throw new Error(
        errorMessages("sanitizeInvoiceId").IS_NAN_OR_INFINITE.IT_TEXT
      );
    }
    let rawId = uuid.toString().trim();
    let droppedCharacters = [];
    let trimmedCharacters = [];
    let regexDroppedChars = /[^a-zA-Z0-9]/;
    for (let character of rawId) {
      if (regexDroppedChars.test(character)) {
        droppedCharacters.push(character);
        continue;
      }
      trimmedCharacters.push(character);
    }
    if (trimmedCharacters.length === 0) {
      throw new Error(
        errorMessages("sanitizeInvoiceId.FINAL_CHECK").NO_VALID_UUID.IT_TEXT
      );
    }
    let sanitizedId = trimmedCharacters.join('')
    return sanitizedId;
  }
}
