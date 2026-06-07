import { useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface FloatingDockItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

export function FloatingDock({
  items,
  desktopClassName,
  mobileClassName,
  mobileExpandDirection = 'up',
  mobileAlign = 'right',
}: {
  items: FloatingDockItem[]
  desktopClassName?: string
  mobileClassName?: string
  mobileExpandDirection?: 'up' | 'down'
  mobileAlign?: 'left' | 'right'
}) {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile
        items={items}
        className={mobileClassName}
        expandDirection={mobileExpandDirection}
        align={mobileAlign}
      />
    </>
  )
}

function FloatingDockDesktop({
  items,
  className,
}: {
  items: FloatingDockItem[]
  className?: string
}) {
  const mouseX = useMotionValue(Infinity)
  const [activeTouchTitle, setActiveTouchTitle] = useState<string | null>(null)

  const updateTouchActiveItem = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY)
    if (!element) return
    const container = element.closest('[data-dock-title]')
    if (container) {
      const title = container.getAttribute('data-dock-title')
      setActiveTouchTitle(title)
    } else {
      setActiveTouchTitle(null)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0]
      mouseX.set(touch.pageX)
      updateTouchActiveItem(touch.clientX, touch.clientY)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0]
      mouseX.set(touch.pageX)
      updateTouchActiveItem(touch.clientX, touch.clientY)
    }
  }

  const handleTouchEnd = () => {
    mouseX.set(Infinity)
    if (activeTouchTitle) {
      const item = items.find((i) => i.title === activeTouchTitle)
      if (item && item.onClick) {
        item.onClick()
      }
    }
    setActiveTouchTitle(null)
  }

  return (
    <motion.div
      onMouseMove={(e: React.MouseEvent) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn(
        'mx-auto flex h-16 items-end rounded-2xl bg-white/90 dark:bg-slate-900/90 shadow-[0_12px_32px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-white/10 backdrop-blur-xl touch-none',
        className
      )}
    >
      {items.map((item) => (
        <IconContainer
          mouseX={mouseX}
          key={item.title}
          {...item}
          isTouchHovered={activeTouchTitle === item.title}
        />
      ))}
    </motion.div>
  )
}

function IconContainer({
  mouseX,
  title,
  icon,
  href,
  onClick,
  active,
  isTouchHovered = false,
}: FloatingDockItem & { mouseX: any; isTouchHovered?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - bounds.x - bounds.width / 2
  })

  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 72, 40])
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 72, 40])

  const widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 36, 20])
  const heightTransformIcon = useTransform(distance, [-150, 0, 150], [20, 36, 20])

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  })
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  })

  const widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  })
  const heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  })

  const [hovered, setHovered] = useState(false)

  const content = (
    <motion.div
      ref={ref}
      data-dock-title={title}
      style={{ width, height }}
      onMouseEnter={() => {
        if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
          setHovered(true)
        }
      }}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative rounded-full flex items-center justify-center transition-colors cursor-pointer',
        active
          ? 'bg-primary text-white shadow-md shadow-primary/30'
          : (hovered || isTouchHovered)
            ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
      )}
      onClick={onClick}
    >
      <AnimatePresence>
        {(hovered || isTouchHovered) && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 2, x: '-50%' }}
            className="px-2 py-1 whitespace-pre rounded-md bg-slate-900 border border-slate-700 text-white absolute left-1/2 -translate-x-1/2 -top-10 w-fit text-[11px] font-semibold shadow-md"
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        style={{ width: widthIcon, height: heightIcon }}
        className="flex items-center justify-center [&>svg]:h-full [&>svg]:w-full [&>img]:h-full [&>img]:w-full [&>img]:object-cover [&>img]:rounded-full"
      >
        {icon}
      </motion.div>
    </motion.div>
  )

  return href ? (
    <a href={href} className="flex items-center justify-center">
      {content}
    </a>
  ) : (
    content
  )
}

function FloatingDockMobile({
  items,
  className,
  expandDirection = 'up',
  align = 'right',
}: {
  items: FloatingDockItem[]
  className?: string
  expandDirection?: 'up' | 'down'
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const [activeTouchTitle, setActiveTouchTitle] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartPos = useRef({ x: 0, y: 0 })

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY }
    setIsDragging(false)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartPos.current.x
    const dy = touch.clientY - touchStartPos.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 10) {
      if (!isDragging) {
        setIsDragging(true)
        setOpen(true)
      }
      e.preventDefault()

      const element = document.elementFromPoint(touch.clientX, touch.clientY)
      if (element) {
        const container = element.closest('[data-mobile-dock-title]')
        if (container) {
          const title = container.getAttribute('data-mobile-dock-title')
          setActiveTouchTitle(title)
        } else {
          setActiveTouchTitle(null)
        }
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isDragging) {
      e.preventDefault()
      if (activeTouchTitle) {
        const item = items.find((i) => i.title === activeTouchTitle)
        if (item && item.onClick) {
          item.onClick()
        }
      }
      setOpen(false)
    }
    setActiveTouchTitle(null)
    setIsDragging(false)
  }

  return (
    <div className={className}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className={cn(
              "absolute z-50 flex flex-col gap-2",
              expandDirection === 'up' ? "bottom-full mb-3" : "top-full mt-3",
              align === 'left' ? "left-0 items-start" : "right-0 items-end"
            )}
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  scale: 0.8,
                  transition: {
                    delay: idx * 0.03,
                  },
                }}
                transition={{ delay: (items.length - 1 - idx) * 0.03 }}
                className="flex items-center gap-2"
              >
                <div className="rounded-md bg-slate-900/90 border border-slate-700 px-2 py-1 text-[10px] font-semibold text-white shadow-md">
                  {item.title}
                </div>
                <button
                  type="button"
                  data-mobile-dock-title={item.title}
                  onClick={() => {
                    item.onClick?.()
                    setOpen(false)
                  }}
                  className={cn(
                    'h-11 w-11 rounded-full flex items-center justify-center border shadow-lg cursor-pointer transition-all duration-150',
                    item.active
                      ? 'bg-primary text-white border-primary/20 shadow-primary/20'
                      : activeTouchTitle === item.title
                        ? 'bg-slate-200 border-slate-300 dark:bg-slate-800 dark:border-slate-700 text-slate-900 dark:text-white scale-110 shadow-md shadow-slate-300/30'
                        : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-white/10 text-slate-600 dark:text-slate-300'
                  )}
                >
                  <div className="h-5 w-5 flex items-center justify-center [&>svg]:h-full [&>svg]:w-full [&>img]:h-full [&>img]:w-full [&>img]:object-cover [&>img]:rounded-full">
                    {item.icon}
                  </div>
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (!isDragging) {
            setOpen((prev) => !prev)
          }
        }}
        className="h-10 w-10 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-md cursor-pointer border border-primary/10 transition-transform active:scale-95"
      >
        <span className="text-lg font-bold">{open ? '✕' : '☰'}</span>
      </button>
    </div>
  )
}


