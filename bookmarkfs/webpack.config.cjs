const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");

/** @param {string} filePath */
function parseEnvFile(filePath) {
  const out = {};
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
  } catch {
    /* file missing */
  }
  return out;
}

const bookmarkEnv = parseEnvFile(path.join(__dirname, ".env"));
const parentLocal = parseEnvFile(path.join(__dirname, "..", ".env.local"));
const parentEnv = parseEnvFile(path.join(__dirname, "..", ".env"));

const defaultSiteUrl =
  process.env.WOXBIN_DEFAULT_SITE_URL ||
  bookmarkEnv.WOXBIN_DEFAULT_SITE_URL ||
  parentLocal.WOXBIN_DEFAULT_SITE_URL ||
  parentLocal.NEXT_PUBLIC_APP_URL ||
  parentEnv.NEXT_PUBLIC_APP_URL ||
  "";

module.exports = {
  entry: {
    bundle: "./src/index.js",
    afterdark: "./src/afterdark.js",
    darkbin: "./src/darkbin.js"
  },
  mode: "production",
  devtool: false,
  experiments: {
    asyncWebAssembly: true,
    topLevelAwait: true
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    fallback: {
      fs: false,
      path: false,
      child_process: false,
      util: false,
      process: false
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      __WOXBIN_DEFAULT_SITE_URL__: JSON.stringify(defaultSiteUrl)
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/ui/index.html", to: "index.html" },
        { from: "src/ui/afterdark.html", to: "afterdark.html" },
        { from: "src/ui/darkbin.html", to: "darkbin.html" },
        { from: "src/ui/style.css", to: "style.css" },
        { from: "src/ui/afterdark-inject.css", to: "afterdark-inject.css" },
        { from: "node_modules/node-unrar-js/dist/js/unrar.wasm", to: "unrar.wasm" }
      ]
    })
  ],
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist")
  }
};
