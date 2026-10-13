window.DERIV_CONFIG = {
  // Coloque aqui o App ID exibido em Apps > MeuRoboDigits
  // Ex.: "34Fk4VV6Js1PFedrTWDNY"
  OAUTH_APP_ID: "34Fk4vv6JslPFedrTWDNY",

  // Se vazio, o sistema tentará usar o mesmo do OAuth no WebSocket.
  // Se a Deriv reclamar especificamente do WS app_id, depois ajustamos.
  WS_APP_ID: "",

  REDIRECT_URI: "http://localhost:5500/callback.html",
  OAUTH_AUTHORIZE_URL: "https://oauth.deriv.com/oauth2/authorize",
  WS_BASE_URL: "wss://ws.derivws.com/websockets/v3",
  LANG: "PT"
};