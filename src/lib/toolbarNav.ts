/**
 * Roving-tabindex math for a horizontal WAI-ARIA toolbar.
 * Returns the next focus index for a navigation key, or null if `key` is not
 * a navigation key (the caller then lets the event through). Arrow movement
 * wraps; Home/End jump to the ends.
 *
 * @param key     KeyboardEvent.key
 * @param current index of the currently focused control (0-based)
 * @param count   number of focusable controls in the toolbar
 */
export function nextToolbarIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}
