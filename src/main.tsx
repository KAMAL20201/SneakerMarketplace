import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import Router from "./Router";
import Layout from "./layout";
import "./index.css";
import Provider from "./Provider";

const root = document.getElementById("root")!;

ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <Provider>
      <Layout>
        <Router />
      </Layout>
    </Provider>
  </BrowserRouter>
);
