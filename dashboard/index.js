const { StrictMode } = React;
const { createRoot } = ReactDOM;
const { BrowserRouter } = ReactRouterDOM;

import App from './App.jsx';

const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);