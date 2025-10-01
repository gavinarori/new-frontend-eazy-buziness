import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost } from '../../services/api';

export interface Settings { currency?: string; vatRate?: number; theme?: 'light' | 'dark' }

export const fetchSettings = createAsyncThunk('settings/fetch', async () => {
  const data = await apiGet<{ settings: Settings }>(`/settings`);
  return data.settings;
});

export const upsertSettings = createAsyncThunk('settings/upsert', async (payload: Settings) => {
  const data = await apiPost<{ settings: Settings }>(`/settings`, payload);
  return data.settings;
});

interface SettingsState {
  values?: Settings;
  loading: boolean;
  error?: string;
}

const initialState: SettingsState = {
  values: undefined,
  loading: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(fetchSettings.fulfilled, (state, action: PayloadAction<Settings>) => {
        state.loading = false;
        state.values = action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(upsertSettings.fulfilled, (state, action: PayloadAction<Settings>) => {
        state.values = action.payload;
      });
  },
});

export default settingsSlice.reducer;

