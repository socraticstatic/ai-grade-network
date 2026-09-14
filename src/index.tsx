import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { NavigationProvider } from './components/navigation/NavigationContext';

// Create root 
const root = createRoot(document.getElementById('root')!);

// Render app with error boundary
root.render(
  <BrowserRouter>
    <NavigationProvider>
      <App />
    </NavigationProvider>
  </BrowserRouter>
);