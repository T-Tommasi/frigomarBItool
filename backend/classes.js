class Vendor {
  constructor(uuid, name, notes, invoices, phoneNumber, mail, location) {
    this.uuid = uuid;
    this.name = name;
    this.noteArray = notes || []; //This is an array that contains objects created by the class Note
    this.invoices = invoices || []; //This is an array that will contain objects created by the class Invoice
    this.phoneNumber =
      phoneNumber || errorMessages("Vendor.phoneNumber").NO_NUMBER;
    this.mail = mail || errorMessages("Vendor.mail").NO_MAIL;
    this.location = location || errorMessages("Vendor.location").NO_LOCATION;
  }
}

class Client {
  constructor(uuid, name, agent) {
    this.uuid = uuid;
    this.name = name;
    this.agent = agent || "N/A";
    this.invoices = [];
    this.notes = [];
    this.phoneNumber = null;
    this.mail = null;
    this.location = null;
  }

  totalLeftToPay() {
    return this.invoices.reduce((sum, invoice) => sum + invoice.leftToPay, 0);
  }

  totalOverdue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sixtyDaysInMs = 60 * 24 * 60 * 60 * 1000;
    let totalOverdueAmount = 0;

    for (const invoice of this.invoices) {
      if (invoice.status === "Pagata" || invoice.type.IT_TEXT !== "Fattura") {
        continue;
      }

      const invoiceDate = new Date(invoice.date);
      if (isNaN(invoiceDate.getTime())) {
        continue;
      }

      const timeDifference = today.getTime() - invoiceDate.getTime();

      Logger.log(`Invoice ${invoice.uuid} | Date: ${invoiceDate.toLocaleDateString('it-IT')} | Days Old: ${(timeDifference / 86400000).toFixed(0)} | Is >60d? ${timeDifference > sixtyDaysInMs}`);

      if (timeDifference > sixtyDaysInMs) {
        totalOverdueAmount += invoice.leftToPay;
      }
    }
    return totalOverdueAmount;
  }

  totalPaid() {
    return this.invoices.reduce((sum, invoice) => sum + (invoice.paid || 0), 0);
  }

  toPlainObject() {
    return {
      uuid: this.uuid,
      name: this.name,
      agent: this.agent,
      // Manually convert each invoice to a plain object as well
      invoices: this.invoices.map(inv => ({
        uuid: inv.uuid,
        entity: inv.entity,
        date: inv.date.toISOString(), // Use standard ISO format for dates
        dueDate: inv.dueDate.toISOString(),
        isOverdue: inv.isOverdue,
        amount: inv.amount,
        paid: inv.paid,
        leftToPay: inv.leftToPay,
        status: inv.status,
        type: inv.type,
        invoiceNote: inv.invoiceNote
      }))
    };
  }
}

class Note {
  constructor(title, content, author, entityId, origin, date) {
    this.title = title;
    this.content = content;
    this.author = author;
    if (!entityId) {
      throw new Error(
        "Invalid entityId for Note: " +
        errorMessages("Note.entityId").INVALID_NOTE_ENTITY.IT_TEXT
      );
    } else {
      this.entityUuid = entityId
    }
    if (!origin) {
      throw new Error(errorMessages('Note class -> origin').INVALID_NOTE_ENTITY.IT_TEXT)
    }
    this.origin = origin //will either be VENDOR, CLIENT, or INVOICE
    this.date = date
  }
}

class Invoice {
  constructor(
    invoiceNumber,
    invoiceEntity,
    amount,
    date,
    dueDate,
    paid,
    type,
    invoiceNote,
    dateOfPost
  ) {
    this.uuid = invoiceNumber;
    this.entity = invoiceEntity;
    this.date = SanitizationServices.sanitizeDate(date);
    this.dueDate = SanitizationServices.sanitizeDate(dueDate);
    this.isOverdue = false;
    this.parsingDate = dateOfPost

    if (amount > 0) {
      this.amount = amount;
      this.paid = paid;
    } else if (amount < 0) {
      this.amount = amount * -1;
      this.paid = paid * -1;
    } else {
      this.amount = 0;
      this.paid = 0;
    }
    if (isNaN(this.paid) || !isFinite(this.paid) || this.paid === null) {
      this.paid = 0;
    }
    this.leftToPay = this.amount - this.paid;
    if (this.leftToPay === this.amount) {
      this.status = "Da pagare";
    } else if (this.leftToPay > 0) {
      this.status = "Parzialmente pagata";
    } else if (this.leftToPay === 0) {
      this.status = "Pagata";
    } else {
      this.status = errorMessages("Object.Invoice").WRONG_VALUE_TYPE.IT_TEXT;
    }
    this.type = type || invoiceType().ERROR;
    if (this.status != "Pagata") {
      let today = new Date();
      today.setHours(0, 0, 0, 0);
      if (this.dueDate.getTime() < today.getTime()) {
        this.isOverdue = true;
      }
    }
    this.invoiceNote = invoiceNote || "";
  }
}

