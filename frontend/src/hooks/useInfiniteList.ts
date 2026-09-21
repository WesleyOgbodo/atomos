import { useEffect, useMemo, useRef, useState } from 'react'

export function useInfiniteList<T>(items: T[], pageSize = 20) {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setVisibleCount(pageSize)
  }, [items, pageSize])

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount])
  const hasMore = visibleCount < items.length

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount(count => Math.min(count + pageSize, items.length))
        }
      },
      { rootMargin: '1800px 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, items.length, pageSize])

  return { visibleItems, hasMore, sentinelRef }
}
