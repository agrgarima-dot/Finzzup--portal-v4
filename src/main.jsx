import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
          background:"#F8FAFC", fontFamily:"Inter,system-ui,sans-serif", padding:24 }}>
          <div style={{ maxWidth:480, textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
            <h2 style={{ color:"#0F172A", fontSize:18, fontWeight:700, marginBottom:8 }}>Something went wrong</h2>
            <p style={{ color:"#475569", fontSize:13, marginBottom:16 }}>
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button onClick={() => window.location.reload()}
              style={{ padding:"10px 20px", borderRadius:8, background:"#2563EB", color:"white",
                border:"none", fontWeight:600, cursor:"pointer", fontSize:14 }}>
              Reload
            </button>
            <details style={{ marginTop:16, textAlign:"left", fontSize:11, color:"#94A3B8" }}>
              <summary style={{ cursor:"pointer" }}>Technical details</summary>
              <pre style={{ marginTop:8, whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App/>
    </ErrorBoundary>
  </React.StrictMode>
)
