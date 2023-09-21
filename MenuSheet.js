/**
 * メインシートの読み取りクラス
 */
class MenuSheet {
  constructor() {
    this.sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.MENU);
    this.cellPos = MENU_SHEET.CELL_POSITION;
  }


  /**
   * MAINシートより開始時日時を取得
   * @return {object} 開始日時
   */
  getDateTimeFrom() {
    const date = this.sheet.getRange(this.cellPos.DATE_FROM).getValue();
    const time = this.sheet.getRange(this.cellPos.TIME_FROM).getValue();

    return new Date(date.getFullYear(), date.getMonth(), date.getDate(),
                    ...time.split(":").map(x => Number(x)));
  }

  /**
   * 開始日時をMAINシートに設定
   * @param {object} datetime
   */
  setDateTimeFrom(datetime) {
    this.sheet.getRange(this.cellPos.DATE_FROM).setValue(datetime);
    this.sheet.getRange(this.cellPos.TIME_FROM).setValue(Utilities.formatDate(datetime, 'JST', 'HH:mm:ss'));
  }

  /**
   * MAINシートより終了日時取得
   * @return {object} 終了日時
   */
  getDateTimeTo() {
    const date = this.sheet.getRange(this.cellPos.DATE_TO).getValue();
    const time = this.sheet.getRange(this.cellPos.TIME_TO).getValue();

    return new Date(date.getFullYear(), date.getMonth(), date.getDate(),
                    ...time.split(":").map(x => Number(x)))
  }

  /**
   * 終了日時をMAINシートに設定
   * @param {object} 終了日時
   */
  setDateTimeTo(datetime) {
    this.sheet.getRange(this.cellPos.DATE_TO).setValue(datetime);
    this.sheet.getRange(this.cellPos.TIME_TO).setValue(Utilities.formatDate(datetime, 'JST', 'HH:mm:ss'));
  }

  /**
   * 出力先 URL取得
   */
  getOutputSsUrl() {
    return this.sheet.getRange(this.cellPos.OUTPUT_URL).getValue();
  }
}

const menuSheet = new MenuSheet();
