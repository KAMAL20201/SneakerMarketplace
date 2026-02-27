import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import Router from "./Router";
import Layout from "./layout";
import "./index.css";
import Provider from "./Provider";
import { AuthProvider } from "./contexts/AuthContext";
import ScrollToTop from "./components/ScrollToTop";
import Analytics from "./components/Analytics";

const root = document.getElementById("root")!;

ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <ScrollToTop />
    <Analytics />
    <AuthProvider>
      <Provider>
        <Layout>
          <Router />
        </Layout>
      </Provider>
    </AuthProvider>
  </BrowserRouter>
);
