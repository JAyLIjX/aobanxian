import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n";
import "./fonts.css";
import "./App.css";
import { AboutApp } from "./windows/AboutApp";
import { MainApp } from "./windows/MainApp";
import { PreviewApp } from "./windows/PreviewApp";
import { SettingsApp } from "./windows/SettingsApp";
import { ZeriApp } from "./windows/ZeriApp";

// 三个窗口共用同一个页面，用地址参数区分：主窗口（道士）、设置、关于
const view = new URLSearchParams(location.search).get("view");
document.documentElement.dataset.view = view ?? "main";
const VIEWS: Record<string, () => React.JSX.Element> = {
  settings: SettingsApp,
  about: AboutApp,
  zeri: ZeriApp,
};
const App = (view && VIEWS[view]) || (view === "preview" && import.meta.env.DEV ? PreviewApp : MainApp);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
