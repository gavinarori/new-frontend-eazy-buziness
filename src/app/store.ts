import { configureStore } from '@reduxjs/toolkit';
import productsReducer from '../features/products/productsSlice';
import authReducer from '../features/auth/authSlice';
import shopsReducer from '../features/shops/shopsSlice';
import categoriesReducer from '../features/categories/categoriesSlice';
import invoicesReducer from '../features/invoices/invoicesSlice';
import suppliesReducer from '../features/supplies/suppliesSlice';
import notificationsReducer from '../features/notifications/notificationsSlice';
import settingsReducer from '../features/settings/settingsSlice';

export const store = configureStore({
  reducer: {
    products: productsReducer,
    auth: authReducer,
    shops: shopsReducer,
    categories: categoriesReducer,
    invoices: invoicesReducer,
    supplies: suppliesReducer,
    notifications: notificationsReducer,
    settings: settingsReducer,
  },
  middleware: (getDefault) => getDefault(),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

