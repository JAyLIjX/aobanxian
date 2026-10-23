/**
 * Remotion 配置：复用 ../src 里的真实组件。
 * - React 只用仓库根目录那一份（../node_modules/react），否则两份 React 会让 hooks 出错
 * - ../src/sprite/characters.ts 用了 Vite 的 import.meta.glob，webpack 不认识：换成 src/shims/characters.ts（同样的数据，显式 import）
 * - import.meta.env 换成常量（宣传片按正式版渲染）
 */
import { Config } from "@remotion/cli/config";
import path from "node:path";
import { webpack } from "@remotion/bundler";

const root = path.resolve(process.cwd(), "..");

// 背景音乐和音效都在 audio/（bgm.m4a、sfx/*.wav），staticFile("bgm.m4a") 从这里取
Config.setPublicDir("audio");
Config.setVideoImageFormat("png");
Config.setConcurrency(4);
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias ?? {}),
      react: path.join(root, "node_modules/react"),
      "react-dom": path.join(root, "node_modules/react-dom"),
      "react/jsx-runtime": path.join(root, "node_modules/react/jsx-runtime"),
      [path.join(root, "src/sprite/characters.ts")]: path.resolve(process.cwd(), "src/shims/characters.ts"),
    },
  },
  plugins: [
    ...(config.plugins ?? []),
    new webpack.DefinePlugin({ "import.meta.env": JSON.stringify({ DEV: false, PROD: true, MODE: "production" }) }),
    new webpack.NormalModuleReplacementPlugin(/sprite[\\/]characters(\.ts)?$/, (res) => {
      if (res.context?.startsWith(path.join(root, "src"))) res.request = path.resolve(process.cwd(), "src/shims/characters.ts");
    }),
  ],
}));
