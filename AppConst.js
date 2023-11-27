const SHEET_NAMES = {
  MENU: "MENU",
  CONFIGURATION_LIST: "構成品情報",
}

const MENU_SHEET = {
  CELL_POSITION: {
    DATE_FROM: "D10",
    TIME_FROM: "E10",
    DATE_TO: "H10",
    TIME_TO: "I10",
    OUTPUT_URL: "G24",
  }
}

const URLS = {
  STS_ENDPOINT: "https://sts.amazonaws.com",
  TOKEN_ENDPOINT: "https://api.amazon.com/auth/o2/token",
  SP_API_ENDPOINT: "https://sellingpartnerapi-fe.amazon.com",
}
const AWS_REGION = "us-east-1";

const MARKET_PLACE_ID = "A1VC38T7YXB528";// 日本


// 429 QUOTA EXCEEDED 時のリトライ回数
const RETRY_COUNT = 10;
const RETRY_INTERVAL = 1000;
