(() => {
  const cfg = window.DERIV_CONFIG;

  const state = {
    oauthSession: null,
    ws: null,
    pingTimer: null,
    reconnectTimer: null,
    reconnectAttempts: 0,
    manualDisconnect: false,

    isConnected: false,
    isRunning: false,
    isPaused: false,
    isTrading: false,

    currentAccountIndex: 0,
    currentLoginId: '',
    isVirtual: null,

    balance: 0,
    startBalance: 0,
    currency: 'USD',

    symbol: 'R_100',
    currentStrategy: 'OVER1',
    nextStrategyAfterSettlement: null,

    ticks: [],
    seenTickKeys: new Set(),
    maxTicks: 50,

    reqSeq: 0,
    pendingProposalReqId: null,
    pendingBuyReqId: null,
    pendingTrade: null,
    openContractId: null,

    initialStake: 0.35,
    currentStake: 0.35,
    mgLevel: 0,

    totalTrades: 0,
    wins: 0,
    losses: 0,
    consecutiveLosses: 0,
    maxConsecutiveLossesSeen: 0,
    sessionProfit: 0,
    maxStakeUsed: 0,

    history: []
  };

  const ui = {
    btnOAuthLogin: document.getElementById('btn-oauth-login'),
    btnLogout: document.getElementById('btn-logout'),
    connectionBadge: document.getElementById('connection-badge'),
    accountSelect: document.getElementById('account-select'),
    accountType: document.getElementById('account-type'),
    balance: document.getElementById('balance'),

    symbol: document.getElementById('symbol'),
    stake: document.getElementById('stake'),
    firstStrategy: document.getElementById('first-strategy'),
    useMartingale: document.getElementById('use-martingale'),
    mgMultiplier: document.getElementById('mg-multiplier'),
    mgMaxSteps: document.getElementById('mg-max-steps'),
    takeProfit: document.getElementById('take-profit'),
    stopLoss: document.getElementById('stop-loss'),
    maxTrades: document.getElementById('max-trades'),
    maxConsecLosses: document.getElementById('max-consec-losses'),
    maxStake: document.getElementById('max-stake'),
    minBalance: document.getElementById('min-balance'),

    btnStart: document.getElementById('btn-start'),
    btnPause: document.getElementById('btn-pause'),
    btnResume: document.getElementById('btn-resume'),
    btnStop: document.getElementById('btn-stop'),
    btnEmergency: document.getElementById('btn-emergency'),

    botState: document.getElementById('bot-state'),
    currentStrategy: document.getElementById('current-strategy'),
    currentStakeDisplay: document.getElementById('current-stake-display'),
    mgLevelDisplay: document.getElementById('mg-level-display'),
    reasonBox: document.getElementById('reason-box'),

    count50Low: document.getElementById('count-50-low'),
    count50High: document.getElementById('count-50-high'),
    pct50Low: document.getElementById('pct-50-low'),
    pct50High: document.getElementById('pct-50-high'),
    condOver50: document.getElementById('cond-over-50'),
    condUnder50: document.getElementById('cond-under-50'),

    count10Low: document.getElementById('count-10-low'),
    count10High: document.getElementById('count-10-high'),
    condOver10: document.getElementById('cond-over-10'),
    condUnder10: document.getElementById('cond-under-10'),

    digitStream: document.getElementById('digit-stream'),
    logBox: document.getElementById('log-box'),

    statTotal: document.getElementById('stat-total'),
    statWin: document.getElementById('stat-win'),
    statLoss: document.getElementById('stat-loss'),
    statRate: document.getElementById('stat-rate'),
    statProfit: document.getElementById('stat-profit'),
    statMaxLossStreak: document.getElementById('stat-max-loss-streak'),
    statMaxStakeUsed: document.getElementById('stat-max-stake-used'),
    statBalanceStart: document.getElementById('stat-balance-start'),
    statBalanceCurrent: document.getElementById('stat-balance-current'),

    historyBody: document.getElementById('history-body')
  };

  function log(message, type = 'info') {
    const div = document.createElement('div');
    const cls =
      type === 'success' ? 'log-ok' :
      type === 'warn' ? 'log-warn' :
      type === 'error' ? 'log-error' :
      'log-info';
    div.className = cls;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    ui.logBox.prepend(div);
  }

  function money(value) {
    return `${state.currency} ${Number(value || 0).toFixed(2)}`;
  }

  function round2(n) {
    return Math.round(Number(n) * 100) / 100;
  }

  function setConnectionBadge(text, ok = false) {
    ui.connectionBadge.textContent = text;
    ui.connectionBadge.className = `px-3 py-2 rounded-xl font-semibold text-sm ${ok ? 'bg-emerald-700' : 'bg-red-700'}`;
  }

  function setBotState(text, cls = 'text-cyan-400') {
    ui.botState.textContent = text;
    ui.botState.className = `font-bold ${cls}`;
  }

  function setReason(text) {
    ui.reasonBox.textContent = text;
  }

  function readSettings() {
    return {
      stake: Math.max(0, Number(ui.stake.value || 0)),
      firstStrategy: ui.firstStrategy.value,
      useMartingale: ui.useMartingale.checked,
      mgMultiplier: Math.max(1, Number(ui.mgMultiplier.value || 1)),
      mgMaxSteps: Math.max(0, Number(ui.mgMaxSteps.value || 0)),
      takeProfit: Number(ui.takeProfit.value || 0),
      stopLoss: Number(ui.stopLoss.value || 0),
      maxTrades: Math.max(0, Number(ui.maxTrades.value || 0)),
      maxConsecLosses: Math.max(0, Number(ui.maxConsecLosses.value || 0)),
      maxStake: Math.max(0, Number(ui.maxStake.value || 0)),
      minBalance: Math.max(0, Number(ui.minBalance.value || 0))
    };
  }

  function updateStats() {
    ui.statTotal.textContent = state.totalTrades;
    ui.statWin.textContent = state.wins;
    ui.statLoss.textContent = state.losses;
    const rate = state.totalTrades ? ((state.wins / state.totalTrades) * 100).toFixed(2) : '0.00';
    ui.statRate.textContent = `${rate}%`;
    ui.statProfit.textContent = money(state.sessionProfit);
    ui.statMaxLossStreak.textContent = state.maxConsecutiveLossesSeen;
    ui.statMaxStakeUsed.textContent = money(state.maxStakeUsed);
    ui.statBalanceStart.textContent = state.startBalance ? money(state.startBalance) : '-';
    ui.statBalanceCurrent.textContent = money(state.balance);
    ui.currentStakeDisplay.textContent = money(state.currentStake);
    ui.mgLevelDisplay.textContent = String(state.mgLevel);
  }

  function renderHistory() {
    ui.historyBody.innerHTML = '';
    for (const row of state.history.slice(0, 20)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-2">${row.time}</td>
        <td class="py-2">${row.loginid}</td>
        <td class="py-2">${row.symbol}</td>
        <td class="py-2">${row.strategy}</td>
        <td class="py-2">${money(row.stake)}</td>
        <td class="py-2 ${row.result === 'WIN' ? 'history-win' : 'history-loss'}">${row.result}</td>
        <td class="py-2 ${row.profit >= 0 ? 'history-win' : 'history-loss'}">${money(row.profit)}</td>
      `;
      ui.historyBody.appendChild(tr);
    }
  }

  function renderDigits() {
    ui.digitStream.innerHTML = '';
    for (const d of state.ticks) {
      const span = document.createElement('span');
      span.className = 'digit-box ' + (d <= 1 ? 'digit-low' : d >= 8 ? 'digit-high' : 'digit-neutral');
      span.textContent = d;
      ui.digitStream.appendChild(span);
    }
  }

  function extractLastDigit(value) {
    const str = String(value);
    const matches = str.match(/\d/g);
    if (!matches || !matches.length) return null;
    return Number(matches[matches.length - 1]);
  }

  function tickKeyFromLiveTick(tick) {
    return tick.id || tick.tick_id || `${tick.symbol || ''}:${tick.epoch}:${tick.quote}`;
  }

  function pushDigit(digit, key) {
    if (digit === null || Number.isNaN(digit)) return;
    if (key && state.seenTickKeys.has(key)) return;

    if (key) {
      state.seenTickKeys.add(key);
      if (state.seenTickKeys.size > 300) {
        state.seenTickKeys = new Set(Array.from(state.seenTickKeys).slice(-150));
      }
    }

    state.ticks.push(digit);
    if (state.ticks.length > state.maxTicks) state.ticks.shift();
  }

  function analyzeWindows() {
    const last50 = state.ticks.slice(-50);
    const last10 = state.ticks.slice(-10);

    const count50Low = last50.filter(d => d <= 1).length;
    const count50High = last50.filter(d => d >= 8).length;
    const count10Low = last10.filter(d => d <= 1).length;
    const count10High = last10.filter(d => d >= 8).length;

    const pct50Low = last50.length ? ((count50Low / last50.length) * 100).toFixed(2) : '0.00';
    const pct50High = last50.length ? ((count50High / last50.length) * 100).toFixed(2) : '0.00';

    const condOver50 = count50Low >= 13;
    const condOver10 = count10Low >= 5;
    const condUnder50 = count50High >= 13;
    const condUnder10 = count10High >= 5;

    ui.count50Low.textContent = count50Low;
    ui.count50High.textContent = count50High;
    ui.pct50Low.textContent = `${pct50Low}%`;
    ui.pct50High.textContent = `${pct50High}%`;
    ui.condOver50.textContent = condOver50 ? 'SIM' : 'NÃO';
    ui.condUnder50.textContent = condUnder50 ? 'SIM' : 'NÃO';

    ui.count10Low.textContent = count10Low;
    ui.count10High.textContent = count10High;
    ui.condOver10.textContent = condOver10 ? 'SIM' : 'NÃO';
    ui.condUnder10.textContent = condUnder10 ? 'SIM' : 'NÃO';

    return {
      last50,
      last10,
      count50Low,
      count50High,
      count10Low,
      count10High,
      condOver50,
      condOver10,
      condUnder50,
      condUnder10
    };
  }

  function riskBlockReason() {
    const s = readSettings();

    if (!state.isConnected) return 'Sem conexão autorizada.';
    if (state.balance < s.minBalance) return 'Saldo abaixo do mínimo configurado.';
    if (s.maxTrades > 0 && state.totalTrades >= s.maxTrades) return 'Máximo de operações da sessão atingido.';
    if (s.stopLoss > 0 && Math.abs(state.sessionProfit) >= s.stopLoss && state.sessionProfit < 0) return 'Stop loss da sessão atingido.';
    if (s.takeProfit > 0 && state.sessionProfit >= s.takeProfit) return 'Meta de lucro atingida.';
    if (s.maxConsecLosses > 0 && state.consecutiveLosses >= s.maxConsecLosses) return 'Máximo de perdas consecutivas atingido.';
    if (s.maxStake > 0 && state.currentStake > s.maxStake) return 'Próxima entrada excede o valor máximo por operação.';
    if (state.currentStake > state.balance) return 'Saldo insuficiente para a próxima entrada.';
    return null;
  }

  function currentAccount() {
    if (!state.oauthSession?.accounts?.length) return null;
    return state.oauthSession.accounts[state.currentAccountIndex] || null;
  }

  function buildOAuthUrl() {
    const oauthState = (window.crypto?.randomUUID?.() || String(Date.now()));
    sessionStorage.setItem('deriv_oauth_expected_state', oauthState);

    const url = new URL(cfg.OAUTH_AUTHORIZE_URL);
    url.searchParams.set('app_id', cfg.OAUTH_APP_ID);
    url.searchParams.set('redirect_uri', cfg.REDIRECT_URI);
    url.searchParams.set('state', oauthState);
    url.searchParams.set('l', cfg.LANG || 'PT');
    return url.toString();
  }

  function startOAuth() {
    if (!cfg.OAUTH_APP_ID || cfg.OAUTH_APP_ID.includes('COLE_AQUI')) {
      alert('Preencha o OAUTH_APP_ID em config.js com o App ID do seu app MeuRoboDigits.');
      return;
    }
    window.location.href = buildOAuthUrl();
  }

  function loadOAuthSession() {
    try {
      const raw = sessionStorage.getItem('deriv_oauth_session');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function logoutOAuth() {
    emergencyStop('Logout do usuário.');
    state.manualDisconnect = true;
    closeWs();
    sessionStorage.removeItem('deriv_oauth_session');
    sessionStorage.removeItem('deriv_oauth_expected_state');
    state.oauthSession = null;
    state.currentAccountIndex = 0;
    ui.accountSelect.innerHTML = '';
    ui.accountSelect.disabled = true;
    ui.btnLogout.disabled = true;
    ui.btnStart.disabled = true;
    ui.accountType.textContent = '-';
    ui.balance.textContent = '-';
    setConnectionBadge('DESCONECTADO', false);
    setReason('Desconectado. Faça login novamente.');
    log('Sessão local removida.', 'warn');
  }

  function renderAuthorizedAccounts() {
    ui.accountSelect.innerHTML = '';

    if (!state.oauthSession?.accounts?.length) {
      ui.accountSelect.disabled = true;
      return;
    }

    state.oauthSession.accounts.forEach((acc, idx) => {
      const opt = document.createElement('option');
      const isVirtual = String(acc.loginid).toUpperCase().includes('VRTC');
      opt.value = String(idx);
      opt.textContent = `${acc.loginid} ${isVirtual ? '(DEMO)' : '(REAL)'} ${acc.currency || ''}`.trim();
      ui.accountSelect.appendChild(opt);
    });

    const defaultIndex = state.oauthSession.accounts.findIndex(a => String(a.loginid).toUpperCase().includes('VRTC'));
    state.currentAccountIndex = defaultIndex >= 0 ? defaultIndex : 0;
    ui.accountSelect.value = String(state.currentAccountIndex);
    ui.accountSelect.disabled = false;
    ui.btnLogout.disabled = false;
  }

  function wsAppId() {
    return cfg.WS_APP_ID && cfg.WS_APP_ID.trim() ? cfg.WS_APP_ID.trim() : cfg.OAUTH_APP_ID.trim();
  }

  function send(data) {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return false;
    state.ws.send(JSON.stringify(data));
    return true;
  }

  function clearTimers() {
    if (state.pingTimer) clearInterval(state.pingTimer);
    if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
    state.pingTimer = null;
    state.reconnectTimer = null;
  }

  function closeWs() {
    clearTimers();
    if (state.ws) {
      try {
        state.ws.onopen = null;
        state.ws.onmessage = null;
        state.ws.onerror = null;
        state.ws.onclose = null;
        if (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING) {
          state.ws.close();
        }
      } catch {}
    }
    state.ws = null;
    state.isConnected = false;
  }

  function scheduleReconnect() {
    if (state.manualDisconnect || !state.oauthSession?.accounts?.length) return;
    const wait = Math.min(15000, 2000 * Math.max(1, state.reconnectAttempts + 1));
    state.reconnectAttempts += 1;
    log(`Reconexão em ${wait / 1000}s...`, 'warn');
    state.reconnectTimer = setTimeout(() => connectSelectedAccount(), wait);
  }

  function connectSelectedAccount() {
    const acc = currentAccount();
    if (!acc) {
      setReason('Nenhuma conta OAuth disponível.');
      return;
    }

    state.manualDisconnect = false;
    closeWs();

    const url = `${cfg.WS_BASE_URL}?app_id=${encodeURIComponent(wsAppId())}&l=${encodeURIComponent(cfg.LANG || 'PT')}`;
    log(`Abrindo WebSocket para ${acc.loginid}...`);
    setConnectionBadge('CONECTANDO...', false);

    state.ws = new WebSocket(url);

    state.ws.onopen = () => {
      log('WebSocket aberto. Autorizando sessão OAuth...');
      send({ authorize: acc.token });
      state.pingTimer = setInterval(() => {
        send({ ping: 1 });
      }, 25000);
    };

    state.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleMessage(data);
    };

    state.ws.onerror = () => {
      log('Erro de rede no WebSocket.', 'error');
    };

    state.ws.onclose = (event) => {
      state.isConnected = false;
      setConnectionBadge('DESCONECTADO', false);
      log(`WebSocket fechado. Código: ${event.code}`, 'error');
      clearTimers();

      if (!state.manualDisconnect) {
        if (state.isRunning) setBotState('ERRO / RECONECTANDO', 'text-red-400');
        scheduleReconnect();
      }
    };
  }

  function refreshMarketData() {
    if (!state.isConnected) return;
    state.symbol = ui.symbol.value;

    send({ forget_all: 'ticks' });

    state.ticks = [];
    state.seenTickKeys.clear();
    renderDigits();

    send({
      ticks_history: state.symbol,
      count: 50,
      end: 'latest',
      style: 'ticks'
    });

    send({
      ticks: state.symbol,
      subscribe: 1
    });
  }

  function subscribeBalance() {
    send({ balance: 1, subscribe: 1 });
  }

  function subscribeOpenContract(contractId) {
    send({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 });
  }

  function handleApiError(data) {
    const msg = data?.error?.message || 'Erro desconhecido da API';
    log(`API: ${msg}`, 'error');

    const code = data?.error?.code || '';
    if (code === 'InvalidToken' || code === 'AuthorizationRequired') {
      setReason('Sessão OAuth inválida ou expirada. Faça login novamente.');
      state.manualDisconnect = true;
      closeWs();
      setConnectionBadge('SESSÃO EXPIRADA', false);
      return;
    }

    if (data?.msg_type === 'proposal' || data?.echo_req?.proposal === 1 || data?.req_id === state.pendingProposalReqId) {
      state.isTrading = false;
      state.pendingProposalReqId = null;
      state.pendingBuyReqId = null;
      state.pendingTrade = null;
      setBotState('AGUARDANDO SINAL', 'text-cyan-400');
    }

    if (data?.msg_type === 'buy' || data?.echo_req?.buy) {
      state.isTrading = false;
      state.pendingBuyReqId = null;
      state.pendingTrade = null;
      setBotState('AGUARDANDO SINAL', 'text-cyan-400');
    }
  }

  function handleMessage(data) {
    if (data.error) {
      handleApiError(data);
      return;
    }

    switch (data.msg_type) {
      case 'authorize': {
        state.reconnectAttempts = 0;
        state.isConnected = true;
        state.currentLoginId = data.authorize.loginid;
        state.isVirtual = !!data.authorize.is_virtual;
        state.balance = Number(data.authorize.balance || 0);
        state.currency = data.authorize.currency || 'USD';

        if (!state.startBalance) state.startBalance = state.balance;

        ui.accountType.textContent = state.isVirtual ? 'DEMO' : 'REAL';
        ui.balance.textContent = money(state.balance);
        setConnectionBadge('CONECTADO', true);
        ui.btnStart.disabled = false;
        updateStats();

        log(`Autorizado com sucesso: ${state.currentLoginId}`, 'success');
        subscribeBalance();

        if (state.isRunning || state.isPaused) {
          refreshMarketData();
          if (state.openContractId) subscribeOpenContract(state.openContractId);
        }

        setReason('Conta conectada. Pronto para iniciar.');
        break;
      }

      case 'balance': {
        state.balance = Number(data.balance.balance || 0);
        ui.balance.textContent = money(state.balance);
        updateStats();
        break;
      }

      case 'history': {
        const prices = data.history?.prices || [];
        const times = data.history?.times || [];
        state.ticks = [];
        state.seenTickKeys.clear();

        prices.forEach((price, i) => {
          const digit = extractLastDigit(price);
          const key = `history:${times[i] || i}:${price}`;
          pushDigit(digit, key);
        });

        renderDigits();
        analyzeAndMaybeTrade();
        break;
      }

      case 'tick': {
        const tick = data.tick;
        const digit = extractLastDigit(tick.quote);
        const key = tickKeyFromLiveTick(tick);
        pushDigit(digit, key);
        renderDigits();
        analyzeAndMaybeTrade();
        break;
      }

      case 'proposal': {
        if (data.req_id !== state.pendingProposalReqId || !state.pendingTrade) return;

        const proposal = data.proposal;
        const ask = Number(proposal.ask_price || 0);
        const payout = Number(proposal.payout || 0);

        log(`Proposta recebida. Custo: ${money(ask)} | Payout: ${money(payout)}`);

        if (ask > state.balance) {
          state.isTrading = false;
          state.pendingTrade = null;
          setReason('Compra bloqueada: custo da proposta maior que o saldo.');
          setBotState('AGUARDANDO SINAL', 'text-cyan-400');
          return;
        }

        const buyReqId = ++state.reqSeq;
        state.pendingBuyReqId = buyReqId;

        send({
          buy: proposal.id,
          price: ask,
          req_id: buyReqId
        });

        setBotState('ENVIANDO COMPRA', 'text-fuchsia-400');
        break;
      }

      case 'buy': {
        if (!state.pendingTrade) return;

        state.openContractId = data.buy.contract_id;
        state.nextStrategyAfterSettlement = state.pendingTrade.nextStrategy;
        log(`Compra aceita. Contract ID: ${state.openContractId}`, 'success');

        subscribeOpenContract(state.openContractId);
        setBotState('OPERAÇÃO ABERTA', 'text-amber-400');
        setReason('Contrato aceito pela Deriv. Aguardando liquidação.');
        break;
      }

      case 'proposal_open_contract': {
        const c = data.proposal_open_contract;
        if (String(c.contract_id) !== String(state.openContractId)) return;
        if (!c.is_sold) return;
        settleContract(c);
        break;
      }

      case 'ping':
        break;
    }
  }

  function settleContract(contract) {
    const profit = Number(contract.profit || 0);
    const isWin = profit > 0;
    const strategyUsed = state.pendingTrade?.strategyLabel || 'N/A';
    const symbolUsed = state.pendingTrade?.symbol || state.symbol;
    const stakeUsed = state.pendingTrade?.stake || state.currentStake;

    state.sessionProfit = round2(state.sessionProfit + profit);
    state.totalTrades += 1;

    if (isWin) {
      state.wins += 1;
      state.consecutiveLosses = 0;
      state.currentStake = state.initialStake;
      state.mgLevel = 0;
      log(`WIN confirmado. Lucro: ${money(profit)}`, 'success');
    } else {
      state.losses += 1;
      state.consecutiveLosses += 1;
      state.maxConsecutiveLossesSeen = Math.max(state.maxConsecutiveLossesSeen, state.consecutiveLosses);
      log(`LOSS confirmado. Resultado: ${money(profit)}`, 'error');

      const s = readSettings();
      if (s.useMartingale) {
        if (state.mgLevel < s.mgMaxSteps) {
          const nextStake = round2(state.currentStake * s.mgMultiplier);
          if (s.maxStake > 0 && nextStake > s.maxStake) {
            log('Martingale bloqueado: próxima entrada excederia o máximo permitido.', 'warn');
            state.currentStake = state.initialStake;
            state.mgLevel = 0;
          } else {
            state.currentStake = nextStake;
            state.mgLevel += 1;
            log(`Martingale aplicado. Nível ${state.mgLevel}. Próxima entrada: ${money(state.currentStake)}`, 'warn');
          }
        } else {
          log('Limite de níveis do Martingale atingido. Resetando entrada.', 'warn');
          state.currentStake = state.initialStake;
          state.mgLevel = 0;
        }
      } else {
        state.currentStake = state.initialStake;
        state.mgLevel = 0;
      }
    }

    state.maxStakeUsed = Math.max(state.maxStakeUsed, stakeUsed);

    state.history.unshift({
      time: new Date().toLocaleTimeString(),
      loginid: state.currentLoginId,
      symbol: symbolUsed,
      strategy: strategyUsed,
      stake: stakeUsed,
      result: isWin ? 'WIN' : 'LOSS',
      profit
    });

    renderHistory();
    updateStats();

    state.openContractId = null;
    state.isTrading = false;
    state.pendingProposalReqId = null;
    state.pendingBuyReqId = null;
    state.pendingTrade = null;

    if (state.nextStrategyAfterSettlement) {
      state.currentStrategy = state.nextStrategyAfterSettlement;
      state.nextStrategyAfterSettlement = null;
      ui.currentStrategy.textContent = state.currentStrategy;
    }

    const block = riskBlockReason();
    if (block) {
      stopBot(block);
      return;
    }

    if (state.isRunning && !state.isPaused) {
      setBotState('AGUARDANDO SINAL', 'text-cyan-400');
      setReason('Operação encerrada. Aguardando próximo sinal da estratégia da vez.');
    }
  }

  function analyzeAndMaybeTrade() {
    const a = analyzeWindows();

    if (!state.isRunning) {
      setReason('Robô parado.');
      return;
    }

    if (state.isPaused) {
      setBotState('PAUSADO', 'text-amber-400');
      setReason('Robô pausado pelo usuário.');
      return;
    }

    if (state.ticks.length < 50) {
      setBotState(`COLETANDO ${state.ticks.length}/50`, 'text-slate-300');
      setReason('Aguardando acumular 50 ticks válidos antes de operar.');
      return;
    }

    if (state.openContractId) {
      setBotState('AGUARDANDO RESULTADO', 'text-amber-400');
      setReason('Há uma operação em andamento. Novas entradas bloqueadas.');
      return;
    }

    if (state.isTrading) {
      setBotState('PROCESSANDO ENTRADA', 'text-fuchsia-400');
      return;
    }

    const block = riskBlockReason();
    if (block) {
      stopBot(block);
      return;
    }

    setBotState('ANALISANDO', 'text-cyan-400');

    if (state.currentStrategy === 'OVER1') {
      const ok = a.condOver50 && a.condOver10;
      setReason(ok
        ? 'Entrada autorizada para OVER 1: janela 50 >= 13 ocorrências de 0/1 e janela 10 >= 5 ocorrências de 0/1.'
        : `OVER 1 bloqueado: janela50=${a.count50Low}/13 | janela10=${a.count10Low}/5`);

      if (ok) {
        requestTrade({
          contractType: 'DIGITOVER',
          barrier: '1',
          strategyLabel: 'OVER 1',
          nextStrategy: 'UNDER8',
          snapshot: a
        });
      }
      return;
    }

    if (state.currentStrategy === 'UNDER8') {
      const ok = a.condUnder50 && a.condUnder10;
      setReason(ok
        ? 'Entrada autorizada para UNDER 8: janela 50 >= 13 ocorrências de 8/9 e janela 10 >= 5 ocorrências de 8/9.'
        : `UNDER 8 bloqueado: janela50=${a.count50High}/13 | janela10=${a.count10High}/5`);

      if (ok) {
        requestTrade({
          contractType: 'DIGITUNDER',
          barrier: '8',
          strategyLabel: 'UNDER 8',
          nextStrategy: 'OVER1',
          snapshot: a
        });
      }
    }
  }

  function requestTrade(signal) {
    if (state.isTrading || state.openContractId || !state.isConnected) return;

    const block = riskBlockReason();
    if (block) {
      stopBot(block);
      return;
    }

    const reqId = ++state.reqSeq;
    state.pendingProposalReqId = reqId;
    state.isTrading = true;

    state.pendingTrade = {
      ...signal,
      symbol: ui.symbol.value,
      stake: state.currentStake,
      loginid: state.currentLoginId
    };

    log(`Solicitando proposta: ${signal.strategyLabel} | stake=${money(state.currentStake)} | ativo=${ui.symbol.value}`);
    setBotState('CONSULTANDO PROPOSTA', 'text-fuchsia-400');

    send({
      proposal: 1,
      amount: state.currentStake,
      basis: 'stake',
      contract_type: signal.contractType,
      currency: state.currency,
      duration: 1,
      duration_unit: 't',
      symbol: ui.symbol.value,
      barrier: signal.barrier,
      req_id: reqId
    });
  }

  function startBot() {
    if (!state.isConnected) {
      setReason('Conecte e autorize uma conta antes de iniciar.');
      return;
    }

    const s = readSettings();

    if (s.stake <= 0) {
      alert('Valor de entrada inválido.');
      return;
    }

    state.initialStake = round2(s.stake);
    state.currentStake = round2(s.stake);
    state.currentStrategy = s.firstStrategy;
    state.symbol = ui.symbol.value;

    state.isRunning = true;
    state.isPaused = false;
    state.isTrading = false;
    state.openContractId = null;
    state.pendingTrade = null;
    state.pendingProposalReqId = null;
    state.pendingBuyReqId = null;
    state.nextStrategyAfterSettlement = null;
    state.ticks = [];
    state.seenTickKeys.clear();

    ui.currentStrategy.textContent = state.currentStrategy;
    updateStats();
    renderDigits();

    ui.btnStart.disabled = true;
    ui.btnPause.disabled = false;
    ui.btnResume.disabled = true;
    ui.btnStop.disabled = false;

    setBotState('INICIANDO', 'text-cyan-400');
    setReason('Carregando histórico de ticks e iniciando análise.');
    refreshMarketData();
    log('Robô iniciado.', 'success');
  }

  function pauseBot(reason = 'Pausado.') {
    state.isPaused = true;
    ui.btnPause.disabled = true;
    ui.btnResume.disabled = false;
    setBotState('PAUSADO', 'text-amber-400');
    setReason(reason);
    log(reason, 'warn');
  }

  function resumeBot() {
    if (!state.isRunning) return;
    state.isPaused = false;
    ui.btnPause.disabled = false;
    ui.btnResume.disabled = true;
    setBotState('ANALISANDO', 'text-cyan-400');
    setReason('Robô retomado.');
    log('Robô retomado.', 'success');
    analyzeAndMaybeTrade();
  }

  function stopBot(reason = 'Robô parado.') {
    state.isRunning = false;
    state.isPaused = false;
    state.isTrading = false;
    state.pendingProposalReqId = null;
    state.pendingBuyReqId = null;
    state.pendingTrade = null;

    ui.btnStart.disabled = !state.isConnected;
    ui.btnPause.disabled = true;
    ui.btnResume.disabled = true;
    ui.btnStop.disabled = true;

    setBotState('PARADO', 'text-slate-300');
    setReason(reason);
    log(reason, 'warn');

    send({ forget_all: 'ticks' });
  }

  function emergencyStop(reason = 'Parada de emergência acionada.') {
    stopBot(reason);
    log('Parada de emergência executada.', 'error');
  }

  function bindEvents() {
    ui.btnOAuthLogin.addEventListener('click', startOAuth);
    ui.btnLogout.addEventListener('click', logoutOAuth);

    ui.accountSelect.addEventListener('change', () => {
      state.currentAccountIndex = Number(ui.accountSelect.value || 0);
      log('Conta alterada. Reconectando...', 'warn');
      state.manualDisconnect = true;
      closeWs();
      connectSelectedAccount();
    });

    ui.symbol.addEventListener('change', () => {
      if (state.isConnected && state.isRunning) {
        log('Ativo alterado. Recarregando ticks...', 'warn');
        refreshMarketData();
      }
    });

    ui.btnStart.addEventListener('click', startBot);
    ui.btnPause.addEventListener('click', () => pauseBot('Robô pausado pelo usuário.'));
    ui.btnResume.addEventListener('click', resumeBot);
    ui.btnStop.addEventListener('click', () => stopBot('Robô parado pelo usuário.'));
    ui.btnEmergency.addEventListener('click', () => emergencyStop());
  }

  function bootstrap() {
    bindEvents();
    state.oauthSession = loadOAuthSession();

    ui.currentStrategy.textContent = '-';
    updateStats();

    if (state.oauthSession?.accounts?.length) {
      renderAuthorizedAccounts();
      setReason('Sessão OAuth encontrada. Conectando conta...');
      connectSelectedAccount();
    } else {
      setReason('Clique em "Conectar com Deriv" para autenticar via OAuth.');
    }
  }

  bootstrap();
})();