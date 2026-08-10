import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Store from "./pages/store/Store.jsx";
import ProductDetail from "./pages/store/ProductDetail.jsx";
import CartPage from "./pages/store/CartPage.jsx";
import Checkout from "./pages/store/Checkout.jsx";
import Orders from "./pages/store/Orders.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={
          <ProtectedRoute role="user"><Store /></ProtectedRoute>
        } />
        <Route path="/shop" element={
          <ProtectedRoute role="user"><Store /></ProtectedRoute>
        } />
        <Route path="/product/:id" element={
          <ProtectedRoute role="user"><ProductDetail /></ProtectedRoute>
        } />
        <Route path="/cart" element={
          <ProtectedRoute role="user"><CartPage /></ProtectedRoute>
        } />
        <Route path="/checkout" element={
          <ProtectedRoute role="user"><Checkout /></ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute role="user"><Orders /></ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

export default App;
