import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next ships native flat-config arrays (no FlatCompat shim
// needed) — importing the string-based "next/core-web-vitals" shareable
// config through FlatCompat crashes ESLint on a circular-JSON error when
// it tries to validate the already-flat plugin objects as legacy config.
const eslintConfig = [...nextCoreWebVitals, ...nextTypescript];

export default eslintConfig;
