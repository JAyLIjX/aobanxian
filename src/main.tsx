import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n";
import "./fonts.css";
import "./App.css";
import { AboutApp } from "./windows/AboutApp";
import { AnniversariesApp } from "./windows/AnniversariesApp";
import { GuaApp } from "./windows/GuaApp";
import { LotsApp } from "./windows/LotsApp";
import { MainApp } from "./windows/MainApp";
import { PreviewApp } from "./windows/PreviewApp";
import { DetailPreviewApp } from "./windows/DetailPreviewApp";
import { TextFitApp } from "./windows/TextFitApp";
import { SettingsApp } from "./windows/SettingsApp";
import { ShareApp } from "./windows/ShareApp";
import { ZeriApp } from "./windows/ZeriApp";

// 所有窗口共用同一个页面，用地址参数区分：主窗口（道士）、设置、关于、择日、纪念日……
const view = new URLSearchParams(location.search).get("view");
document.documentElement.dataset.view = view ?? "main";
const VIEWS: Record<string, () => React.JSX.Element> = {
  settings: SettingsApp,
  about: AboutApp,
  zeri: ZeriApp,
  anniversaries: AnniversariesApp,
  lots: LotsApp,
  gua: GuaApp,
  share: ShareApp,
};
const DEV_VIEWS: Record<string, () => React.JSX.Element> = import.meta.env.DEV ? { preview: PreviewApp, textfit: TextFitApp, detail: DetailPreviewApp } : {};
const App = (view && (VIEWS[view] ?? DEV_VIEWS[view])) || MainApp;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
