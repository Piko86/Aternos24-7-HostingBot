'use strict';

const mineflayer = require('mineflayer');
const { Movements, pathfinder, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;
const config = require('./settings.json');
const express = require('express');
const http = require('http');
const https = require('https');

// ============================================================
// EXPRESS SERVER - Keep Render/Aternos alive
// ============================================================
const app = express();
const PORT = process.env.PORT || 5000;

// Bot state tracking
let botState = {
  connected: false,
  lastActivity: Date.now(),
  reconnectAttempts: 0,
  startTime: Date.now(),
  errors: [],
  wasThrottled: false
};

// Health check endpoint for monitoring
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <title>${config.name} | Premium Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/svg+xml" href="https://cdn.iconscout.com/icon/free/png-512/free-minecraft-icon-svg-download-png-282774.png?f=webp&w=256">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg-gradient: linear-gradient(135deg, #0a0f1e 0%, #1a1f35 100%);
            --glass-bg: rgba(255, 255, 255, 0.03);
            --glass-border: rgba(255, 255, 255, 0.05);
            --glass-highlight: rgba(255, 255, 255, 0.02);
            --accent-primary: #6366f1;
            --accent-secondary: #8b5cf6;
            --accent-glow: rgba(99, 102, 241, 0.5);
            --success: #10b981;
            --success-glow: rgba(16, 185, 129, 0.3);
            --danger: #ef4444;
            --danger-glow: rgba(239, 68, 68, 0.3);
            --text-primary: #ffffff;
            --text-secondary: rgba(255, 255, 255, 0.7);
            --text-tertiary: rgba(255, 255, 255, 0.4);
            --card-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: var(--bg-gradient);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            position: relative;
            overflow-x: hidden;
        }

        body::before {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
            pointer-events: none;
        }

        .container {
            max-width: 500px;
            width: 100%;
            position: relative;
            z-index: 10;
        }

        .dashboard-card {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 40px;
            padding: 40px;
            box-shadow: var(--card-shadow);
            position: relative;
            overflow: hidden;
        }

        .dashboard-card::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, 
                var(--accent-primary), 
                var(--accent-secondary), 
                var(--accent-primary));
            border-radius: 42px;
            z-index: -1;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .dashboard-card:hover::before {
            opacity: 0.15;
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
        }

        .bot-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
            border-radius: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            box-shadow: 0 20px 30px -10px var(--accent-glow);
            position: relative;
        }

        .bot-icon::before {
            content: '';
            position: absolute;
            inset: -3px;
            background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
            border-radius: 27px;
            opacity: 0.5;
            filter: blur(10px);
            z-index: -1;
        }

        .bot-icon svg {
            width: 40px;
            height: 40px;
            filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
        }

        h1 {
            font-size: 2rem;
            font-weight: 700;
            background: linear-gradient(135deg, #fff, #a5b4fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }

        .server-badge {
            display: inline-block;
            background: rgba(99, 102, 241, 0.2);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 100px;
            padding: 8px 16px;
            font-size: 0.875rem;
            color: var(--text-secondary);
            backdrop-filter: blur(10px);
        }

        .server-badge strong {
            color: var(--accent-primary);
            font-weight: 600;
        }

        .stats-grid {
            display: grid;
            gap: 16px;
            margin-bottom: 24px;
        }

        .stat-item {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 24px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.03);
            transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .stat-item:hover {
            transform: translateY(-2px);
            border-color: rgba(99, 102, 241, 0.3);
        }

        .stat-label {
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-tertiary);
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .stat-label svg {
            width: 16px;
            height: 16px;
            opacity: 0.5;
        }

        .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .status-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            position: relative;
        }

        .status-dot.online {
            background: var(--success);
            box-shadow: 0 0 20px var(--success-glow);
        }

        .status-dot.online::before {
            content: '';
            position: absolute;
            inset: -3px;
            background: var(--success);
            border-radius: 50%;
            opacity: 0.3;
            animation: pulse 2s infinite;
        }

        .status-dot.offline {
            background: var(--danger);
            box-shadow: 0 0 20px var(--danger-glow);
        }

        .status-dot.offline::before {
            content: '';
            position: absolute;
            inset: -3px;
            background: var(--danger);
            border-radius: 50%;
            opacity: 0.3;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); opacity: 0.3; }
            70% { transform: scale(1.5); opacity: 0; }
            100% { transform: scale(1); opacity: 0; }
        }

        .coords-badge {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
            padding: 8px 16px;
            border-radius: 100px;
            font-size: 1rem;
            font-weight: 600;
            border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .cta-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
            color: white;
            text-decoration: none;
            padding: 18px 24px;
            border-radius: 100px;
            font-weight: 600;
            font-size: 1rem;
            margin-top: 32px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .cta-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s ease;
        }

        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 30px -10px var(--accent-glow);
        }

        .cta-button:hover::before {
            left: 100%;
        }

        .cta-button svg {
            width: 20px;
            height: 20px;
        }

        .footer {
            text-align: center;
            margin-top: 24px;
            font-size: 0.75rem;
            color: var(--text-tertiary);
            letter-spacing: 0.5px;
        }

        .refresh-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: rgba(255, 255, 255, 0.03);
            padding: 4px 8px;
            border-radius: 100px;
            margin-top: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="dashboard-card">
            <div class="header">
                <div class="bot-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C8 2 5 5 5 9V13C5 16.86 8 20 12 20C16 20 19 16.86 19 13V9C19 5 16 2 12 2Z" fill="white" fill-opacity="0.9"/>
                        <path d="M15 13C15 14.66 13.66 16 12 16C10.34 16 9 14.66 9 13C9 11.34 10.34 10 12 10C13.66 10 15 11.34 15 13Z" fill="url(#gradient)"/>
                        <defs>
                            <linearGradient id="gradient" x1="9" y1="10" x2="15" y2="16" gradientUnits="userSpaceOnUse">
                                <stop stop-color="#6366f1"/>
                                <stop offset="1" stop-color="#8b5cf6"/>
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <h1>${config.name}</h1>
                <div class="server-badge">
                    <strong>⛏️</strong> ${config.server.ip}
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <circle cx="12" cy="12" r="2" fill="currentColor"/>
                        </svg>
                        System Status
                    </div>
                    <div class="stat-value">
                        <div class="status-indicator">
                            <span id="status-dot" class="status-dot"></span>
                            <span id="status-text">Connecting...</span>
                        </div>
                    </div>
                </div>

                <div class="stat-item">
                    <div class="stat-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Uptime
                    </div>
                    <div class="stat-value" id="uptime-text">
                        0h 0m 0s
                    </div>
                </div>

                <div class="stat-item">
                    <div class="stat-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10.5C21 16 12 23 12 23C12 23 3 16 3 10.5C3 6.35786 7.02944 3 12 3C16.9706 3 21 6.35786 21 10.5Z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                        Current Position
                    </div>
                    <div class="stat-value">
                        <span class="coords-badge" id="coords-text">📍 Searching...</span>
                    </div>
                </div>
            </div>

            <a href="/tutorial" class="cta-button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 3H8C9.10457 3 10 3.89543 10 5V19C10 20.1046 9.10457 21 8 21H2V3Z"/>
                    <path d="M22 3H16C14.8954 3 14 3.89543 14 5V19C14 20.1046 14.8954 21 16 21H22V3Z"/>
                    <line x1="10" y1="9" x2="14" y2="9"/>
                    <line x1="10" y1="12" x2="14" y2="12"/>
                    <line x1="10" y1="15" x2="14" y2="15"/>
                </svg>
                View Setup Guide
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                </svg>
            </a>

            <div class="footer">
                <div>Premium AFK Bot Dashboard</div>
                <div class="refresh-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                        <path d="M23 4L23 10 17 10"/>
                        <path d="M1 20L1 14 7 14"/>
                        <path d="M3.51 9C4.01717 7.56678 4.87913 6.2854 6.01547 5.275C7.1518 4.2646 8.51853 3.55976 10 3.224C11.4815 2.88824 13.0166 2.93434 14.476 3.35775C15.9354 3.78116 17.2696 4.5653 18.37 5.63L23 10M1 14L5.63 18.37C6.7304 19.4347 8.0646 20.2188 9.524 20.6422C10.9834 21.0657 12.5185 21.1118 14 20.776C15.4815 20.4402 16.8482 19.7354 17.9845 18.725C19.1209 17.7146 19.9828 16.4332 20.49 15"/>
                    </svg>
                    Auto-refresh every 5 seconds
                </div>
            </div>
        </div>
    </div>

    <script>
        const statusText = document.getElementById('status-text');
        const statusDot = document.getElementById('status-dot');
        const uptimeText = document.getElementById('uptime-text');
        const coordsText = document.getElementById('coords-text');

        function formatUptime(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            return h + 'h ' + m + 'm ' + s + 's';
        }

        function updateStatusUI(status, uptime, coords) {
            if (status === 'connected') {
                statusText.innerText = 'Online & Running';
                statusDot.className = 'status-dot online';
            } else if (status === 'connecting') {
                statusText.innerText = 'Connecting...';
                statusDot.className = 'status-dot offline';
            } else {
                statusText.innerText = 'System Offline';
                statusDot.className = 'status-dot offline';
            }

            uptimeText.innerText = formatUptime(uptime || 0);

            if (coords && coords.x !== undefined) {
                coordsText.innerHTML = '📍 ' + Math.floor(coords.x) + ', ' + Math.floor(coords.y) + ', ' + Math.floor(coords.z);
            } else {
                coordsText.innerHTML = '📍 Searching...';
            }
        }

        async function fetchBotStatus() {
            try {
                const response = await fetch('/health');
                if (!response.ok) throw new Error('Network response was not ok');
                
                const data = await response.json();
                updateStatusUI(data.status, data.uptime, data.coords);
            } catch (error) {
                console.error('Failed to fetch bot status:', error);
                updateStatusUI('offline', 0, null);
            }
        }

        fetchBotStatus();
        setInterval(fetchBotStatus, 5000);

        document.querySelector('.dashboard-card').style.opacity = '0';
        document.querySelector('.dashboard-card').style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            document.querySelector('.dashboard-card').style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            document.querySelector('.dashboard-card').style.opacity = '1';
            document.querySelector('.dashboard-card').style.transform = 'translateY(0)';
        }, 100);
    </script>
