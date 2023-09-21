/**
 * MENUシートの日付範囲でデータ取得実行
 */
function execute() {
  const dtFr = menuSheet.getDateTimeFrom();
  const dtTo = menuSheet.getDateTimeTo();

  if (!dtFr) {
    Browser.msgBox("開始日が入力されていません");
    return;
  }
  if (!dtTo) {
    Browser.msgBox("終了日が入力されていません");
    return;
  }
  const outputRows = getFBAShipmentReportAndComponent(dtFr, dtTo);

  if (outputRows.length > 0) {
    const sheet =
      SpreadsheetApp.openByUrl(menuSheet.getOutputSsUrl()).
      getSheetByName("[amazon]在庫管理");

    sheet.getRange(sheet.getLastRow() + 1, 1, outputRows.length, outputRows[0].length).
      setValues(outputRows);
  }
}


function executeYesterdaysReport() {
  const today = new Date();
  const dateFr = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateTo = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  dateFr.setDate(today.getDate() - 1);  // 昨日
  dateTo.setDate(today.getDate());      // 本日

  // MENUシートの日付範囲を昨日に設定
  menuSheet.setDateTimeFrom(dateFr);
  menuSheet.setDateTimeTo(dateTo);

  // 実行
  execute();
}

/**
 * FBA出荷レポートから構成品の所用を出して返却
 */
function getFBAShipmentReportAndComponent(dateFr, dateTo) {
  const executor = getSpApiExecutor()

  // レポート取得
  const report = getFBAShipmentReport(executor, dateFr, dateTo);
  console.log(report);

  // ASINを取得するため、OrderItemを取得
  const orderIds = report.map(r => r["amazon-order-id"]).
    filter((oid, idx, row) => row.indexOf(oid) == idx); // 重複を排除

  let orderItems = [];
  orderIds.forEach(oid => {
    orderItems = orderItems.concat(getOrderItems(executor, oid));
  });

  // SKU -> ASIN 変換テーブル作成
  const sku2Asin = orderItems.reduce((obj, oi) => {
    obj[oi.SellerSKU] = oi.ASIN;
    return obj;
  }, {})

  let result = [];
  for (rep of report) {
    const row = [
      new Date(),
      new Date(rep["shipment-date"]),
      rep["amazon-order-id"],
      sku2Asin[rep["sku"]],
      rep["product-name"],
      rep["quantity-shipped"],
    ];
    const components = configList.getComponentsByCode(sku2Asin[rep["sku"]]);
    if (components.length == 0) {
      result.push(row.concat(["", "", "", "出庫"]));
      continue;
    }
    components.forEach(component => {
      result.push(row.concat([
        component.name,
        component.variation,
        component.qty * Number(rep["quantity-shipped"]),
        "出庫"
      ]));
    });
  }
  console.log(result);
  return result;
}

/**
 * 指定された日付範囲のオーダーと品目、構成品一覧を取得
 * ※ オーダーは出荷日でフィルタするため、使用しないことになったが残しておく ※
 */
function getOrderItemsComponents(dateFr, dateTo) {
  const executor = getSpApiExecutor()

  const timestamp = new Date();

  const orders = getOrders(executor, {
    CreatedAfter: getISO08601DateLongFormat(dateFr),
    CreatedBefore: getISO08601DateLongFormat(dateTo)
  });

  const rows = [];
  orders.forEach(order => {
    const items = getOrderItems(executor, order.AmazonOrderId);
    items.forEach(item => {
      const components = configList.getComponentsByCode(item.ASIN);
      if (components.length == 0) {
        rows.push([
          timestamp,
          new Date(order.PurchaseDate),
          order.AmazonOrderId,
          item.ASIN,
          item.Title,
          item.QuantityOrdered,
          "", "", "", "出庫"]);
      } else {
        components.forEach(comp => {
          rows.push([
            timestamp,
          new Date(order.PurchaseDate),
            order.AmazonOrderId,
            item.ASIN,
            item.Title,
            item.QuantityOrdered,
            comp.name,
            comp.variation,
            comp.qty * item.QuantityOrdered,
            "出庫"
          ]);
        });
      }
    });
  });
  return rows;
}


function getSpApiExecutor() {
  const prop = PropertiesService.getScriptProperties().getProperties();
  return executor =  SpApiExecutor.createSpApiExecutor({
    refreshToken: prop.REFRESH_TOKEN,
    lwaClientId: prop.LWA_CLIENT_ID,
    lwaClientSecret: prop.LWA_CLIENT_SECRET,
    iamAccessKey: prop.IAM_USER_ACCESS_KEY,
    iamSecretKey: prop.IAM_USER_SECRET_ACCESS_KEY
  });
}