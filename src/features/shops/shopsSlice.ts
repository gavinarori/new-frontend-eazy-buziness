import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiGet } from '../../services/api';
import type { Shop } from '../../types';

export const fetchShops = createAsyncThunk('shops/fetchAll', async () => {
  const data = await apiGet<{ shops: Shop[] }>(`/shops`);

  // normalize if needed
  return data.shops || (data as unknown as Shop[]);
});

interface ShopsState {
  items: Shop[];
  loading: boolean;
  error?: string;
}

const initialState: ShopsState = {
  items: [],
  loading: false,
};

const shopsSlice = createSlice({
  name: 'shops',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchShops.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(fetchShops.fulfilled, (state, action: PayloadAction<Shop[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchShops.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default shopsSlice.reducer;

