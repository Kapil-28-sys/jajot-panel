import axios from "axios";
import { apiUrl } from "../config/api";

const API = apiUrl("/api/categories");

export const fetchCategories = () => axios.get(API);
