import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Analyzer from "./pages/Analyzer";
import History from "./pages/History";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
            <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
          } />
          <Route path="/analyzer" element={
            <ProtectedRoute><Layout><Analyzer /></Layout></ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute><Layout><History /></Layout></ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
