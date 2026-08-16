import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installUrlParse } from '@/lib/polyfills'
import './index.css'
import App from './App.tsx'

// Before anything renders, and well before the lazily-loaded pdf.js chunk that
// needs it. See the comment in `lib/polyfills` — without this the app is blank
// on Safari older than 18.4.
installUrlParse()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
