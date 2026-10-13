<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deriv Trader Pro - Digits Strategy</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="style.css">
</head>
<body class="bg-gray-900 text-white font-sans">
    <div class="container mx-auto p-4">
        <!-- CABEÇALHO -->
        <header class="flex justify-between items-center bg-gray-800 p-4 rounded-lg shadow-lg mb-6 border border-gray-700">
            <div>
                <h1 class="text-2xl font-bold text-blue-400">Deriv Trader Pro</h1>
                <p class="text-sm text-gray-400">Estratégia Digits: Over 1 / Under 8</p>
            </div>
            <div class="flex gap-4 items-center">
                <div id="status-badge" class="px-3 py-1 rounded-full text-sm font-bold bg-red-600">DESCONECTADO</div>
                <div id="account-type" class="text-lg font-mono text-yellow-400"></div>
                <div class="text-2xl font-bold text-green-400" id="balance-display">$ 0.00</div>
            </div>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- PAINEL DE CONFIGURAÇÃO -->
            <div class="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
                <h2 class="text-xl font-bold mb-4 border-b border-gray-600 pb-2">1. Conexão & Configuração</h2>
                
                <div class="grid grid-cols-3 gap-2 mb-2">
                    <div class="col-span-1">
                        <label class="block text-sm mb-1 text-gray-300">App ID:</label>
                        <input type="text" id="app-id" class="w-full p-2 bg-gray-700 rounded text-white border border-gray-600 font-mono text-sm" placeholder="Ex: 36300">
                    </div>
                    <div class="col-span-2">
                        <label class="block text-sm mb-1 text-gray-300">Token API Deriv:</label>
                        <input type="password" id="api-token" class="w-full p-2 bg-gray-700 rounded text-white border border-gray-600 text-sm" placeholder="Cole seu token (Read, Trade)...">
                    </div>
                </div>
                
                <button id="btn-connect" class="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded font-bold mb-6 transition mt-2">Conectar à Deriv</button>

                <!-- Restante da interface permanece igual -->
                <h3 class="font-bold text-lg mb-2 text-gray-300">Gerenciamento de Risco</h3>
                <div class="grid grid-cols-2 gap-2 mb-4">
                    <div>
                        <label class="block text-xs">Valor Inicial ($)</label>
                        <input type="number" id="stake" value="0.35" step="0.01" class="w-full p-1 bg-gray-700 rounded text-white">
                    </div>
                    <div>
                        <label class="block text-xs">Meta de Lucro ($)</label>
                        <input type="number" id="take-profit" value="5.00" class="w-full p-1 bg-gray-700 rounded text-white">
                    </div>
                    <div>
                        <label class="block text-xs">Limite de Perda ($)</label>
                        <input type="number" id="stop-loss" value="10.00" class="w-full p-1 bg-gray-700 rounded text-white">
                    </div>
                    <div>
                        <label class="block text-xs">Ativo</label>
                        <select id="symbol" class="w-full p-1 bg-gray-700 rounded text-white">
                            <option value="R_100">Volatility 100 Index</option>
                            <option value="R_50">Volatility 50 Index</option>
                            <option value="1HZ100V">Vol 100 (1s) Index</option>
                        </select>
                    </div>
                </div>

                <h3 class="font-bold text-lg mb-2 text-gray-300 flex justify-between items-center">
                    Martingale
                    <input type="checkbox" id="use-martingale" class="w-4 h-4" checked>
                </h3>
                <div class="grid grid-cols-2 gap-2 mb-6">
                    <div>
                        <label class="block text-xs">Multiplicador</label>
                        <input type="number" id="mg-multiplier" value="4.5" step="0.1" class="w-full p-1 bg-gray-700 rounded text-white">
                    </div>
                    <div>
                        <label class="block text-xs">Máx Níveis</label>
                        <input type="number" id="mg-max-steps" value="3" class="w-full p-1 bg-gray-700 rounded text-white">
                    </div>
                </div>

                <div class="flex gap-2">
                    <button id="btn-start" class="w-1/2 bg-green-600 hover:bg-green-700 p-3 rounded font-bold transition disabled:opacity-50" disabled>INICIAR ROBÔ</button>
                    <button id="btn-stop" class="w-1/2 bg-red-600 hover:bg-red-700 p-3 rounded font-bold transition disabled:opacity-50" disabled>PARAR (EMERGÊNCIA)</button>
                </div>
            </div>

            <!-- PAINEL DE ANÁLISE EM TEMPO REAL -->
            <div class="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700 md:col-span-2">
                <h2 class="text-xl font-bold mb-4 border-b border-gray-600 pb-2">2. Análise Contínua de Dígitos</h2>
                
                <div class="flex justify-between items-center mb-4 bg-gray-900 p-3 rounded">
                    <div>
                        <p class="text-sm text-gray-400">Estratégia da Vez:</p>
                        <p id="current-strategy" class="text-2xl font-bold text-purple-400">AGUARDANDO...</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-400">Estado do Robô:</p>
                        <p id="bot-state" class="text-xl font-bold text-blue-400">PAUSADO</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="bg-gray-700 p-3 rounded">
                        <h4 class="font-bold text-center mb-2">Janela 50 Dígitos</h4>
                        <div class="flex justify-between text-sm">
                            <span>Dígitos (0 e 1): <strong id="count-50-low" class="text-blue-300">0</strong></span>
                            <span>Alvo: >= 13</span>
                        </div>
                        <div class="flex justify-between text-sm mt-1">
                            <span>Dígitos (8 e 9): <strong id="count-50-high" class="text-red-300">0</strong></span>
                            <span>Alvo: >= 13</span>
                        </div>
                    </div>
                    <div class="bg-gray-700 p-3 rounded">
                        <h4 class="font-bold text-center mb-2">Janela 10 Dígitos</h4>
                        <div class="flex justify-between text-sm">
                            <span>Dígitos (0 e 1): <strong id="count-10-low" class="text-blue-300">0</strong></span>
                            <span>Alvo: >= 5</span>
                        </div>
                        <div class="flex justify-between text-sm mt-1">
                            <span>Dígitos (8 e 9): <strong id="count-10-high" class="text-red-300">0</strong></span>
                            <span>Alvo: >= 5</span>
                        </div>
                    </div>
                </div>

                <div class="mb-4">
                    <p class="text-sm text-gray-400 mb-1">Últimos 50 Dígitos Recebidos:</p>
                    <div id="digit-stream" class="flex flex-wrap gap-1 font-mono text-sm break-all bg-black p-2 rounded h-24 overflow-hidden border border-gray-600">
                    </div>
                </div>
            </div>
        </div>

        <!-- PAINEL DE RESULTADOS E LOGS -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div class="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
                <h2 class="text-xl font-bold mb-4 border-b border-gray-600 pb-2">Estatísticas da Sessão</h2>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <p>Total de Operações: <strong id="stat-total">0</strong></p>
                    <p>Vitórias: <strong id="stat-win" class="text-green-400">0</strong></p>
                    <p>Derrotas: <strong id="stat-loss" class="text-red-400">0</strong></p>
                    <p>Lucro/Prejuízo: <strong id="stat-profit">$ 0.00</strong></p>
                    <p>Nível Martingale Atual: <strong id="stat-mg">0</strong></p>
                    <p>Entrada Atual ($): <strong id="stat-current-stake">0.00</strong></p>
                </div>
            </div>

            <div class="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
                <h2 class="text-xl font-bold mb-4 border-b border-gray-600 pb-2">Log de Eventos</h2>
                <div id="log-box" class="h-40 overflow-y-auto bg-black p-2 rounded text-xs font-mono text-gray-300 border border-gray-600">
                </div>
            </div>
        </div>
    </div>
    <script src="bot.js"></script>
</body>
</html>