import {createSlice, PayloadAction} from "@reduxjs/toolkit";

interface DeviceState {
  isConnected: boolean;
  lastUpdate: string;
}

const initialState: DeviceState = {
  isConnected: false,
  lastUpdate: "",
};

const deviceSlice = createSlice({
  name: "device",
  initialState,
  reducers: {
    setDeviceStatus: (state, action: PayloadAction<DeviceState>) => {
      state.isConnected = action.payload.isConnected;
      state.lastUpdate = action.payload.lastUpdate;
    },
  },
});

export const {setDeviceStatus} = deviceSlice.actions;
export default deviceSlice.reducer;
