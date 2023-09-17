/**
 * SP-API接続クラス
 * - アクセストークン取得機能
 * - AssumeRole機能
 * c.f. Connecting to the Selling Partner API
 * https://developer-docs.amazon.com/sp-api/docs/connecting-to-the-selling-partner-api
 */
class SpApiConnector {
  /**
   * コンストラクタ
   * @param {string} refreshToken
   * @param {string} lwaClientId
   * @param {string} lwaClientSecret
   * @param {string} iamAccessKey
   * @param {string} iamSecretKey
   */
  constructor({
    refreshToken,
    lwaClientId,
    lwaClientSecret,
    iamAccessKey,
    iamSecretKey,
  }) {
    this.refreshToken = refreshToken;
    this.lwaClientId = lwaClientId;
    this.lwaClientSecret = lwaClientSecret;
    this._iamAccessKey = iamAccessKey;
    this._iamSecretKey = iamSecretKey;
    this.prop = PropertiesService.getScriptProperties().getProperties();
  }

  /**
   * アクセストークンを返却
   * @return {string} アクセストークン
   */
  get accessToken() {
    return this._accessToken;
  }

  /**
   * IAM ユーザのアクセスキーを取得
   * @return {string} IAMユーザのアクセスキー
   * 注） Roleが関連づいているAPIコール時は、本プロパティでなはくaccessKeyIdを指定
   */
  get iamAccessKey() {
    return this._iamAccessKey;
  }

  /**
   * IAM ユーザのシークレットアクセスキーを取得
   * @return {string} IAMユーザのシークレットアクセスキー
   * 注） Roleが関連づいているAPIコール時は、本プロパティではなくsecretAccessKeyを指定
   */
  get iamSecretKey() {
    return this._iamSecretKey;
  }

  /**
   * AssumeRoleで発行されたアクセスキーIDを取得
   * @return {string} アクセスキーID
   */
  get accessKeyId() {
    return this._accessKeyId;
  }

  /**
   * AssumeRoleで発行されたシークレットアクセスキーを取得
   * @return {string} シークレットアクセスキー
   */
  get secretAccessKey() {
    return this._secretAccessKey;
  }

  /**
   * AssumeRoleで発行されたセショントークンを取得
   * @return {string} SessionToken
   */
  get sessionToken() {
    return this._sessionToken;
  }

  /**
   * LWA AccessTokenを取得する
   */
  requestAccessToken() {
    const url = this.prop.TOKEN_ENDPOINT;
    const payload = {
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.lwaClientId,
      client_secret: this.lwaClientSecret
    }

    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      payload
    });
    const resObj = JSON.parse(res.getContentText())
    this._accessToken = resObj.access_token;
  }

  /**
   * STS Assume Role
   * STSエンドポイントに接続してAssumeRoleのリクエストを行う
   * @param {string} roleArn
   */
  requestAssumeRole(roleArn) {
    const now = new Date();
    const endpointUrl = this.prop.STS_ENDPOINT;

    const queryParams = {
      Version: '2011-06-15',
      Action: 'AssumeRole',
      RoleSessionName: 'Test',
      RoleArn: this.prop.ROLE_ARN,
      DurationSeconds: 3600,
    };

    // host キーは AWSが自動設定するため指定しない
    const headerParams = {
      "x-amz-date": getISO8601Date(now)
    }
    // 署名計算用ヘッダにはhostを付ける
    const headerParamsForSign = {
      ...headerParams,
      ...{host: getHostName(endpointUrl)}
    }

    // 署名計算クラス生成
    const awsRegion = this.prop.AWS_REGION;
    const signer = new SpApiSigner({
      service: "sts",
      awsRegion,
      iamAccessKey: this._iamAccessKey,
      iamSecretKey: this._iamSecretKey,
      httpMethod: "GET",
      apiPath: '/',
      queryParams,
      headerParams: headerParamsForSign,
      body: "",
      datetime: now
    });

    headerParams.Authorization = signer.getAuthorizationHeaderVal();

    // エンドポイントに接続
    const res = UrlFetchApp.fetch(endpointUrl + "/?" + encodeQueryParams(queryParams), {
      muteHttpExceptions: true,
      headers: headerParams
    });
    if (res.getResponseCode() != 200) {
      console.error("STS AssumeRole失敗 コード:" + res.getResponseCode());
      return false;
    }

    // 結果をメンバに保存
    const contentText = res.getContentText();
    const parseResult = contentText.match(
      /<AccessKeyId>(.*?)<\/AccessKeyId>[\s\S]*?<SecretAccessKey>(.*?)<\/SecretAccessKey>[\s\S]*?<SessionToken>(.*?)<\/SessionToken>/
    );
    if (!parseResult[1] || !parseResult[2] || !parseResult[3]) {
      console.error("STS AssumeRole 予期しないフォーマットが返却されました\n" + contentText);
      return;
    }
    this._accessKeyId = parseResult[1];
    this._secretAccessKey = parseResult[2];
    this._sessionToken = parseResult[3];
  }
}

function stsTest() {
  const prop = PropertiesService.getScriptProperties().getProperties();
  //const url = prop.STS_ENDPOINT;
  const conn = new SpApiConnector({
    refreshToken: prop.REFRESH_TOKEN,
    lwaClientId: prop.LWA_CLIENT_ID,
    lwaClientSecret: prop.LWA_CLIENT_SECRET,
    iamAccessKey: prop.IAM_USER_ACCESS_KEY,
    iamSecretKey: prop.IAM_USER_SECRET_ACCESS_KEY
  });

  conn.requestAccessToken()
  console.log(conn.accessToken);

  conn.requestAssumeRole(prop.ROLE_ARN);
}
