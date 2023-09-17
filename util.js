/**
 * Amazon式URI Encode
 * @param {string} エンコード対象文字列
 * @param {boolean} isPath
 * c.f
 * https://docs.aws.amazon.com/IAM/latest/UserGuide/create-signed-request.html
 * https://github.com/aws/aws-sdk-java/blob/master/aws-java-sdk-core/src/main/java/com/amazonaws/util/SdkHttpUtils.java#L66
 */
function uriEncode(str, isPath=false) {
  let encoded = encodeURIComponent(str);
  // パスを表す値の場合、「/」 をエンコードしない（isPath引数で指定）
  if (isPath) {
    encoded = encoded.replace(/%2F/g, "/");
  }
  return encoded;
}


/**
 * ハッシュ値取得
 * 内部でUtilities.computeDigestをコール
 * @param {string} ハッシュアルゴリズム (Utilities.DigestAlgorithm.xxx)
 * @param {string} 入力
 * @param {string} 文字コード (Utilities.Charset.xxx)
 * @return ハッシュ値
 */
function hexDigest(digestAlgorithm, input, charset=Utilities.Charset.UTF_8) {
  const rawHash = Utilities.computeDigest(digestAlgorithm, input, charset);
  return encodeHexString(rawHash);
}


/**
 * Base16エンコード
 * @param {string} bytes 入力バイト
 * @return エンコードした文字列
 */
function encodeHexString(bytes) {
  return bytes.reduce((txtHash, val) => {
    const adjustedVal = val < 0 ? val + 256 : val;
    const txtVal = adjustedVal.toString(16);
    txtHash += txtVal.length == 1 ? '0' + txtVal : txtVal;
    return txtHash;
  }, '');
}

/**
 * ISO8601形式日付文字列取得
 * @param {object} date
 * @return 日付文字列  YYYYMMDDThhmmssZ形式
 */
function getISO8601Date(date) {
  return Utilities.formatDate(date, "GMT", "yyyyMMdd'T'HHmmss'Z'");
}

/**
 * バイナリへ変換
 * @param {string} hexStr
 * @return {string} バイナリ文字列
 */
function toBinary(hexStr) {
  return Utilities.base64Decode(
    Utilities.base64Encode(hexStr)
  );
}

/**
 * パラメタオブジェクトからクエリ文字列抽出
 * @param {object} エンコード対象 キー値ペア
 * @param {array<string>} パスを表す項目のキー 
 * 　　　　　　　　　　　　　(指定された項目は、値の中の「/」をエンコードしない)
 * @return {string} クエリ文字列
 */
function encodeQueryParams(params, pathKeys=[]) {
  if (!params) return "";

  return Object.entries(params).
    map(r => [
      uriEncode(r[0]),
      uriEncode(r[1], pathKeys.includes(r[0])) // pathKeysに含まれるキーはパスとして第２引数にtrueを指定
    ]).
    sort((a, b) => a[0] < b[0] ? -1 : 1).
    map(r => `${r[0]}=${r[1]}`).join("&");
}

/**
 * オブジェクトのキーを小文字変換してソートした配列を返却する
 * @input {object} params オブジェクト
 * @return {array<string>} キーの配列
 */
function getSortedHashKeys(params) {
  if (!params) return "";
  return Object.keys(params).map(x => x.toLowerCase()).sort((a, b) => a < b ? -1 : 1);
}

/**
 * ヘッダオブジェクトからヘッダ文字列抽出
 * - キーは小文字変換、　値は前後の空白を除去
 * - キーの昇順にソート
 * @param {object} 入力オブジェクト
 * @return {array<string>} ヘッダ文字列
 * 　　　　　　　　　　　　　キー:値\nキー:値\n ...
 *        末尾は\n
 */
function encodeHeaderParams(params) {
  if (!params) return "";
  return Object.entries(params).
    map(r => [r[0].toLowerCase(), r[1] ? r[1].trim() : r[1]]).
    sort((a,b) => a[0] < b[0] ? -1 : 1).
    map(r => `${r[0]}:${r[1]}`).
    join("\n") + "\n";
}

/**
 * URL文字列からホスト名取得
 * @param {string} url
 * @return {string} ホスト名
 */
function getHostName(url) {
  const res = url.match(/\/\/([^\/?]+)/);
  return res && res[1];
}
