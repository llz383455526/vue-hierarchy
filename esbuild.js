const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/**
 * Plugin to mark optional/dynamic requires in node_modules as external.
 * This handles the consolidate.js template engines bundled with @vue/compiler-sfc.
 * @type {import('esbuild').Plugin}
 */
const optionalExternalsPlugin = {
  name: "optional-externals",
  setup(build) {
    // Mark all optional template engine requires from consolidate.js as external
    const optionalDeps = [
      "velocityjs",
      "dustjs-linkedin",
      "atpl",
      "liquor",
      "twig",
      "ejs",
      "eco",
      "jazz",
      "jqtpl",
      "hamljs",
      "hamlet",
      "whiskers",
      "haml-coffee",
      "hogan.js",
      "templayed",
      "handlebars",
      "underscore",
      "lodash",
      "walrus",
      "mustache",
      "just",
      "ect",
      "mote",
      "toffee",
      "dot",
      "bracket-template",
      "ractive",
      "htmling",
      "babel-core",
      "plates",
      "react-dom/server",
      "react",
      "vash",
      "slm",
      "marko",
      "teacup/lib/express",
      "coffee-script",
      "squirrelly",
      "twing",
    ];
    const filter = new RegExp(
      "^(" +
        optionalDeps
          .map((d) => d.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&"))
          .join("|") +
        ")$",
    );
    build.onResolve({ filter }, (args) => ({
      path: args.path,
      external: true,
    }));
  },
};

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  format: "cjs",
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  platform: "node",
  outfile: "dist/extension.js",
  external: ["vscode"],
  plugins: [optionalExternalsPlugin],
  logLevel: "info",
  target: "es2020",
};

async function main() {
  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("[esbuild] watching...");
  } else {
    await esbuild.build(buildOptions);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
