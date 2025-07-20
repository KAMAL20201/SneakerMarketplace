import { Route, Routes } from "react-router";
import Home from "./pages/Home";
import ProductDetailPage from "./pages/ProductDetailPage";

const Router = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
    </Routes>
  );
};

export default Router;
