/**
 * 構成品一覧コードに登録された内容を取得
 */
class ConfigurationList {
  /**
   * コンストラクタ
   */
  constructor() {
    this.sheet =
      SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.CONFIGURATION_LIST);

    this.data = this.sheet.getDataRange().getValues().slice(1);

    // Code SubCodeとのマッピング
    this.codeCompMap = this.data.reduce((map, row) => {
      const key = row[0];
      map[key] = map[key] || [];
      map[key].push({name: row[3], variation: row[4], qty: row[5]});
      return map;
    }, {});
  }

  /**
   * コード、サブコードから構成品一覧取得
   * @param {string} asin
   */
  getComponentsByCode(asin) {
    return this.codeCompMap[asin] || [];
  }
}

const configList = new ConfigurationList();
