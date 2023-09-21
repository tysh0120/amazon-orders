/**
 * レポート作成要求
 * @param {object} executor
 * @param {string} reportType - レポートタイプ
 * @param {object} dataStartTime - 開始日
 * @param {object} dataEndTime - 終了日
 * @return {object} 結果オブジェクト　{repotrId: xxxx} 
 */
function createReport(executor, reportType, dataStartTime, dataEndTime) {
  const apiPath = "/reports/2021-06-30/reports";
  const response = executor.execute({
    httpMethod: "POST",
    apiPath,
    headerParams: {"Content-type": 'application/json; charset="utf-8"'},
    body: JSON.stringify({
      reportType,
      "marketplaceIds": [ MARKET_PLACE_ID ],
      "dataStartTime": getISO08601DateLongFormat(dataStartTime),
      "dataEndTime": getISO08601DateLongFormat(dataEndTime),
    })
  });

  console.log(response);
  return response;
}

/**
 * レポート ドキュメントID取得
 * @param {object} executor
 * @param {string} reportId
 * @return {object} ドキュメントID
 */
function getReport(executor, reportId) {
  const apiPath = "/reports/2021-06-30/reports/{reportId}";
  const response = executor.execute({
    httpMethod: "GET",
    apiPath,
    pathParams: { reportId }
  });

  console.log(response);
  return response;
}

/**
 * レポート文書取得
 * @param {object} executor
 * @param {string} reportDocumentId - ドキュメントID
 * @return {object} response
 * @return {string} response.url
 * @return {string} response.reportDocumentId
 * @return {enum} response.conpressionAlgorithm
 */
function getReportDocument(executor, reportDocumentId) {
  const apiPath = "/reports/2021-06-30/documents/{reportDocumentId}";
  const response = executor.execute({
    httpMethod: "GET",
    apiPath,
    pathParams: { reportDocumentId }
  });
  // TODO ページ遷移

  console.log(response);
  return response;
}

/**
 * FBA出荷レポート取得
 * @param {object} executor
 * @param {object} dateFrom
 * @param {object} dateTo
 * @return 
 */
function getFBAShipmentReport(executor, dateFrom, dateTo) {
  const reportType = "GET_AMAZON_FULFILLED_SHIPMENTS_DATA_GENERAL";
  const createResult =
    createReport(executor,
              reportType,
              dateFrom, dateTo);

  let reportResult;
  do {
    Utilities.sleep(10000);
    reportResult = getReport(executor, createResult.reportId);
    console.log(reportResult);
  } while (["IN_PROGRESS", "IN_QUEUE"].includes(reportResult.processingStatus));

  if (reportResult.processingStatus != "DONE") {
    throw new Error("レポート取得失敗 " + reportResult.processingStatus);
  }
  let docResult = getReportDocument(executor, reportResult.reportDocumentId);
//  let docResult = getReportDocument(executor, "amzn1.spdoc.1.4.fe.a825339d-1f59-4173-8811-ef19d49b01f4.T1K54RRMFOOS0X.2511");

  const url = docResult.url;
  const compressAlgo = docResult.compressionAlgorithm;

  console.log(url);

  // 作成したドキュメントをダウンロード
  downloadResult = UrlFetchApp.fetch(url);
  const document = downloadResult.getContentText();
  console.log(document);
  
  // TSV を２重配列に変換
  const titleAndRows = document.split("\r\n").map(row => row.split("\t"));

  const titles = titleAndRows[0];
  const rows = titleAndRows.slice(1);
  return rows.map(row => titles.reduce((obj, title, i) => {
    obj[title] = row[i];
    return obj
  }, {}));
}

/**
 * レポート一覧取得
 * @param {object} executor
 * @param {string} reportType
 * @param {object} createdAfter
 * @param {object} createdBefore
 * @return {object} response
 */
function getReports(executor, reportType, createdAfter, createdBefore) {
  const apiPath = "/reports/2021-06-30/reports";
  const response = executor.execute({
    httpMethod: "GET",
    apiPath,
    queryParams: {
      reportTypes: reportType,
      marketplaceIds: MARKET_PLACE_ID,
      createdSince: getISO08601DateLongFormat(createdAfter),
      createdUntil: getISO08601DateLongFormat(createdBefore)
    }
  });
  return response;
}
