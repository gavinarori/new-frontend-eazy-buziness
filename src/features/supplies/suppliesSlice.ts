import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost } from '../../services/api';

// Supply item type (adjusted for new payload shape)
export interface SupplyItem {
  id: string;
  supplierName: string;
  shopId: string;
  receivedAt: string | Date;
  createdBy?: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    status: 'received' | 'pending' | 'cancelled';
    notes?: string;
  }[];
}

type Paginated<T> = { items: T[]; total: number; page: number; pages: number };

export const fetchSupplies = createAsyncThunk<
  Paginated<SupplyItem>, // ✅ Return type
  { shopId?: any; page?: number; limit?: number } | undefined // ✅ Argument type
>(
  'supplies/fetchAll',
  async (params) => {
    const query = new URLSearchParams();

    // Convert shopId safely
    if (params?.shopId) {
      const shopId =
        typeof params.shopId === 'object'
          ? params.shopId._id || ''
          : String(params.shopId);
      if (shopId) query.set('shopId', shopId);
    }

    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    // Assume backend returns: { items: SupplyItem[], total: number, page: number, pages: number }
    const data = await apiGet<Paginated<SupplyItem>>(`/supplies?${query.toString()}`);
    return data;
  }
);



// ✅ Create supply (matches backend payload)
export const createSupplyThunk = createAsyncThunk(
  'supplies/create',
  async (payload: Omit<SupplyItem, 'id'>) => {
    const data = await apiPost<{ supply: SupplyItem }>(`/supplies`, payload);
    return data.supply;
  }
);

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
      // FETCH
      .addCase(fetchSupplies.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(fetchSupplies.fulfilled, (state, action: PayloadAction<Paginated<SupplyItem>>) => {
        state.loading = false;
        state.items = action.payload.items || [];
      })
      .addCase(fetchSupplies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // CREATE
      .addCase(createSupplyThunk.fulfilled, (state, action: PayloadAction<SupplyItem>) => {
        state.items.unshift(action.payload);
      });
  },
});

export default suppliesSlice.reducer;
