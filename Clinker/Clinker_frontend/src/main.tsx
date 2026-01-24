import React from 'react'
import ReactDOM from 'react-dom/client'
import ClinkerAllocationSystem from './App'
import ErrorBoundary from './ErrorBoundary'
import './index.css'

console.log('App mounting...');

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <ClinkerAllocationSystem />
        </ErrorBoundary>
    </React.StrictMode>,
)
