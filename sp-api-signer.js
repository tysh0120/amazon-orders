/**
 * Amazon V4 署名クラス
 * https://developer-docs.amazon.com/sp-api/docs/connecting-to-the-selling-partner-api
 */
class SpApiSigner {
  /**
   * @param params {object} 
   * @param params.service {string} サービス名
   * @param params.awsRegion {string} リージョン (us-east-1など)
   * @param params.httpMethod {string} HTTPメソッド (GET/POSTなど)
   * @param params.apiPath {string} APIのパス情報
   * @param params.queryParams {object} クエリパラメタ key-value
   * @param params.headerParams {object} ヘッダ情報　key-value
   * @param params.body {string} リクエストボディ
   * @param params.timestamp {object} タイムスタンプに使用する日付オブジェクト
   * @param params.iamAccessKey {string} IAM User のシークレットアクセスキー
   */
  constructor({
      service,
      awsRegion,
      iamAccessKey,
      iamSecretKey,
      httpMethod,
      apiPath,
      queryParams,
      headerParams,
      body,
      datetime }) {
    this.service = service;
    this.awsRegion = awsRegion;
    this.iamAccessKey = iamAccessKey;
    this.iamSecretKey = iamSecretKey;
    this.httpMethod = httpMethod;
    this.apiPath = apiPath;
    this.queryParams = queryParams;
    this.headerParams = headerParams;
    this.body = body;
    this.timestamp = getISO8601Date(datetime);
    this.datestamp = this.timestamp.substring(0, 8);
  }

  /**
   * Cannonical Request 作成
   * // Step1 Create a canonical request
   * @return {string} canonnical request
   */
  composeCannonicalRequest() {
    // Step1. Create a canonical request
    const cannonicalRequest = [
      this.httpMethod,
      uriEncode(this.apiPath, true),
      encodeQueryParams(this.queryParams),
      encodeHeaderParams(this.headerParams),
      getSortedHashKeys(this.headerParams).join(";"),
      hexDigest(Utilities.DigestAlgorithm.SHA_256, this.body || ''),
    ].join("\n");

    return cannonicalRequest;

  }

  /**
   * 署名対象文字列作成
   * // Step3. Create a string to sign
   * @return {string} 署名対象文字列
   */
  getStrToSign() {
    // Scope作成
    const credintialScope = [
      this.datestamp,
      this.awsRegion,
      this.service,
      "aws4_request"
    ].join("/");

    // Step3. Create a string to sign
    const strToSign = [
      "AWS4-HMAC-SHA256",
      this.timestamp,
      credintialScope,
      hexDigest(Utilities.DigestAlgorithm.SHA_256,
                this.composeCannonicalRequest()),
    ].join("\n");

    return strToSign;
  }

  /**
   * 署名 V4
   * @param {string} strToSign 署名対象
   * @return {string} 署名
   */
  sign(strToSign) {
    // Step4. calculate signature
    const secretKey = this.iamSecretKey;
    const dateKey =
      Utilities.computeHmacSha256Signature(toBinary(this.datestamp),
                                           toBinary("AWS4" + secretKey));

    const dateRegionKey =
      Utilities.computeHmacSha256Signature(toBinary(this.awsRegion),
                                          toBinary(dateKey));

    const dateRegionServiceKey =
      Utilities.computeHmacSha256Signature(toBinary(this.service),
                                           dateRegionKey);
    const signingKey =
      Utilities.computeHmacSha256Signature(toBinary("aws4_request"),
                                           dateRegionServiceKey);
 
    const signature =
      encodeHexString(
        Utilities.computeHmacSha256Signature(toBinary(strToSign),
                                             signingKey)
      );

    return signature;
  }

  /**
   * Authorization　ヘッダの値を計算して返却 
   * @param params {object} パラメタ
   * @param params.service {string} サービス (ex. sts / execute-api)
   * @param params.httpMethod {string} HTTP メソッド (ex. GET/POST/PUT...)
   * @param params.apiPath {string} PATH (ex. /examplebucket/myphoto.jpg)
   * @param params.queryParams {object} クエリパラメタオブジェクト
   * @param params.headerParams {object} ヘッダオブジェクト
   * @param params.body {string} ボディ
   * @return {string} AuthorizationHeaderの値
   */
  getAuthorizationHeaderVal() {
    const credential = [
      this.iamAccessKey,
      this.datestamp,
      this.awsRegion,
      this.service,
      "aws4_request"
    ].join("/");

    return [
      "AWS4-HMAC-SHA256",
      `Credential=${credential},`,
      `SignedHeaders=${getSortedHashKeys(this.headerParams).join(";")},`,
      `Signature=${this.sign(this.getStrToSign())}`
      ].join(" ");
  }
}


function testSpApiSigner() {
  const iamAccessKey = PropertiesService.getScriptProperties().getProperty("IAM_USER_ACCESS_KEY");
  const roleArn = PropertiesService.getScriptProperties().getProperty("ROLE_ARN");
  const awsRegion = PropertiesService.getScriptProperties().getProperty("AWS_REGION");
  const datetime = new Date(2023, 9, 14, 10, 15, 19);

  const signer = new SpApiSigner({
    httpMethod: "GET",
    service: "sts",
    awsRegion,
    datetime,
    iamAccessKey,
    queryParams: {
      Version: '2011-06-15',
      Action: 'AssumeRole',
      RoleSessionName: 'Test',
      RoleArn: PropertiesService.getScriptProperties().getProperty("ROLE_ARN"),
      DurationSeconds: 3600,
    },
    headerParams: {
      host: "sts.amazonaws.com",
      "x-amz-date": this.timestamp
    }
  });

  console.log(signer.composeCannonicalRequest())
  console.log(signer.sign("kimura"))
  console.log(signer.getAuthorizationHeaderVal())
}