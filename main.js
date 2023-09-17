
function getOrders(executor, params) {
  const apiPath = "/orders/v0/orders";
  const marketPlaceId = PropertiesService.getScriptProperties().getProperty('MARKET_PLACE_ID');
  let nextToken;
  let orders = executor.getAllResults("Orders", {
    apiPath,
    queryParams: {
      MarketplaceIds: marketPlaceId,
      ...params
    },
  });

  return orders;
}

function getOrderItems(executor, orderId) {
  const httpMethod = "GET";
  const apiPath = "/orders/v0/orders/{orderId}/orderItems";
  const res = executor.getAllResults("OrderItems", {
    httpMethod,
    apiPath,
    pathParams: {
      orderId: orderId
    }
  });

  return res;
}


function getOrdersTest() {
  const prop = PropertiesService.getScriptProperties().getProperties();

  const executor = SpApiExecutor.createSpApiExecutor({
    refreshToken: prop.REFRESH_TOKEN,
    lwaClientId: prop.LWA_CLIENT_ID,
    lwaClientSecret: prop.LWA_CLIENT_SECRET,
    iamAccessKey: prop.IAM_USER_ACCESS_KEY,
    iamSecretKey: prop.IAM_USER_SECRET_ACCESS_KEY,
  });

  const orders = getOrders(executor, {
    CreatedAfter: "2022-09-01T00:00:00Z",
    CreatedBefore: "2022-09-02T00:00:00Z"
  });

console.log(orders)
  orders.forEach(o => {
    const orderId = o.AmazonOrderId;
    console.log(orderId);
    const orderItems = getOrderItems(executor, orderId);
    orderItems.forEach(i => console.log(i));
  });
  const id = orders[0].AmazonOrderId
}
