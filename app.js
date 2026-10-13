(() => {
  const cfg = window.DERIV_CONFIG;

  let ws = null;
  let pingTimer = null;
  let currentSymbol = cfg.DEFAULT_SYMBOL || 'R_100';

  const ui = {
    token: document.getElementById('token'),
    symbol: document.getElementById('symbol'),
    btnConnect: document.getElementById('btn-connect'),
    btnDisconnect: document.getElementById('btn-disconnect'),
    status: document.getElementById('status'),
    loginid: document.getElementById('loginid'),
    accountType: document.getElementById('account-type'),
    balance: document.getElementById('balance'),
    lastQuote: document.getElementById('last-quote'),
    lastDigit: document.getElementById('last-digit'),
    activeSymbol: document.getElementById('active-symbol'),
    logBox: document.getElementById('log-box'),
  };

  function log(message, type = 'info') {
    const div = document.createElement('div');
    div.className =
      type === 'success' ? 'log-ok' :
      type === 'warn' ? 'log-warn' :
      type === 'error' ? 'log-error' :
      'log-info';
    div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    ui.logBox.prepend(div);
  }

  function setStatus(text, ok = false) {
    ui.status.textContent = text;
    ui.status.className = `font-bold ${ok ? 'text-emerald-400' : 'text-red-400'}`;
  }

  function money(value, currency = 'USD') {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }

  function extractLastDigit(quote) {
    const str = String(quote);
    const digits = str.match(/\d/g);
    if (!digits || !digits.length) return null;
    return Number(digits[digits.length - 1]);
  }

  function send(data) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      log('Tentativa de envio sem conexão aberta.', 'warn');
      return;
    }
    ws.send(JSON.stringify(data));
  }

  function subscribeData() {
    send({ balance: 1, subscribe: 1 });
    send({ ticks: currentSymbol, subscribe: 1 });
    ui.activeSymbol.textContent = currentSymbol;
    log(`Inscrito em saldo e ticks de ${currentSymbol}.`, 'success');
  }

  function clearConnectionState() {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }

    if (ws) {
      try {
        ws.close();
      } catch (_) {}
      ws = null;
    }

    setStatus('DESCONECTADO', false);
    ui.btnConnect.disabled = false;
    ui.btnDisconnect.disabled = true;
  }

  function connect() {
    const token = ui.token.value.trim();
    currentSymbol = ui.symbol.value;

    if (!token) {
      alert('Cole primeiro o seu API Token da Deriv.');
      return;
    }

    if (!cfg.PUBLIC_APP_ID) {
      alert('PUBLIC_APP_ID não configurado em config.js');
      return;
    }

    const url = `${cfg.WS_BASE_URL}?app_id=${encodeURIComponent(cfg.PUBLIC_APP_ID)}&l=${encodeURIComponent(cfg.LANG || 'PT')}`;

    log(`Abrindo WebSocket: ${url}`);
    setStatus('CONECTANDO...', false);

    ui.btnConnect.disabled = true;

    ws = new WebSocket(url);

    ws.onopen = () => {
      log('WebSocket conectado. Enviando authorize...', 'success');
      send({ authorize: token });

      pingTimer = setInterval(() => {
        send({ ping: 1 });
      }, 25000);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error) {
        log(`Erro API: ${data.error.code || ''} - ${data.error.message}`, 'error');
        return;
      }

      switch (data.msg_type) {
        case 'authorize':
          setStatus('CONECTADO', true);
          ui.btnDisconnect.disabled = false;
          ui.loginid.textContent = data.authorize.loginid || '-';
          ui.accountType.textContent = data.authorize.is_virtual ? 'DEMO' : 'REAL';
          ui.balance.textContent = money(data.authorize.balance, data.authorize.currency || 'USD');
          log(`Autorizado com sucesso na conta ${data.authorize.loginid}.`, 'success');
          subscribeData();
          break;

        case 'balance':
          ui.balance.textContent = money(data.balance.balance, data.balance.currency || 'USD');
          break;

        case 'tick': {
          const quote = data.tick.quote;
          const digit = extractLastDigit(quote);
          ui.lastQuote.textContent = quote;
          ui.lastDigit.textContent = digit ?? '-';
          break;
        }

        case 'ping':
          break;

        default:
          log(`Mensagem recebida: ${data.msg_type}`, 'info');
          break;
      }
    };

    ws.onerror = () => {
      log('Erro no WebSocket.', 'error');
    };

    ws.onclose = (event) => {
      log(`Conexão encerrada. Código: ${event.code}`, 'warn');
      clearConnectionState();
    };
  }

  function disconnect() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        send({ forget_all: 'ticks' });
      } catch (_) {}
    }
    clearConnectionState();
    log('Desconectado pelo usuário.', 'warn');
  }

  ui.btnConnect.addEventListener('click', connect);
  ui.btnDisconnect.addEventListener('click', disconnect);

  ui.symbol.addEventListener('change', () => {
    currentSymbol = ui.symbol.value;
    if (ws && ws.readyState === WebSocket.OPEN) {
      send({ forget_all: 'ticks' });
      send({ ticks: currentSymbol, subscribe: 1 });
      ui.activeSymbol.textContent = currentSymbol;
      log(`Ativo alterado para ${currentSymbol}.`, 'success');
    }
  });
})();
