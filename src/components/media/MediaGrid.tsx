/** @file Grid layout component for displaying media cards. */

import type { MediaItem } from '../../types/media'
import { MediaCard } from './MediaCard'

/**
 * Props for MediaGrid component.
 */
interface MediaGridProps {
  /** Items to render as cards. */
  items: MediaItem[]
  /** Returns true if item is currently in favorites. */
  isFavorite: (id: string) => boolean
  /** Toggles favorite state of an item. */
  onToggleFavorite: (id: string) => void
  /** Called when user wants to open item in modal player. */
  onOpen: (item: MediaItem) => void
}

/**
 * MediaGrid renders a responsive grid of MediaCard components.
 */
export function MediaGrid({ items, isFavorite, onToggleFavorite, onOpen }: MediaGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          favorite={isFavorite(item.id)}
          onToggleFavorite={() => onToggleFavorite(item.id)}
          onOpen={() => onOpen(item)}
        />
      ))}
    </div>
  )
}
