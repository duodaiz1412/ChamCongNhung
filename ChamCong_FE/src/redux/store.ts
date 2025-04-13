import { configureStore } from '@reduxjs/toolkit';
import deviceReducer from './slices/deviceSlice';

const store = configureStore({
  reducer: {
    device: deviceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
export type IRootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
