# MLight — An ML Playground

MLight is a browser-only, client-side machine learning playground that runs entirely in the browser using React and Pyodide. It is designed as a lightweight, modular, and extensible canvas for exploring ML workflows without any server.

Key features
- Upload CSV and preview data
- Clean data: drop NA, fill missing, encode categoricals
- Visualize: histograms and scatter plots using Plotly.js
- Feature engineering: encode categoricals (scaling/binning can be added)
- Train simple models in-browser: Logistic Regression, Decision Tree, Naive Bayes (via scikit-learn in Pyodide)
- Compare models (basic results view; extendable)

Design goals
- Lightweight and fast
- Modular and extensible
- Portfolio-ready with a clean UI and documentation
- Zero-server architecture (Pyodide + React only)

How it works
- The UI is built with React and Vite.
- Pyodide is loaded in the browser (see `index.html`). Python packages (pandas, scikit-learn) are installed via micropip in the browser when possible. All heavy installs happen client-side.

Run locally
1. Install dependencies (Node 18+ recommended):

```bash
# run from project root
npm install
npm run dev
```

2. Open the app in your browser at the address printed by Vite (usually http://localhost:5173).

Notes
- The first time you run model training, Pyodide may attempt to install packages in your browser. This can be slow. If installations fail or are too large, consider pre-building a Pyodide bundle or using a smaller set of bundled packages.
- This project is scaffolded to be deployed as a static site (Vercel, Netlify, GitHub Pages). See `vercel.json` for a minimal Vercel config.

Extending
- Add more visualization types (correlation heatmaps, pairplots) by having Python compute arrays and plotting via Plotly in JS, or by using Plotly in Python and exporting images.
- Add more feature engineering (scaling, polynomial features, feature selection) via Pyodide functions.
- Improve model comparison page to ingest results from multiple runs and show charts and tables.

License
- MIT
# MLight
An interactive canvas for machine learning workflows—lightweight, serverless, and entirely in-browser.
