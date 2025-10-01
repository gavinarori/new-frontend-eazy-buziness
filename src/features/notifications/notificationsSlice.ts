import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost } from '../../services/api';

export interface NotificationItem { id: string; title: string; message: string; read: boolean; createdAt: string | Date }

export const fetchNotifications = createAsyncThunk('notifications/fetchAll', async () => {
  const data = await apiGet<{ items: NotificationItem[] }>(`/notifications`);
  return data.items || (data as unknown as NotificationItem[]);
});

export const markNotificationReadThunk = createAsyncThunk('notifications/markRead', async (id: string) => {
  await apiPost(`/notifications/${id}/read`);
  return id;
});

interface NotificationsState {
  items: NotificationItem[];
  loading: boolean;
  error?: string;
}

const initialState: NotificationsState = {
  items: [],
  loading: false,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(fetchNotifications.fulfilled, (state, action: PayloadAction<NotificationItem[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(markNotificationReadThunk.fulfilled, (state, action: PayloadAction<string>) => {
        const item = state.items.find(n => n.id === action.payload);
        if (item) item.read = true;
      });
  },
});

export default notificationsSlice.reducer;

