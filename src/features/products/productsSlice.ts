import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { productsApi } from '../../services/apiClient';
import type { Product } from '../../services/apiClient';

type Paginated<T> = { items: T[]; total: number; page: number; pages: number };

export const fetchProducts = createAsyncThunk(
  'products/fetchAll',
  async (params: { shopId?: string; page?: number; limit?: number; q?: string } | undefined) => {
    const data = await productsApi.getAll(params?.shopId);
    // Convert to paginated format for compatibility
    return {
      items: data.products,
      total: data.products.length,
      page: 1,
      pages: 1,
    };
  }
);

export const lookupByBarcode = createAsyncThunk(
  'products/lookupByBarcode',
  async (barcodeOrSku: { barcode?: string; sku?: string }) => {
    // For now, we'll search through all products
    // In a real implementation, you'd have a specific lookup endpoint
    const data = await productsApi.getAll();
    const product = data.products.find(p => 
      p.barcode === barcodeOrSku.barcode || p.sku === barcodeOrSku.sku
    );
    if (!product) throw new Error('Product not found');
    return product;
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

