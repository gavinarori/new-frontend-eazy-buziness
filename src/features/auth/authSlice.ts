import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost } from '../../services/api';
import type { User } from '../../types';

interface AuthState {
  user?: User | null;
  loading: boolean;
  error?: string;
}

const initialState: AuthState = {
  user: null,
  loading: false,
};

export const login = createAsyncThunk('auth/login', async (body: { email: string; password: string }) => {
  const data = await apiPost<{ user: User }>('/auth/login', body);
  return data.user;
});

export const fetchMe = createAsyncThunk('auth/me', async () => {
  const data = await apiGet<{ user: User }>('/auth/me');
  return data.user;
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await apiPost('/auth/logout');
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchMe.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export default authSlice.reducer;

