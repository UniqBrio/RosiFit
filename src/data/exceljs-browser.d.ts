/**
 * Types for exceljs's BROWSER build, imported by its path.
 *
 * `src/data/memberXlsx.ts` imports `exceljs/dist/exceljs.min.js` rather than
 * `exceljs`, so that no bundler gets to choose between the two builds — the
 * Node one pulls archiver, unzipper and tmp and cannot resolve for web or
 * native (RC-013). The package ships types for `exceljs` and none for the
 * bundled file, so this says the obvious thing: it is the same API.
 *
 * A declaration, not a cast, and not `skipLibCheck` loosened. The whole point
 * of naming the file is that the choice is explicit; typing it `any` would
 * hand back the safety that buys.
 */
declare module 'exceljs/dist/exceljs.min.js' {
  import type * as ExcelJS from 'exceljs';
  const ExcelJSBrowser: typeof ExcelJS;
  export default ExcelJSBrowser;
}
