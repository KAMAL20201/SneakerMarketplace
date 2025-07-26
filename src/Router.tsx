import { Route, Routes } from "react-router";
import Home from "./pages/Home";
import ProductDetailPage from "./pages/ProductDetailPage";
import LoginPage from "./pages/SignIn";
import SignupPage from "./pages/SignUp";
import SellPage from "./pages/Sell";

const Router = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/sell" element={<SellPage />} />
    </Routes>
  );
};

export default Router;