</body>
</html>
  `);
});

app.get('/tutorial', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <title>${config.name} | Premium Setup Guide</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/svg+xml" href="https://cdn.iconscout.com/icon/free/png-512/free-minecraft-icon-svg-download-png-282774.png?f=webp&w=256">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg-gradient: linear-gradient(135deg, #0a0f1e 0%, #1a1f35 100%);
            --glass-bg: rgba(255, 255, 255, 0.03);
            --glass-border: rgba(255, 255, 255, 0.05);
            --accent-primary: #6366f1;
            --accent-secondary: #8b5cf6;
            --text-primary: #ffffff;
            --text-secondary: rgba(255, 255, 255, 0.7);
            --text-tertiary: rgba(255, 255, 255, 0.4);
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: var(--bg-gradient);
            color: var(--text-primary);
            min-height: 100vh;
            padding: 40px 20px;
            line-height: 1.6;
            position: relative;
        }

        body::before {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            background: radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
            pointer-events: none;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            position: relative;
            z-index: 10;
        }

        .back-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: var(--glass-bg);
            backdrop-filter: blur(10px);
            border: 1px solid var(--glass-border);
            padding: 12px 24px;
            border-radius: 100px;
            color: var(--text-primary);
            text-decoration: none;
            font-weight: 500;
            margin-bottom: 30px;
            transition: all 0.3s ease;
        }

        .back-button:hover {
            background: rgba(99, 102, 241, 0.2);
            border-color: var(--accent-primary);
            transform: translateX(-5px);
        }

        .page-title {
            font-size: 2.5rem;
            font-weight: 800;
            background: linear-gradient(135deg, #fff, #a5b4fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 16px;
        }

        .page-subtitle {
            color: var(--text-secondary);
            font-size: 1.1rem;
            margin-bottom: 40px;
            max-width: 600px;
        }

        .steps-grid {
            display: grid;
            gap: 24px;
            margin-bottom: 40px;
        }

        .step-card {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 30px;
            padding: 30px;
            position: relative;
            overflow: hidden;
            transition: transform 0.3s ease;
        }

        .step-card:hover {
            transform: translateY(-5px);
        }

        .step-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
            border-radius: 4px 4px 0 0;
        }

        .step-number {
            display: inline-block;
            background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
            color: white;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 100px;
            font-size: 0.875rem;
            margin-bottom: 16px;
        }

        .step-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 20px;
            color: var(--text-primary);
        }

        .step-list {
            list-style: none;
        }

        .step-list li {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 16px;
            color: var(--text-secondary);
        }

        .step-list li::before {
            content: '→';
            color: var(--accent-primary);
            font-weight: 600;
        }

        code {
            background: rgba(0, 0, 0, 0.3);
            padding: 4px 8px;
            border-radius: 8px;
            font-family: 'Fira Code', monospace;
            color: #a5b4fc;
            border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .link {
            color: var(--accent-primary);
            text-decoration: none;
            font-weight: 600;
            position: relative;
            transition: color 0.3s ease;
        }

        .link:hover {
            color: var(--accent-secondary);
        }

        .link::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            width: 100%;
            height: 1px;
            background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
            transform: scaleX(0);
            transform-origin: right;
            transition: transform 0.3s ease;
        }

        .link:hover::after {
            transform: scaleX(1);
            transform-origin: left;
        }

        .footer-note {
            text-align: center;
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            color: var(--text-tertiary);
            font-size: 0.875rem;
        }

        @media (max-width: 768px) {
            .container {
                padding: 0 20px;
            }
            
            .page-title {
                font-size: 2rem;
            }
            
            .step-card {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="/" class="back-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Dashboard
        </a>

        <h1 class="page-title">Setup Guide</h1>
        <p class="page-subtitle">Get your AFK bot running in under 15 minutes with this premium setup guide</p>

        <div class="steps-grid">
            <div class="step-card">
                <div class="step-number">Step 01</div>
                <h2 class="step-title">Configure Aternos Server</h2>
                <ul class="step-list">
                    <li>Go to <strong>Aternos</strong> and select your server</li>
                    <li>Install <strong>Paper/Bukkit</strong> as your server software</li>
                    <li>Enable <strong>Cracked</strong> mode (toggle the green switch)</li>
                    <li>Install essential plugins: <code>ViaVersion</code>, <code>ViaBackwards</code>, <code>ViaRewind</code></li>
                </ul>
            </div>

            <div class="step-card">
                <div class="step-number">Step 02</div>
                <h2 class="step-title">GitHub Repository Setup</h2>
                <ul class="step-list">
                    <li>Download the bot code as ZIP and extract the files</li>
                    <li>Configure <code>settings.json</code> with your server IP and port</li>
                    <li>Create a new <strong>GitHub repository</strong></li>
                    <li>Upload all files to your repository</li>
                </ul>
            </div>

            <div class="step-card">
                <div class="step-number">Step 03</div>
                <h2 class="step-title">Deploy on Render (24/7 Hosting)</h2>
                <ul class="step-list">
                    <li>Create a free account on <a href="https://render.com" target="_blank" class="link">Render.com</a></li>
                    <li>Click "New +" and select "Web Service"</li>
                    <li>Connect your GitHub repository</li>
                    <li>Configure build settings:
                        <br>• <strong>Build Command:</strong> <code>npm install</code>
                        <br>• <strong>Start Command:</strong> <code>npm start</code>
                    </li>
                    <li>Click "Create Web Service" and watch it deploy!</li>
                </ul>
            </div>
        </div>

        <div class="footer-note">
            <p>✨ Premium AFK Bot Dashboard — Always online, always reliable</p>
        </div>
    </div>
</body>
</html>
  `);
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'connected',
    uptime: process.uptime(),
    coords: {
      x: 123,
      y: 64,
      z: 456
    }
  });
});

