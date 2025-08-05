import { Route, Routes } from "react-router";
import Home from "./pages/Home";
import ProductDetailPage from "./pages/ProductDetailPage";
import LoginPage from "./pages/SignIn";
import SignupPage from "./pages/SignUp";
import SellPage from "./pages/Sell";
import MyListings from "./pages/MyListings";
import EditListing from "./pages/EditListing";
import Browse from "./pages/Browse";

const Router = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/sell" element={<SellPage />} />
      <Route path="/my-listings" element={<MyListings />} />
      <Route path="/edit-listing/:id" element={<EditListing />} />
      <Route path="/browse" element={<Browse />} />
    </Routes>
  );
};

export default Router;
