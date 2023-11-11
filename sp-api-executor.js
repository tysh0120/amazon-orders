/**
 * SP-API実行クラス
 */
class SpApiExecutor {
  constructor(spApiConnector) {
    this.spApiConnector = spApiConnector;
  }

  /**
   * API実行
   * @param {string} httpMethod - HTTPメソッド
   * @param {string} apiPath - APIのパス
   * @param {object} queryParams - クエリパラメタ(キー値ペアオブジェクト)
   * @param {object} headerParams - ヘッダパラメタ(キー値ペアオブジェクト) 省略可
   * @param {string} body - リクエストボディ　- 文字列で指定（JSONならstringifyした状態）
   */
  execute({
    httpMethod,
    apiPath,
    queryParams,
    headerParams,
    pathParams,
    body,
  }) {
    // 現在時刻取得
    const now = new Date();
    // ヘッダ省略時はデフォルトのヘッダ取得
    if (!headerParams) {
      headerParams = this.composeDefaultHeader(now);
    } else {
      headerParams = {...headerParams, ...this.composeDefaultHeader(now)};
    }

    // URL
    const endpointUrl = URLS.SP_API_ENDPOINT;
    const signer = new SpApiSigner({
      service: "execute-api",
      awsRegion: AWS_REGION,
      iamAccessKey: this.spApiConnector.accessKeyId,
      iamSecretKey: this.spApiConnector.secretAccessKey,
      httpMethod,
      apiPath,
      queryParams,
      // 署名用ヘッダにはhostを含める（URLより推測して指定）
      headerParams: {...headerParams, ...{host: getHostName(endpointUrl)}},
      body: body || "",
      datetime: now
    });

    // Authorizationヘッダ追加
    headerParams.Authorization = signer.getAuthorizationHeaderVal();

    // リクエスト発行
    // 419 quota exceeded の場合、リトライ回数分リトライ
    let retryCount = 0;  // リトライ回数
    let responseCode; // レスポンスコード
    let result;
    do {
      console.log(responseCode, apiPath);   // debugs
      retryCount++;
      // エンドポイントにリクエスト発行
      result = UrlFetchApp.fetch(
        this.composeUrl(endpointUrl, apiPath, queryParams, pathParams), {
          muteHttpExceptions: true,
          method: httpMethod,
          headers: headerParams,
          payload: body
        }
      );
      responseCode = result.getResponseCode();
      // リトライ回数以内であればリトライ
      if (responseCode == 429 && retryCount < RETRY_COUNT) { // quota exceeded
        console.error(`execute 失敗 コード:`);
        console.log(`QUOTA  retryCount:[${retryCount}]  ${result.getResponseCode()}\n${result.getContentText()}`);
        // スリープ　間隔はインターバル * リトライ回数　　(回数が増えるほど長くなる)
        Utilities.sleep(RETRY_INTERVAL * retryCount);
        continue;
      } else if (responseCode >= 300) {
        console.error(`execute 失敗 コード:${result.getResponseCode()}\n${result.getContentText()}`);
        throw new Error(result.getContentText());
      }
    } while (responseCode >= 300)
    return JSON.parse(result.getContentText());
  }

  /**
   * ページ分割された一覧を全部取得
   * GET メソッドのみ対応
   * @param {string} listKey - payloadの結果リストのキー ex) Orders / OrderItems
   * @param {string} APIのパス
   * @param {object} クエリパラメタ(キー値ペアオブジェクト)
   * @param {object} ヘッダパラメタ(キー値ペアオブジェクト) 省略可
   * @param {string} リクエストボディ
   */
  getAllResults(listKey, {
    apiPath,
    queryParams,
    headerParams,
    pathParams,
  }) {
    const httpMethod = "GET";
    let nextToken;
    let resultList = [];
    do {
      // NextTokenがあるばああいはページ分割の次ページ取得のため、NextTokenをクエリパラメタに追加
      const qParamsWNextToken = nextToken ?
        {...queryParams, ...{NextToken: nextToken}} : queryParams;
      const res = this.execute({
        httpMethod, apiPath, queryParams: qParamsWNextToken, headerParams, pathParams
      });
      // ページ分割時はnextToken変数にNextTokenを設定
      if (res.NextToken) {
        nextToken = res.NextToken;
      }
      resultList = resultList.concat(res.payload[listKey]);
    } while (nextToken);
    return resultList;
  }

  /**
   * デフォルトのヘッダ組み立て
   * @param {object} 日付
   * @return {object} ヘッダオブジェクト
   */
  composeDefaultHeader(date) {
    // host, user-agent は、GASで自動設定されるためここでは設定しない
    return {
      "x-amz-access-token": this.spApiConnector.accessToken,
      "x-amz-date": getISO8601Date(date),
    }
  }

  /**
   * URL 組み立て
   * @param {string} エンドポイントURL
   * @param {string} APIパス
   * @param {object} クエリパラメタ
   * @param {object} パスパラメタ
   * @return {string} URL
   */
  composeUrl(endpointUrl, apiPath, queryParams, pathParams) {
    // PATHパラメタ埋め込み (パス中にキーが {} で囲まれて定義されている)
    let resolvedPath = apiPath;

    if (pathParams && Object.keys(pathParams).length > 0) {
      const matches = resolvedPath.match(/(?<={)([^}]*)(?=})/g);
      matches.forEach(key => {
        const re = new RegExp(`{${key}}`);
        resolvedPath = resolvedPath.replace(re, pathParams[key]);
      });
    }

    return [
      endpointUrl + resolvedPath,
      encodeQueryParams(queryParams)
    ].filter(x => x).join("?");
  }

  /**
   * SP-API実行クラスインスタンス生成
   * @param {string} refreshToken
   * @param {string} lwaClientId
   * @param {string} lwaClientSecret
   * @param {string} iamAccessKey
   * @param {string} iamSecretKey
   * @param {string} roleArn
   * @return SP-API実行クラスインスタンス
   */
  static createSpApiExecutor({
    refreshToken,
    lwaClientId,
    lwaClientSecret,
    iamAccessKey,
    iamSecretKey,
    roleArn
  }) {
    const connector = new SpApiConnector({
      refreshToken,
      lwaClientId,
      lwaClientSecret,
      iamAccessKey,
      iamSecretKey
    });
    connector.requestAccessToken();
    connector.requestAssumeRole(roleArn);

    return new SpApiExecutor(connector);
  }
}


/**
 * SP-API実行クラスインスタンス生成
 * @param {string} refreshToken
 * @param {string} lwaClientId
 * @param {string} lwaClientSecret
 * @param {string} iamAccessKey
 * @param {string} iamSecretKey
 * @return SP-API実行クラスインスタンス
 */
function createSpApiExecutor({
    refreshToken,
    lwaClientId,
    lwaClientSecret,
    iamAccessKey,
    iamSecretKey,
    roleArn
}) {
  return SpApiExecutor.createSpApiExecutor({
    refreshToken,
    lwaClientId,
    lwaClientSecret,
    iamAccessKey,
    iamSecretKey,
    roleArn
  });
}
