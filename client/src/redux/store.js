import { combineReducers, configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import postReducer from "./postSlice";
import userReducer from "./userSlice";
import groupReducer from './groupSlice';
import friendReducer from './friendSlice';

import storage from "redux-persist/lib/storage";
import { persistReducer } from "redux-persist";
import persistStore from "redux-persist/es/persistStore";
import { onLogout } from "../services/axiosService";
import { clearCredentials } from './authSlice';

const reducers = combineReducers({
  auth: authReducer,
  post: postReducer,
  user: userReducer,
  group: groupReducer,
  friend: friendReducer,
  // Add more reducers as needed
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'] // only persist auth state
};

const persistedReducer = persistReducer(persistConfig, reducers);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }),
});

export const persistor = persistStore(store);

// Lắng nghe sự kiện logout từ axiosService và xử lý trong Redux
onLogout(() => {
  store.dispatch(clearCredentials());
});
