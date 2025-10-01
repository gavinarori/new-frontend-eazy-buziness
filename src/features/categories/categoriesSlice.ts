import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiGet } from '../../services/api';

export interface Category { id: string; name: string; shopId?: string }

export const fetchCategories = createAsyncThunk('categories/fetchAll', async () => {
  const data = await apiGet<{ items: Category[] }>(`/categories`);
  return data.items || (data as unknown as Category[]);
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

