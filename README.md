# 🌍 Global Ontology Engine

## 🚀 Overview
AI-powered intelligence platform that integrates global data (geopolitics, climate, economy) into a unified knowledge graph.

## 🔥 1. SOLUTION FOR THE PROBLEM STATEMENT
##💡 Proposed Solution:
AI-Powered Global Ontology Engine for Real-Time Intelligence
solution is a centralized intelligence platform that:

- Collects multi-source data
  - Structured → Country APIs (RestCountries)
  - Semi-structured → News APIs (Guardian, HN)
  - Unstructured → Text feeds, headlines
  - Real-time → Live news + climate APIs
- Uses AI to:
  - Extract meaning (entities like countries, conflicts)
  - Generate insights (summaries, predictions, scenarios)
  - Detect bias & risk levels
- Converts everything into a:
  - 👉 Dynamic Knowledge Graph + Intelligence Dashboard

## 🏗 2. ARCHITECTURE
- Frontend Dashboard (index.html)
  - Multi-panel intelligence system (map, news, risk, climate, KG)
- AI Layer (app.js)
  - Uses Groq LLM for:
    - Predictions
    - Scenario analysis
    - Bias detection
    - Country summaries
- Visualization Layer
    - D3.js → Knowledge graph + world map
    - Risk heatmap (color-coded countries)
- Data Layer
    - Guardian API
    - HackerNews fallback
    - NASA EONET (climate)
    - USGS (earthquakes)
 
## ⚙️ 3. TECHNOLOGIES USED
- 🧠 AI / Intelligence
    - Groq API (LLaMA 3.3 70B) : Core reasoning engine
- 🌐 Frontend
    - HTML5 + CSS3 (custom themes)
    - JavaScript (Vanilla)
    - D3.js (data visualization)
    - TopoJSON (map rendering)
- 📡 APIs & Data Sources
    - Guardian News API
    - Hacker News API (fallback)
    - RestCountries API
    - NASA EONET (climate events)
    - USGS Earthquake API
- 🛠 Dev Tools
    - Chrome Debugger (launch.json)
    - LocalStorage (API key handling)
 
## 🚀 4. FEATURES / USP
- 🧠 Real-Time Intelligence Fusion
- 🌍 Interactive Global Risk Map
- 🤖 AI-Powered Decision Engine
- 🕸 Ontology + Knowledge Graph Thinking
- ⚠️ Real-Time Risk Scoring Engine
- 📰 Bias Detection System
- 🌪 Climate + Disaster Intelligence Integration
- 🎯 Personalized Intelligence Feed
- 💬 Ask AI Interface
