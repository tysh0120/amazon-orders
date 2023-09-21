// SP-API オーダー関連のAPIにアクセスする処理をまとめた
// 第１引数に SpApiExecutor のインスタンスを指定する。
// SpApiExecutor.crerateSpApiExecutor() で生成可能

/**
 * オーダー一覧取得
 * GET /orders/v0/orders
 * 
 * @param {object} executor - SpApiExecutorインスタンス
 * @param {object} params - クエリパラメタ
 * @params {string} params.CreatedAfter - オーダー日付 From
 * @params {string} params.CreatedBefore - オーダー日付 To
 * - その他パラメタについてはAPI仕様参照
 * https://script.google.com/u/0/home/projects/1xoiYyfMXZKDyzaCKG2yQ6j6PYXgtcSMrDe0gj4O6jVfzdvvCVnfg_-oI/edit
 * ※ MarketPlaceIdsは、処理内部で「日本」を固定的に使用するためパラメタでの指定は不要
 */
function getOrders(executor, params) {
  const apiPath = "/orders/v0/orders";
  let nextToken;
  let orders = executor.getAllResults("Orders", {
    apiPath,
    queryParams: {
      MarketplaceIds: MARKET_PLACE_ID,
      ...params
    },
  });

  return orders;
}

/**
 * オーダー品目一覧取得
 * GET /orders/v0/orders/{orderId}/orderItems
 * @param {object} executor
 * @param {string} orderId
 */
function getOrderItems(executor, orderId) {
  const httpMethod = "GET";
  const apiPath = "/orders/v0/orders/{orderId}/orderItems";
  const orderItems = executor.getAllResults("OrderItems", {
    httpMethod,
    apiPath,
    pathParams: {
      orderId: orderId
    }
  });

  return orderItems;
}
