import { Navigate, Route, Routes } from "react-router-dom";

import Dashboard from "../pages/dashboard/Dashboard";

import Products from "../pages/products/Products";
import Workspace from "../pages/products/workspace";
import Attribute from "../pages/products/Attribute";
import AddProduct from "../pages/products/AddProduct";
import EditProduct from "../pages/products/EditProduct";
import Reviews from "../pages/products/AnalysReview";
import ResearchProduct from "../pages/products/Researchproduct";

import AddBanner from "../pages/vendor/AddBanner";
import Banner from "../pages/vendor/Banner";
import VendorFinance from "../pages/vendor/VendorFinance";
import VendorProducts from "../pages/vendor/VendorProducts";
import VendorSupplyChain from "../pages/vendor/VendorSupplyChain";
import VendorCartPage from "../pages/vendor/vendorcard";
import VendorOrders from "../pages/vendor/VendorOrders";

import OrderWorkspace from "../pages/orders/Workspace";
import ManageReturn from "../pages/orders/ManageReturn";
import ResolveClaims from "../pages/orders/Resolveclaims";
import OrderReport from "../pages/orders/OrderReport";

import Financeworkspce from "../pages/Finance/Financeworkspace";
import Managepayment from "../pages/Finance/managepayment";
import Managetaxes from "../pages/Finance/manageTaxes";
// import Profitanalysis from "../pages/Finance/Profitanalysis";
// import Financereport from "../pages/Finance/Financereport";

export default function VendorRoutes() {
  return (
    <Routes>
      {/* Default Route */}
      <Route index element={<Navigate to="dashboard" replace />} />

      {/* Dashboard */}
      <Route path="dashboard" element={<Dashboard />} />

      {/* Products */}
      <Route path="workspace" element={<Workspace />} />
      <Route path="products" element={<Products />} />
      <Route path="products/add" element={<AddProduct />} />
      <Route path="products/:id/edit" element={<EditProduct />} />
      <Route path="attribute" element={<Attribute />} />
      <Route path="Reviews" element={<Reviews />} />
      <Route path="ResearchProduct" element={<ResearchProduct />} />


      <Route path="products/*" element={<VendorProducts />} />

      {/* Cart */}
      <Route path="cart" element={<VendorCartPage />} />

      {/* Supply Chain */}
      <Route path="supply-chain/*" element={<VendorSupplyChain />} />

      {/* Finance */}
      <Route path="finance" element={<VendorFinance />} />

      {/* Banners */}
      <Route path="banners" element={<Banner />} />
      <Route path="banners/add" element={<AddBanner />} />
      <Route path="banners/edit/:id" element={<AddBanner />} />
      <Route path="banner" element={<Navigate to="/vendor/banners" replace />} />

      {/* Orders */}
      <Route path="orders/*" element={<VendorOrders />} />
      <Route path="orderworkspce" element={<OrderWorkspace />} />
      <Route path="managereturn" element={<ManageReturn />} />
      <Route path="resolveclaims" element={<ResolveClaims />} />
      <Route path="ordereport" element={<OrderReport />} />

      {/* Finance Module */}
      <Route path="Finance/*" element={<VendorFinance />} />
      <Route path="Financeworkspce" element={<Financeworkspce />} />
      <Route path="managepayment" element={<Managepayment />} />
      <Route path="managetaxes" element={<Managetaxes />} />
      {/*
      <Route path="Profitanalysis" element={<Profitanalysis />} />
      <Route path="Financereport" element={<Financereport />} />
      */}

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/vendor/dashboard" replace />} />
    </Routes>
  );
}