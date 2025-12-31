/**
 * Helpers.gs
 * Shared utility functions used across multiple files
 */

/**
 * Helper function to escape XML special characters
 */
function escapeXml(text) {
  return text.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&apos;');
}