import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "../pages/dashboard/Dashboard";
import Users from "../pages/users/Users";
import Categories from "../pages/categories/Categories";
import SubCategories from "../pages/subcategory/SubCategories";
import SubToSubCategory from "../pages/subtosubcategory/SubToSubCategory";
import CategoryAttribute from "../pages/categoryattribute/CategoryAttribute";
import Settings from "../pages/settings/Settings";
import Vendors from "../pages/vendors/Vendors";
import Adminallproduct from "../pages/Superadmin/Adminallproducts";
import AdminBannerpermission from "../pages/Superadmin/BannerPermission";
import Vendorpermission from "../pages/Superadmin/Vendorpermisssion";
import Adminpayment from "../pages/Superadmin/adminPayment";
import Adminshipping from "../pages/Superadmin/Shipping";
import AdminProductSales from "../pages/Superadmin/Productsales";



export default function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="vendors" element={<Vendors />} />

      <Route path="Vendorpermission" element={<Vendorpermission />} />
      <Route path="payment" element={<Adminpayment />} />
      <Route path="shipping" element={<Adminshipping />} />
      <Route path="ProductSales" element={<AdminProductSales />} />



      <Route path="allproduct" element={<Adminallproduct />} />
      <Route path="bannerpermission" element={<AdminBannerpermission />} />

      <Route path="users" element={<Users />} />
      <Route path="categories" element={<Categories />} />
      <Route path="subcategory" element={<SubCategories />} />
      <Route path="subtosubcategory" element={<SubToSubCategory />} />
      <Route path="categoryattribute" element={<CategoryAttribute />} />

      <Route path="settings" element={<Settings />} />

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}