// Vercel serverless entry — uses precompiled dist so @vercel/node never invokes
// the TypeScript compiler (TS 7 removed ts.sys, which breaks @vercel/node).
export { default } from "../dist/index.js";
