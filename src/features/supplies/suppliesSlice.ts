import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost } from '../../services/api';

export interface SupplyItem { id: string; productId: string; quantity: number; receivedAt: string | Date }

type Paginated<T> = { items: T[]; total: number; page: number; pages: number };

export const fetchSupplies = createAsyncThunk('supplies/fetchAll', async (params?: { page?: number; limit?: number }) => {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const data = await apiGet<Paginated<SupplyItem>>(`/supplies?${query.toString()}`);
  return data;
});

export const createSupplyThunk = createAsyncThunk('supplies/create', async (payload: Partial<SupplyItem>) => {
  const data = await apiPost<{ supply: SupplyItem }>(`/supplies`, payload);
  return data.supply;
});

interface SuppliesState {
  items: SupplyItem[];
  loading: boolean;
  error?: string;
}

const initialState: SuppliesState = {
  items: [],
  loading: false,
};

const suppliesSlice = createSlice({
  name: 'supplies',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSupplies.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(fetchSupplies.fulfilled, (state, action: PayloadAction<Paginated<SupplyItem>>) => {
        state.loading = false;
        state.items = action.payload.items;
      })
      .addCase(fetchSupplies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createSupplyThunk.fulfilled, (state, action: PayloadAction<SupplyItem>) => {
        state.items.unshift(action.payload);
      });
  },
});

export default suppliesSlice.reducer;