class Product {
  constructor(uuid, description, quantity, weightType, notes, vendors) {
    this.uuid = uuid;
    if (!uuid) {
      throw new Error(errorMessages("Product.uuid").NO_VALID_UUID); //critical error, a product cannot have a missing UUID
    }
    this.description = description;
    if (!quantity) {
      this.quantity = 0;
      Logger.log(`Product with UUID ${this.uuid} has no quantity. set it to 0`);
    } else {
      if (typeof quantity === "number") {
        this.quantity = quantity;
      } else {
        throw new Error(
          errorMessages(
            `wrong quantity value in product ${this.uuid}`
          ).WRONG_VALUE_TYPE
        ); //Critical error, a product quantity cant be a letter or other value
      }
    }
    this.weightType =
      weightType ||
      errorMessages(`wrong weight type value in product ${this.uuid}`)
        .WRONG_VALUE_TYPE.VALUE; //If there is no weight type we can display it blank to be fixed later on
    this.notes = notes || []; //Will be populated by the class Notes
    this.vendors = vendors || []; //to be set later on based on who sells what
  }
}

class productMarginAnalysis {
  constructor(productUUID, productName, soldAmount, percentageIncome, saleIncome, totalCost, extractionDate) {
    if (!productUUID || typeof productUUID != 'string') {
      throw new Error(errorMessages().NO_VALID_UUID.IT_TEXT)
    }
    if (!productName || typeof productName != 'string') {
      throw new Error(errorMessages().WRONG_VALUE_TYPE)
    }
    this.uuid = productUUID;
    this.name = productName;
    this.totalSold = soldAmount || 0;
    this.percentageIncome = percentageIncome
    this.saleIncome = saleIncome;
    this.totalCost = totalCost || 0;
    this.clients = {};
    this.extractionDate = extractionDate
    this.margin = saleIncome - totalCost
  }

  toPlainObject() {
    const plainClients = {};
    for (const key in this.clients) {
      plainClients[key] = this.clients[key].toPlainObject();
    }

    return {
      uuid: this.uuid,
      name: this.name,
      totalSold: this.totalSold,
      percentageIncome: this.percentageIncome,
      saleIncome: this.saleIncome,
      totalCost: this.totalCost,
      margin: this.margin,
      clients: plainClients,
      extractionDate: this.extractionDate.toISOString(),
    };
  }

}

class ProductClientRelationAnalysis {
  constructor(uuid, name, soldAmount, soldValue, soldIncome, percentage, margin) {
    if (!uuid) {
      throw new Error(errorMessages().NO_VALID_UUID.IT_TEXT)
    }
    if (!soldValue || !soldAmount || !soldIncome || !percentage) {
      Logger.log(`product ${uuid} is missing critical data!`)
      return
    }
    this.uuid = uuid;
    this.name = name;
    this.soldAmount = soldAmount;
    this.soldValue = soldValue || 0;
    this.soldIncome = soldIncome;
    this.percentageIncome = percentage;
    this.margin = margin || 0;
  }

  toPlainObject() {
    return {
      uuid: this.uuid,
      name: this.name,
      soldAmount: this.soldAmount,
      soldValue: this.soldValue,
      soldIncome: this.soldIncome,
      percentageIncome: this.percentageIncome,
      margin: this.margin,
    };
  }
}

class ClientProductRelationAnalysis {
  constructor(uuid, name, parseDate) {
    this.uuid = uuid;
    this.name = name;
    this.parseDate = parseDate;
    this.productsMap = {};

    this.totalRevenue = 0;
    this.totalCost = 0;
    this.totalMargin = 0;
    this.marginPercentage = 0;
    this.isHighRisk = false;
  }

  calculateMetrics() {
    this.totalRevenue = 0;
    this.totalMargin = 0;

    for (const product of Object.values(this.productsMap)) {
      this.totalRevenue += product.revenue;
      this.totalMargin += product.margin;
    }

    this.totalCost = this.totalRevenue - this.totalMargin;

    if (this.totalRevenue > 0) {
      const rawPercentage = (this.totalMargin / this.totalRevenue) * 100;
      this.marginPercentage = rawPercentage - AppConfig.DECREASE_MARGIN_CLEANING;
    } else {
      this.marginPercentage = 0;
    }

    if (this.totalMargin <= 0) {
      this.isHighRisk = true;
    }
  }

  toPlainObject() {
    const plainProductsMap = {};
    for (const key in this.productsMap) {
      plainProductsMap[key] = this.productsMap[key].toPlainObject();
    }

    return {
      uuid: this.uuid,
      name: this.name,
      parseDate: this.parseDate.toISOString(),
      productsMap: plainProductsMap,
      totalRevenue: this.totalRevenue,
      totalCost: this.totalCost,
      totalMargin: this.totalMargin,
      marginPercentage: this.marginPercentage,
      isHighRisk: this.isHighRisk
    };
  }
}

class ClientMappedProduct {
  constructor(uuid, name, clientUuid, soldAmount, soldValue, revenue, extractionDate) {
    this.uuid = uuid;
    this.relatedClientUuid = clientUuid;
    this.productName = name;
    this.soldAmount = soldAmount;
    this.soldValue = soldValue;
    this.revenue = revenue;
    this.extractionDate = extractionDate;
    this.margin = this.revenue - this.soldValue;
    this.marginPercentage = (this.margin / this.revenue) * 100;
    this.hasAnomaly = false;
    this.anomalyText = null;
  }

  toPlainObject() {
    return {
      uuid: this.uuid,
      relatedClientUuid: this.relatedClientUuid,
      productName: this.productName,
      soldAmount: this.soldAmount,
      soldValue: this.soldValue,
      revenue: this.revenue,
      extractionDate: this.extractionDate.toISOString(),
      margin: this.margin,
      marginPercentage: this.marginPercentage,
      hasAnomaly: this.hasAnomaly,
      anomalyText: this.anomalyText,
    };
  }
}