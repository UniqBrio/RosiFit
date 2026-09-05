// Metro's config. Expo generates a default one implicitly; this file exists
// for a single resolver override and adds nothing else.
//
// WHY IT EXISTS
// exceljs ships two builds. `main` is the NODE one and pulls in archiver,
// unzipper, tmp and readable-stream — Node's filesystem and stream stack.
// `browser` is the self-contained bundle at dist/exceljs.min.js. Metro reads
// `main` (its resolverMainFields are react-native/browser/main, and exceljs
// declares no `react-native` field, but the failure below shows which half it
// picked in practice), so the app bundle reached for archiver and died on:
//
//   While trying to resolve module `async` from
//   node_modules/archiver/lib/core.js ...
//
// RosiFit ships as a PWA. The browser build is the correct half, the only one
// that can bundle for web or native, and the one the member import needs —
// it reads and writes the same .xlsx either way.
//
// Scoped to exceljs deliberately. Setting `resolverMainFields` globally to
// prefer `browser` would change resolution for every dependency in the tree,
// including @supabase/supabase-js, to fix one package.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// SECOND LINE OF DEFENCE, not the fix. src/data/memberXlsx.ts imports
// `exceljs/dist/exceljs.min.js` by name, so nothing has to be configured for
// the app to work — a config file is read ONCE at startup, and a dev server
// begun before this file existed kept failing while the repo looked fixed.
// This stays so that a future plain `import 'exceljs'` cannot quietly bring
// the Node build back.
const EXCELJS_BROWSER = path.resolve(__dirname, 'node_modules/exceljs/dist/exceljs.min.js');
const previous = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'exceljs') {
    return { type: 'sourceFile', filePath: EXCELJS_BROWSER };
  }
  return previous
    ? previous(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
