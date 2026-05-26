import type { JsxNode } from "../jsx-parser/index.js";

/**
 * A function declaration extracted from the JSX file. Captures the
 * function's parameter names and the JSX tree it returns. Components
 * with state (useState, useEffect, .map, complex logic) are flagged
 * `isComplex` so the linker can decide how to handle them.
 */
export interface ComponentDef {
  name: string;
  /** Names of the destructured props parameter, e.g. `["children", "dimmedTabBar"]`. */
  paramNames: string[];
  /** The component's returned JsxNode tree (the body of the JSX function). */
  body: JsxNode | null;
  /** True if the function uses useState/useEffect/.map() or other dynamic constructs the static linker can't resolve. */
  isComplex: boolean;
  /** Defaults captured from destructuring like `placeholder = 'Adicionar item…'` */
  paramDefaults: Record<string, string | number | boolean | null>;
}

export interface LinkOptions {
  /** Max number of inlining passes before giving up (avoids infinite recursion). Default 6. */
  maxDepth?: number;
  /** When a complex/unknown component is referenced, render as an empty frame named after the component. Default: true. */
  preserveComplexAsStub?: boolean;
}
