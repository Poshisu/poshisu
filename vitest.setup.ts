import "@testing-library/jest-dom";

// jsdom doesn't implement scrollIntoView; React components that use it
// would throw TypeError on mount. Mock it as a no-op for the whole test
// process — components that exercise it (ChatThread auto-scroll) get
// covered functionally elsewhere; the scroll itself isn't a unit-testable
// concern in jsdom.
if (typeof window !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}