app.get('/tutorial', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <title>${config.name} | Premium Setup Guide</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/svg+xml" href="https://cdn.iconscout.com/icon/free/png-512/free-minecraft-icon-svg-download-png-282774.png?f=webp&w=256">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg-gradient: linear-gradient(135deg, #0a0f1e 0%, #1a1f35 100%);
            --glass-bg: rgba(255, 255, 255, 0.03);
            --glass-border: rgba(255, 255, 255, 0.05);
            --accent-primary: #6366f1;
            --accent-secondary: #8b5cf6;
            --text-primary: #ffffff;
            --text-secondary: rgba(255, 255, 255, 0.7);
            --text-tertiary: rgba(255, 255, 255, 0.4);
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: var(--bg-gradient);
            color: var(--text-primary);
            min-height: 100vh;
            padding: 40px 20px;
            line-height: 1.6;
            position: relative;
        }

        body::before {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            background: radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
            pointer-events: none;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            position: relative;
            z-index: 10;
        }

        .back-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: var(--glass-bg);
            backdrop-filter: blur(10px);
            border: 1px solid var(--glass-border);
            padding: 12px 24px;
            border-radius: 100px;
            color: var(--text-primary);
            text-decoration: none;
            font-weight: 500;
            margin-bottom: 30px;
            transition: all 0.3s ease;
        }

        .back-button:hover {
            background: rgba(99, 102, 241, 0.2);
            border-color: var(--accent-primary);
            transform: translateX(-5px);
        }

        .page-title {
            font-size: 2.5rem;
            font-weight: 800;
            background: linear-gradient(135deg, #fff, #a5b4fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 16px;
        }

        .page-subtitle {
            color: var(--text-secondary);
            font-size: 1.1rem;
            margin-bottom: 40px;
            max-width: 600px;
        }

        .steps-grid {
            display: grid;
            gap: 24px;
            margin-bottom: 40px;
        }

        .step-card {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 30px;
            padding: 30px;
            position: relative;
            overflow: hidden;
            transition: transform 0.3s ease;
        }

        .step-card:hover {
            transform: translateY(-5px);
        }

        .step-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
            border-radius: 4px 4px 0 0;
        }

        .step-number {
            display: inline-block;
            background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
            color: white;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 100px;
            font-size: 0.875rem;
            margin-bottom: 16px;
        }

        .step-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 20px;
            color: var(--text-primary);
        }

        .step-list {
            list-style: none;
        }

        .step-list li {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 16px;
            color: var(--text-secondary);
        }

        .step-list li::before {
            content: '→';
            color: var(--accent-primary);
            font-weight: 600;
        }

        code {
            background: rgba(0, 0, 0, 0.3);
            padding: 4px 8px;
            border-radius: 8px;
            font-family: 'Fira Code', monospace;
            color: #a5b4fc;
            border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .link {
            color: var(--accent-primary);
            text-decoration: none;
            font-weight: 600;
            position: relative;
            transition: color 0.3s ease;
        }

        .link:hover {
            color: var(--accent-secondary);
        }

        .link::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            width: 100%;
            height: 1px;
            background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
            transform: scaleX(0);
            transform-origin: right;
            transition: transform 0.3s ease;
        }

        .link:hover::after {
            transform: scaleX(1);
            transform-origin: left;
        }

        .footer-note {
            text-align: center;
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            color: var(--text-tertiary);
            font-size: 0.875rem;
        }

        @media (max-width: 768px) {
            .container {
                padding: 0 20px;
            }
            
            .page-title {
                font-size: 2rem;
            }
            
            .step-card {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="/" class="back-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Dashboard
        </a>

        <h1 class="page-title">Setup Guide</h1>
        <p class="page-subtitle">Get your AFK bot running in under 15 minutes with this premium setup guide</p>

        <div class="steps-grid">
            <!-- Step 1 -->
            <div class="step-card">
                <div class="step-number">Step 01</div>
                <h2 class="step-title">Configure Aternos Server</h2>
                <ul class="step-list">
                    <li>Go to <strong>Aternos</strong> and select your server</li>
                    <li>Install <strong>Paper/Bukkit</strong> as your server software</li>
                    <li>Enable <strong>Cracked</strong> mode (toggle the green switch)</li>
                    <li>Install essential plugins: <code>ViaVersion</code>, <code>ViaBackwards</code>, <code>ViaRewind</code></li>
                </ul>
            </div>

            <!-- Step 2 -->
            <div class="step-card">
                <div class="step-number">Step 02</div>
                <h2 class="step-title">GitHub Repository Setup</h2>
                <ul class="step-list">
                    <li>Download the bot code as ZIP and extract the files</li>
                    <li>Configure <code>settings.json</code> with your server IP and port</li>
                    <li>Create a new <strong>GitHub repository</strong></li>
                    <li>Upload all files to your repository</li>
                </ul>
            </div>

            <!-- Step 3 -->
            <div class="step-card">
                <div class="step-number">Step 03</div>
                <h2 class="step-title">Deploy on Render (24/7 Hosting)</h2>
                <ul class="step-list">
                    <li>Create a free account on <a href="https://render.com" target="_blank" class="link">Render.com</a></li>
                    <li>Click "New +" and select "Web Service"</li>
                    <li>Connect your GitHub repository</li>
                    <li>Configure build settings:
                        <br>• <strong>Build Command:</strong> <code>npm install</code>
                        <br>• <strong>Start Command:</strong> <code>npm start</code>
                    </li>
                    <li>Click "Create Web Service" and watch it deploy!</li>
                </ul>
            </div>
        </div>

        <div class="footer-note">
            <p>✨ Premium AFK Bot Dashboard — Always online, always reliable</p>
        </div>
    </div>
</body>
</html>
  `);
});

app.get('/health', (req, res) => {
  res.json({
    status: botState.connected ? 'connected' : 'disconnected',
    uptime: Math.floor((Date.now() - botState.startTime) / 1000),
    coords: (bot && bot.entity) ? bot.entity.position : null,
    lastActivity: botState.lastActivity,
    reconnectAttempts: botState.reconnectAttempts,
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
  });
});

app.get('/ping', (req, res) => res.send('pong'));

// FIX: handle port conflict gracefully - try next port if taken
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] HTTP server started on port ${server.address().port} `);
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const fallbackPort = PORT + 1;
    console.log(`[Server] Port ${PORT} in use - trying port ${fallbackPort} `);
    server.listen(fallbackPort, '0.0.0.0');
  } else {
    console.log(`[Server] HTTP server error: ${err.message} `);
  }
});

