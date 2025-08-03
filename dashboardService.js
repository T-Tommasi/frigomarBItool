class dashboardService {
  static getDashboardData() {

    let criticalClients = this._getClientInvoiceData();
    let financialStatus = this._getFinancialDebtStatus();
    //IMPLEMENT: Margin overview
  }


/**
 * @private Fetches and calculates the main Scadenzario KPIs.
 * @returns {Object} An object with total receivable, total overdue, and overdue client count.
 */
  static _getFinancialDebtStatus() {
    let clientsData = ReaderService.getClientSummaryData();

    let totalReceivable = 0;
    let totalOverdue = 0;
    let overdueClientCount = 0;
    let overdueClientsMap = {};
    //let overdueInvoices = 0; 
    //-- This would need to be read directly from our DB, that would slow down massively this calculation on the homepage and require invoking another function
    //-- hence i'm leaving it commented out untill I get a better idea on how to do it, or it's required.
    //-- woe to you from JS gods if you attempt to implement this without a plan

    for (let client of clientsData) {
      const UUID = client.uuid
      totalReceivable += client.totalDue;

      if (client.totalOverdue > 0) {
          overdueClientCount++;
          totalOverdue += client.totalOverdue;
      }
    }

    let collectedData = {
      totalDebt,
      totalOverdue,
      overdueClients,
      //overdueInvoices,
    }
    return collectedData //returns the aggregated data points
  };

  static _getMarginSnapshot() {
    
  };

  static _getClientInvoiceData() {
    const options = {
      sortBy: 'totalOverdue',
      limit: 5,
    };

    return getClientSummaryData(options)
  };
}