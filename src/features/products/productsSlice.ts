import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiGet } from '../../services/api';
import type { Product } from '../../types';

type Paginated<T> = { items: T[]; total: number; page: number; pages: number };

export const fetchProducts = createAsyncThunk(
  'products/fetchAll',
  async (params: { page?: number; limit?: number; q?: string } | undefined) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.q) query.set('q', params.q);
    const data = await apiGet<Paginated<Product>>(`/products?${query.toString()}`);
    return data;
  }
);

export const lookupByBarcode = createAsyncThunk(
  'products/lookupByBarcode',
  async (barcodeOrSku: { barcode?: string; sku?: string }) => {
    const query = new URLSearchParams();
    if (barcodeOrSku.barcode) query.set('barcode', barcodeOrSku.barcode);
    if (barcodeOrSku.sku) query.set('sku', barcodeOrSku.sku);
    const data = await apiGet<{ product: Product }>(`/products/lookup?${query.toString()}`);
    return data.product;
  }
);

interface ProductsState {
  items: Product[];
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  error?: string;
  lastScannedProduct?: Product;
}

const initialState: ProductsState = {
  items: [],
  total: 0,
  page: 1,
  pages: 1,
  loading: false,
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearScan(state) {
      state.lastScannedProduct = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(fetchProducts.fulfilled, (state, action: PayloadAction<Paginated<Product>>) => {
        state.loading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(lookupByBarcode.pending, (state) => {
        state.error = undefined;
      })
      .addCase(lookupByBarcode.fulfilled, (state, action: PayloadAction<Product>) => {
        state.lastScannedProduct = action.payload;
      })
      .addCase(lookupByBarcode.rejected, (state, action) => {
        state.error = action.error.message;
      });
  },
});

export const { clearScan } = productsSlice.actions;
export default productsSlice.reducer;