// FIX: only one definition of formatUptime
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s} s`;
}

// ============================================================
// SELF-PING - Prevent Render from sleeping
// FIX: only ping if RENDER_EXTERNAL_URL is set (skip useless localhost ping)
// ============================================================
const SELF_PING_INTERVAL = 10 * 60 * 1000;

function startSelfPing() {
  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (!renderUrl) {
    console.log('[KeepAlive] No RENDER_EXTERNAL_URL set - self-ping disabled (running locally)');
    return;
  }
  setInterval(() => {
    const protocol = renderUrl.startsWith('https') ? https : http;
    protocol.get(`${renderUrl}/ping`, (res) => {
      // Silent success
    }).on('error', (err) => {
      console.log(`[KeepAlive] Self-ping failed: ${err.message}`);
    });
  }, SELF_PING_INTERVAL);
  console.log('[KeepAlive] Self-ping system started (every 10 min)');
}

startSelfPing();

// ============================================================
// MEMORY MONITORING
// ============================================================
setInterval(() => {
  const mem = process.memoryUsage();
  const heapMB = (mem.heapUsed / 1024 / 1024).toFixed(2);
  console.log(`[Memory] Heap: ${heapMB} MB`);
}, 5 * 60 * 1000);

// ============================================================
// BOT CREATION WITH RECONNECTION LOGIC
// ============================================================
// ============================================================
// RECONNECTION & TIMEOUT MANAGEMENT
// ============================================================
let bot = null;
let activeIntervals = [];
let reconnectTimeoutId = null;
let connectionTimeoutId = null;
let isReconnecting = false;

function clearBotTimeouts() {
  if (reconnectTimeoutId) {
    clearTimeout(reconnectTimeoutId);
    reconnectTimeoutId = null;
  }
  if (connectionTimeoutId) {
    clearTimeout(connectionTimeoutId);
    connectionTimeoutId = null;
  }
}

// FIX: Discord rate limiting - track last send time
let lastDiscordSend = 0;
const DISCORD_RATE_LIMIT_MS = 5000; // min 5s between webhook calls

function clearAllIntervals() {
  console.log(`[Cleanup] Clearing ${activeIntervals.length} intervals`);
  activeIntervals.forEach(id => clearInterval(id));
  activeIntervals = [];
}

function addInterval(callback, delay) {
  const id = setInterval(callback, delay);
  activeIntervals.push(id);
  return id;
}

function getReconnectDelay() {
  if (botState.wasThrottled) {
    botState.wasThrottled = false;
    const throttleDelay = 60000 + Math.floor(Math.random() * 60000);
    console.log(`[Bot] Throttle detected - using extended delay: ${throttleDelay / 1000}s`);
    return throttleDelay;
  }

  // FIX: read auto-reconnect-delay from settings as base delay
  const baseDelay = config.utils['auto-reconnect-delay'] || 3000;
  const maxDelay = config.utils['max-reconnect-delay'] || 30000;
  const delay = Math.min(baseDelay * Math.pow(2, botState.reconnectAttempts), maxDelay);
  const jitter = Math.floor(Math.random() * 2000);
  return delay + jitter;
}

function createBot() {
  if (isReconnecting) {
    console.log('[Bot] Already reconnecting, skipping...');
    return;
  }

  // Cleanup previous bot properly to avoid ghost bots
  if (bot) {
    clearAllIntervals();
    try {
      bot.removeAllListeners();
      bot.end();
    } catch (e) {
      console.log('[Cleanup] Error ending previous bot:', e.message);
    }
    bot = null;
  }

  console.log(`[Bot] Creating bot instance...`);
  console.log(`[Bot] Connecting to ${config.server.ip}:${config.server.port}`);

  try {
    // FIX: use version:false to auto-detect server version so the bot can join any server.
    // If the user explicitly sets a version in settings.json it is still respected.
    const botVersion = config.server.version && config.server.version.trim() !== '' ? config.server.version : false;
    bot = mineflayer.createBot({
      username: config['bot-account'].username,
      password: config['bot-account'].password || undefined,
      auth: config['bot-account'].type,
      host: config.server.ip,
      port: config.server.port,
      version: botVersion,
      hideErrors: false,
      checkTimeoutInterval: 600000
    });

    bot.loadPlugin(pathfinder);

    // FIX: connection timeout - end the old bot before reconnecting to avoid ghost bots
    clearBotTimeouts();
    connectionTimeoutId = setTimeout(() => {
      if (!botState.connected) {
        console.log('[Bot] Connection timeout - no spawn received');
        try {
          bot.removeAllListeners();
          bot.end();
        } catch (e) { /* ignore */ }
        bot = null;
        scheduleReconnect();
      }
    }, 150000); // 150s - Aternos servers can take 90-120s to finish spawning a player

    // FIX: guard against spawn firing twice (can happen on some servers)
    let spawnHandled = false;

    bot.once('spawn', () => {
      if (spawnHandled) return;
      spawnHandled = true;

      clearBotTimeouts();
      botState.connected = true;
      botState.lastActivity = Date.now();
      botState.reconnectAttempts = 0;
      isReconnecting = false;

      console.log(`[Bot] [+] Successfully spawned on server! (Version: ${bot.version})`);
      if (config.discord && config.discord.events && config.discord.events.connect) {
        sendDiscordWebhook(`[+] **Connected** to \`${config.server.ip}\``, 0x4ade80);
      }

      // FIX: use bot.version (auto-detected) instead of config value so minecraft-data always matches
      const mcData = require('minecraft-data')(bot.version);
      const defaultMove = new Movements(bot, mcData);
      defaultMove.allowFreeMotion = false;
      defaultMove.canDig = false;
      defaultMove.liquidCost = 1000;
      defaultMove.fallDamageCost = 1000;

      initializeModules(bot, mcData, defaultMove);

      // Attempt creative mode (only works if bot has OP and enabled in settings)
      setTimeout(() => {
        if (bot && botState.connected && config.server['try-creative']) {
          bot.chat('/gamemode creative');
          console.log('[INFO] Attempted to set creative mode (requires OP)');
        }
      }, 3000);

      bot.on('messagestr', (message) => {
        if (
          message.includes('commands.gamemode.success.self') ||
          message.includes('Set own game mode to Creative Mode')
        ) {
          console.log('[INFO] Bot is now in Creative Mode.');
        }
      });
    });

    // FIX: 'kicked' fires before 'end'. Remove the scheduleReconnect from 'kicked'
    // so that 'end' is the single source of reconnect truth, preventing double-trigger.
    bot.on('kicked', (reason) => {
      // FIX: stringify reason if it's an object to make it readable in logs
      const kickReason = typeof reason === 'object' ? JSON.stringify(reason) : reason;
      console.log(`[Bot] Kicked: ${kickReason}`);
      botState.connected = false;
      botState.errors.push({ type: 'kicked', reason: kickReason, time: Date.now() });
      clearAllIntervals();

      const reasonStr = String(kickReason).toLowerCase();
      if (reasonStr.includes('throttl') || reasonStr.includes('wait before reconnect') || reasonStr.includes('too fast')) {
        console.log('[Bot] Throttle kick detected - will use extended reconnect delay');
        botState.wasThrottled = true;
      }

      if (config.discord && config.discord.events && config.discord.events.disconnect) {
        sendDiscordWebhook(`[!] **Kicked**: ${kickReason}`, 0xff0000);
      }
      // NOTE: do NOT call scheduleReconnect() here - 'end' will fire right after 'kicked' and handle it
    });

    // FIX: 'end' is the single reconnect trigger
    bot.on('end', (reason) => {
      console.log(`[Bot] Disconnected: ${reason || 'Unknown reason'}`);
      botState.connected = false;
      clearAllIntervals();
      spawnHandled = false; // reset for next connection

      if (config.discord && config.discord.events && config.discord.events.disconnect && reason !== 'Periodic Rejoin') {
        sendDiscordWebhook(`[-] **Disconnected**: ${reason || 'Unknown'}`, 0xf87171);
      }

      if (config.utils['auto-reconnect']) {
        scheduleReconnect();
      }
    });

    bot.on('error', (err) => {
      const msg = err.message || '';
      console.log(`[Bot] Error: ${msg}`);
      botState.errors.push({ type: 'error', message: msg, time: Date.now() });
      // Don't reconnect on error - let 'end' event handle it
    });

  } catch (err) {
    console.log(`[Bot] Failed to create bot: ${err.message}`);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  clearBotTimeouts();

  // FIX: don't stack reconnect if already waiting
  if (isReconnecting) {
    console.log('[Bot] Reconnect already scheduled, skipping duplicate.');
    return;
  }

  isReconnecting = true;
  botState.reconnectAttempts++;

  const delay = getReconnectDelay();
  console.log(`[Bot] Reconnecting in ${delay / 1000}s (attempt #${botState.reconnectAttempts})`);

  reconnectTimeoutId = setTimeout(() => {
    reconnectTimeoutId = null;
    isReconnecting = false;
    createBot();
  }, delay);
}

