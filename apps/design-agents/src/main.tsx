import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeContextProvider } from './ThemeContext'
import { AuthGuard } from '@eng-suite/ui-kit'
import 'katex/dist/katex.min.css'; // Import KaTeX CSS globally

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeContextProvider>
      <AuthGuard>
        <App />
      </AuthGuard>
    </ThemeContextProvider>
  </React.StrictMode>,
)
