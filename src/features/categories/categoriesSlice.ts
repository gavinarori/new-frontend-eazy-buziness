import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiGet } from '../../services/api';

export interface Category { id: string; name: string; shopId?: string }

export const fetchCategories = createAsyncThunk('categories/fetchAll', async (shopId?: string) => {
  const qs = shopId ? `?shopId=${encodeURIComponent(shopId)}` : '';
  const data = await apiGet<{ categories: any[] }>(`/categories${qs}`);

  // Map MongoDB _id → id for frontend consistency
  return data.categories.map(cat => ({
    id: cat._id,
    name: cat.name,
    slug: cat.slug,
    shopId: cat.shopId,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  }));
});


interface CategoriesState {
  items: Category[];
  loading: boolean;
  error?: string;
}

const initialState: CategoriesState = {
  items: [],
  loading: false,
};

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default categoriesSlice.reducer;