// ============================================================
// MODULE INITIALIZATION
// ============================================================
function initializeModules(bot, mcData, defaultMove) {
  console.log('[Modules] Initializing all modules...');

  // ---------- AUTO AUTH (REACTIVE) ----------
  if (config.utils['auto-auth'] && config.utils['auto-auth'].enabled) {
    const password = config.utils['auto-auth'].password;
    let authHandled = false;

    const tryAuth = (type) => {
      if (authHandled || !bot || !botState.connected) return;
      authHandled = true;
      if (type === 'register') {
        bot.chat(`/register ${password} ${password}`);
        console.log('[Auth] Detected register prompt - sent /register');
      } else {
        bot.chat(`/login ${password}`);
        console.log('[Auth] Detected login prompt - sent /login');
      }
    };

    bot.on('messagestr', (message) => {
      if (authHandled) return;
      const msg = message.toLowerCase();
      if (msg.includes('/register') || msg.includes('register ') || msg.includes('지정된 비밀번호')) {
        tryAuth('register');
      } else if (msg.includes('/login') || msg.includes('login ') || msg.includes('로그인')) {
        tryAuth('login');
      }
    });

    // Failsafe: if no prompt after 10s, try login anyway
    setTimeout(() => {
      if (!authHandled && bot && botState.connected) {
        console.log('[Auth] No prompt detected after 10s, sending /login as failsafe');
        bot.chat(`/login ${password}`);
        authHandled = true;
      }
    }, 10000);
  }

  // ---------- CHAT MESSAGES ----------
  if (config.utils['chat-messages'] && config.utils['chat-messages'].enabled) {
    const messages = config.utils['chat-messages'].messages;
    if (config.utils['chat-messages'].repeat) {
      let i = 0;
      addInterval(() => {
        if (bot && botState.connected) {
          bot.chat(messages[i]);
          botState.lastActivity = Date.now();
          i = (i + 1) % messages.length;
        }
      }, config.utils['chat-messages']['repeat-delay'] * 1000);
    } else {
      messages.forEach((msg, idx) => {
        setTimeout(() => { if (bot && botState.connected) bot.chat(msg); }, idx * 1000);
      });
    }
  }

  // ---------- MOVE TO POSITION ----------
  // FIX: only use position goal if circle-walk is NOT enabled (they fight over pathfinder)
  if (config.position && config.position.enabled && !(config.movement && config.movement['circle-walk'] && config.movement['circle-walk'].enabled)) {
    bot.pathfinder.setMovements(defaultMove);
    bot.pathfinder.setGoal(new GoalBlock(config.position.x, config.position.y, config.position.z));
    console.log('[Position] Navigating to configured position...');
  }

  // ---------- ANTI-AFK ----------
  if (config.utils['anti-afk'] && config.utils['anti-afk'].enabled) {
    // Arm swinging
    addInterval(() => {
      if (!bot || !botState.connected) return;
      try { bot.swingArm(); } catch (e) { }
    }, 10000 + Math.floor(Math.random() * 50000));

    // Hotbar cycling
    addInterval(() => {
      if (!bot || !botState.connected) return;
      try {
        const slot = Math.floor(Math.random() * 9);
        bot.setQuickBarSlot(slot);
      } catch (e) { }
    }, 30000 + Math.floor(Math.random() * 90000));

    // Teabagging
    addInterval(() => {
      if (!bot || !botState.connected || typeof bot.setControlState !== 'function') return;
      if (Math.random() > 0.9) {
        let count = 2 + Math.floor(Math.random() * 4);
        const doTeabag = () => {
          if (count <= 0 || !bot || typeof bot.setControlState !== 'function') return;
          try {
            bot.setControlState('sneak', true);
            setTimeout(() => {
              if (bot && typeof bot.setControlState === 'function') bot.setControlState('sneak', false);
              count--;
              setTimeout(doTeabag, 150);
            }, 150);
          } catch (e) { }
        };
        doTeabag();
      }
    }, 120000 + Math.floor(Math.random() * 180000));

    // FIX: micro-walk only when circle-walk is NOT running, to avoid interrupting pathfinder
    if (!(config.movement && config.movement['circle-walk'] && config.movement['circle-walk'].enabled)) {
      addInterval(() => {
        if (!bot || !botState.connected || typeof bot.setControlState !== 'function') return;
        try {
          const yaw = Math.random() * Math.PI * 2;
          bot.look(yaw, 0, true);
          bot.setControlState('forward', true);
          setTimeout(() => {
            if (bot && typeof bot.setControlState === 'function') bot.setControlState('forward', false);
          }, 500 + Math.floor(Math.random() * 1500));
          botState.lastActivity = Date.now();
        } catch (e) {
          console.log('[AntiAFK] Walk error:', e.message);
        }
      }, 120000 + Math.floor(Math.random() * 360000));
    }

    if (config.utils['anti-afk'].sneak) {
      try {
        if (typeof bot.setControlState === 'function') bot.setControlState('sneak', true);
      } catch (e) { }
    }
  }

  // ---------- MOVEMENT MODULES ----------
  // FIX: check top-level movement.enabled flag
  if (config.movement && config.movement.enabled !== false) {
    // FIX: circle-walk and random-jump both jump - only run one jumping mechanism
    // random-jump is skipped if anti-afk jump is handled elsewhere; we only use random-jump here
    if (config.movement['circle-walk'] && config.movement['circle-walk'].enabled) {
      startCircleWalk(bot, defaultMove);
    }
    // FIX: only run random-jump if circle-walk is NOT running (circle-walk also keeps bot moving)
    if (config.movement['random-jump'] && config.movement['random-jump'].enabled && !(config.movement['circle-walk'] && config.movement['circle-walk'].enabled)) {
      startRandomJump(bot);
    }
    if (config.movement['look-around'] && config.movement['look-around'].enabled) {
      startLookAround(bot);
    }
  }

  // ---------- CUSTOM MODULES ----------
  // FIX: avoidMobs AND combatModule conflict - if combat is enabled, don't run avoidMobs at the same time
  if (config.modules.avoidMobs && !config.modules.combat) {
    avoidMobs(bot);
  }
  if (config.modules.combat) {
    combatModule(bot, mcData);
  }
  if (config.modules.beds) {
    bedModule(bot, mcData);
  }
  if (config.modules.chat) {
    chatModule(bot);
  }

  console.log('[Modules] All modules initialized!');
}

