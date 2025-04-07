import "@fontsource/open-sans/index.css";
import "@fontsource/roboto/index.css";
import store from "@redux/store.ts";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {Provider} from "react-redux";
import App from "./App.tsx";
// import "./i18n";
import "./styles/main.scss";
import {ConfigProvider, ThemeConfig} from "antd";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const theme : ThemeConfig = {
  components: {
    Card: {
      bodyPadding: 16,
    },
    Segmented: {
      itemHoverBg: "transparent",
      itemActiveBg: "transparent",
    },
  },
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ConfigProvider theme={theme}>
          <App />
        </ConfigProvider>
      </Provider>
    </QueryClientProvider>
  </StrictMode>,
);
