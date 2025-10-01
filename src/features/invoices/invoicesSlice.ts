import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPatch, apiPost } from '../../services/api';
import type { Invoice } from '../../types';

type Paginated<T> = { items: T[]; total: number; page: number; pages: number };

export const fetchInvoices = createAsyncThunk('invoices/fetchAll', async (params?: { page?: number; limit?: number }) => {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const data = await apiGet<Paginated<Invoice>>(`/invoices?${query.toString()}`);
  return data;
});

export const createInvoiceThunk = createAsyncThunk('invoices/create', async (payload: Partial<Invoice>) => {
  const data = await apiPost<{ invoice: Invoice }>(`/invoices`, payload);
  return data.invoice;
});

export const updateInvoiceStatus = createAsyncThunk(
  'invoices/updateStatus',
  async (payload: { id: string; status: Invoice['status'] }) => {
    const data = await apiPatch<{ invoice: Invoice }>(`/invoices/${payload.id}/status`, { status: payload.status });
    return data.invoice;
  }
);

interface InvoicesState {
  items: Invoice[];
  loading: boolean;
  error?: string;
}

const initialState: InvoicesState = {
  items: [],
  loading: false,
};

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(fetchInvoices.fulfilled, (state, action: PayloadAction<Paginated<Invoice>>) => {
        state.loading = false;
        state.items = action.payload.items;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createInvoiceThunk.fulfilled, (state, action: PayloadAction<Invoice>) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateInvoiceStatus.fulfilled, (state, action: PayloadAction<Invoice>) => {
        const idx = state.items.findIndex(i => i.id === action.payload.id);
        if (idx >= 0) state.items[idx] = action.payload;
      });
  },
});

export default invoicesSlice.reducer;