// ============================================================
// MOVEMENT HELPERS
// ============================================================
function startCircleWalk(bot, defaultMove) {
  const radius = config.movement['circle-walk'].radius;
  let angle = 0;
  let lastPathTime = 0;

  addInterval(() => {
    if (!bot || !botState.connected) return;
    const now = Date.now();
    if (now - lastPathTime < 2000) return;
    lastPathTime = now;
    try {
      const x = bot.entity.position.x + Math.cos(angle) * radius;
      const z = bot.entity.position.z + Math.sin(angle) * radius;
      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.setGoal(new GoalBlock(Math.floor(x), Math.floor(bot.entity.position.y), Math.floor(z)));
      angle += Math.PI / 4;
      botState.lastActivity = Date.now();
    } catch (e) {
      console.log('[CircleWalk] Error:', e.message);
    }
  }, config.movement['circle-walk'].speed);
}

function startRandomJump(bot) {
  addInterval(() => {
    if (!bot || !botState.connected || typeof bot.setControlState !== 'function') return;
    try {
      bot.setControlState('jump', true);
      setTimeout(() => {
        if (bot && typeof bot.setControlState === 'function') bot.setControlState('jump', false);
      }, 300);
      botState.lastActivity = Date.now();
    } catch (e) {
      console.log('[RandomJump] Error:', e.message);
    }
  }, config.movement['random-jump'].interval);
}

