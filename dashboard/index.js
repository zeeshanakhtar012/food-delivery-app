import React from 'react';
import ReactDOM from 'react-dom/client';
import * as ReactRouterDOM from 'react-router-dom';
const { StrictMode } = React;
const { createRoot } = ReactDOM;
const { BrowserRouter } = ReactRouterDOM;

const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);