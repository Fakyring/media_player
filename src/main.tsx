import { createRoot } from 'react-dom/client'
import './shadcn.css'
import App from './App'

document.documentElement.classList.add('dark')

const root = createRoot(document.getElementById('app')!)
root.render(<App />)