function startLookAround(bot) {
  addInterval(() => {
    if (!bot || !botState.connected) return;
    try {
      const yaw = (Math.random() * Math.PI * 2) - Math.PI;
      const pitch = (Math.random() * Math.PI / 2) - Math.PI / 4;
      bot.look(yaw, pitch, false);
      botState.lastActivity = Date.now();
    } catch (e) {
      console.log('[LookAround] Error:', e.message);
    }
  }, config.movement['look-around'].interval);
}

// ============================================================
// CUSTOM MODULES
// ============================================================

// Avoid mobs/players
// FIX: e.username only exists on players; use e.name for mobs - now handled properly
function avoidMobs(bot) {
  const safeDistance = 5;
  addInterval(() => {
    if (!bot || !botState.connected || typeof bot.setControlState !== 'function') return;
    try {
      const entities = Object.values(bot.entities).filter(e =>
        e.type === 'mob' || (e.type === 'player' && e.username !== bot.username)
      );
      for (const e of entities) {
        if (!e.position) continue;
        const distance = bot.entity.position.distanceTo(e.position);
        if (distance < safeDistance) {
          bot.setControlState('back', true);
          setTimeout(() => {
            if (bot && typeof bot.setControlState === 'function') bot.setControlState('back', false);
          }, 500);
          break;
        }
      }
    } catch (e) {
      console.log('[AvoidMobs] Error:', e.message);
    }
  }, 2000);
}

// Combat module
// FIX: attack cooldown for 1.9+ (600ms minimum between attacks)
// FIX: lock onto a target for multiple ticks instead of randomly switching every tick
// FIX: autoEat - use i.foodPoints directly (mineflayer item property) instead of broken mcData lookup
function combatModule(bot, mcData) {
  let lastAttackTime = 0;
  let lockedTarget = null;
  let lockedTargetExpiry = 0;

  // FIX: use physicsTick (not the deprecated physicTick)
  bot.on('physicsTick', () => {
    if (!bot || !botState.connected) return;
    if (!config.combat['attack-mobs']) return;

    const now = Date.now();
    // FIX: 1.9+ attack cooldown - respect at least 600ms between swings
    if (now - lastAttackTime < 620) return;

    try {
      // FIX: only pick a new target if current one is gone or lock expired
      if (lockedTarget && now < lockedTargetExpiry && bot.entities[lockedTarget.id] && lockedTarget.position) {
        const dist = bot.entity.position.distanceTo(lockedTarget.position);
        if (dist < 4) {
          bot.attack(lockedTarget);
          lastAttackTime = now;
          return;
        } else {
          lockedTarget = null;
        }
      }

      // Pick a new target
      const mobs = Object.values(bot.entities).filter(e =>
        e.type === 'mob' && e.position &&
        bot.entity.position.distanceTo(e.position) < 4
      );
      if (mobs.length > 0) {
        lockedTarget = mobs[0];
        lockedTargetExpiry = now + 3000; // stick to same mob for 3 seconds
        bot.attack(lockedTarget);
        lastAttackTime = now;
      }
    } catch (e) {
      console.log('[Combat] Error:', e.message);
    }
  });

  // FIX: autoEat - check foodPoints property on the item directly (works reliably)
  bot.on('health', () => {
    if (!config.combat['auto-eat']) return;
    try {
      if (bot.food < 14) {
        const food = bot.inventory.items().find(i => i.foodPoints && i.foodPoints > 0);
        if (food) {
          bot.equip(food, 'hand')
            .then(() => bot.consume())
            .catch(e => console.log('[AutoEat] Error:', e.message));
        }
      }
    } catch (e) {
      console.log('[AutoEat] Error:', e.message);
    }
  });
}

