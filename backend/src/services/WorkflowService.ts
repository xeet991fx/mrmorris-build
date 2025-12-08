/**
 * Workflow Service (Legacy Compatibility)
 * 
 * This file redirects to the new modular workflow service.
 * Kept for backward compatibility with existing imports.
 * 
 * @deprecated Use imports from './workflow' instead
 */

// Re-export everything from the new modular service
export * from "./workflow";
export { default } from "./workflow";