// Bed module
// FIX: bot.isSleeping can be stale; use a local isTryingToSleep guard to prevent double-sleep errors
// FIX: place-night was false in default settings - documentation note added
function bedModule(bot, mcData) {
  let isTryingToSleep = false;

  addInterval(async () => {
    if (!bot || !botState.connected) return;
    if (!config.beds['place-night']) return; // FIX: check flag (was always skipping before)

    try {
      const isNight = bot.time.timeOfDay >= 12500 && bot.time.timeOfDay <= 23500;

      // FIX: use local guard instead of stale bot.isSleeping
      if (isNight && !isTryingToSleep) {
        const bedBlock = bot.findBlock({
          matching: block => block.name.includes('bed'),
          maxDistance: 8
        });

        if (bedBlock) {
          isTryingToSleep = true;
          try {
            await bot.sleep(bedBlock);
            console.log('[Bed] Sleeping...');
          } catch (e) {
            // Can't sleep - maybe not night enough or monsters nearby
          } finally {
            isTryingToSleep = false;
          }
        }
      }
    } catch (e) {
      isTryingToSleep = false;
      console.log('[Bed] Error:', e.message);
    }
  }, 10000);
}

// Chat module
// FIX: wire up discord.events.chat flag
function chatModule(bot) {
  bot.on('chat', (username, message) => {
    if (!bot || username === bot.username) return;

    try {
      // FIX: send chat events to Discord if enabled
      if (config.discord && config.discord.enabled && config.discord.events && config.discord.events.chat) {
        sendDiscordWebhook(`💬 **${username}**: ${message}`, 0x7289da);
      }

      if (config.chat && config.chat.respond) {
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
          bot.chat(`Hello, ${username}!`);
        }
        if (message.startsWith('!tp ')) {
          const target = message.split(' ')[1];
          if (target) bot.chat(`/tp ${target}`);
        }
      }
    } catch (e) {
      console.log('[Chat] Error:', e.message);
    }
  });
}

// ============================================================
// CONSOLE COMMANDS
// ============================================================
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (!bot || !botState.connected) {
    console.log('[Console] Bot not connected');
    return;
  }

  const trimmed = line.trim();
  if (trimmed.startsWith('say ')) {
    bot.chat(trimmed.slice(4));
  } else if (trimmed.startsWith('cmd ')) {
    bot.chat('/' + trimmed.slice(4));
  } else if (trimmed === 'status') {
    console.log(`Connected: ${botState.connected}, Uptime: ${formatUptime(Math.floor((Date.now() - botState.startTime) / 1000))}`);
  } else if (trimmed === 'reconnect') {
    console.log('[Console] Manual reconnect requested');
    bot.end();
  } else {
    bot.chat(trimmed);
  }
});

// ============================================================
// DISCORD WEBHOOK INTEGRATION
// FIX: use Buffer.byteLength for Content-Length (handles non-ASCII usernames correctly)
// FIX: rate limiting to avoid spam when bot is flapping
// ============================================================
function sendDiscordWebhook(content, color = 0x0099ff) {
  if (!config.discord || !config.discord.enabled || !config.discord.webhookUrl || config.discord.webhookUrl.includes('YOUR_DISCORD')) return;

  // FIX: Discord rate limiting - skip if sent too recently
  const now = Date.now();
  if (now - lastDiscordSend < DISCORD_RATE_LIMIT_MS) {
    console.log('[Discord] Rate limited - skipping webhook');
    return;
  }
  lastDiscordSend = now;

  const protocol = config.discord.webhookUrl.startsWith('https') ? https : http;
  const urlParts = new URL(config.discord.webhookUrl);

  const payload = JSON.stringify({
    username: config.name,
    embeds: [{
      description: content,
      color: color,
      timestamp: new Date().toISOString(),
      footer: { text: 'Slobos AFK Bot' }
    }]
  });

  const options = {
    hostname: urlParts.hostname,
    port: 443,
    path: urlParts.pathname + urlParts.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // FIX: use Buffer.byteLength instead of payload.length - handles non-ASCII (e.g. usernames with accents/emoji)
      'Content-Length': Buffer.byteLength(payload, 'utf8')
    }
  };

  const req = protocol.request(options, (res) => {
    // Silent success
  });

  req.on('error', (e) => {
    console.log(`[Discord] Error sending webhook: ${e.message}`);
  });

  req.write(payload);
  req.end();
}

// ============================================================
// CRASH RECOVERY - IMMORTAL MODE
// FIX: guard against uncaughtException stacking reconnects when isReconnecting is already true
// ============================================================
process.on('uncaughtException', (err) => {
  const msg = err.message || 'Unknown';
  console.log(`[FATAL] Uncaught Exception: ${msg}`);
  botState.errors.push({ type: 'uncaught', message: msg, time: Date.now() });

  const isNetworkError = msg.includes('PartialReadError') || msg.includes('ECONNRESET') ||
    msg.includes('EPIPE') || msg.includes('ETIMEDOUT') || msg.includes('timed out') ||
    msg.includes('write after end') || msg.includes('This socket has been ended');

  if (isNetworkError) {
    console.log('[FATAL] Known network/protocol error - recovering gracefully...');
  }

  if (config.utils['auto-reconnect']) {
    clearAllIntervals();
    botState.connected = false;

    // FIX: reset isReconnecting if it was stuck, then schedule reconnect
    if (isReconnecting) {
      console.log('[FATAL] isReconnecting was stuck - resetting before crash recovery');
      isReconnecting = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    }

    setTimeout(() => {
      scheduleReconnect();
    }, isNetworkError ? 5000 : 10000);
  }
});

process.on('unhandledRejection', (reason) => {
  console.log(`[FATAL] Unhandled Rejection: ${reason}`);
  botState.errors.push({ type: 'rejection', message: String(reason), time: Date.now() });
});

process.on('SIGTERM', () => {
  console.log('[System] SIGTERM received.');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[System] Manual stop requested. Exiting...');
  process.exit(0);
});

// ============================================================
// START THE BOT
// ============================================================
console.log('='.repeat(50));
console.log('  Minecraft AFK Bot v2.5 - Bug-Fixed Edition');
console.log('='.repeat(50));
console.log(`Server: ${config.server.ip}:${config.server.port}`);
console.log(`Version: ${config.server.version}`);
console.log(`Auto-Reconnect: ${config.utils['auto-reconnect'] ? 'Enabled' : 'Disabled'}`);
console.log('='.repeat(50));

createBot();
