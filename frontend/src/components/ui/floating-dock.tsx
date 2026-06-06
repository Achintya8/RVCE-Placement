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
}: {
  items: FloatingDockItem[]
  desktopClassName?: string
  mobileClassName?: string
}) {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
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

  return (
    <motion.div
      onMouseMove={(e: React.MouseEvent) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        'mx-auto hidden md:flex h-16 gap-8 items-end rounded-2xl bg-white/90 dark:bg-slate-900/90 px-10 pb-3 shadow-[0_12px_32px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-white/10 backdrop-blur-xl',
        className
      )}
    >
      {items.map((item) => (
        <IconContainer mouseX={mouseX} key={item.title} {...item} />
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
}: FloatingDockItem & { mouseX: any }) {
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
      style={{ width, height }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative rounded-full flex items-center justify-center transition-colors cursor-pointer',
        active
          ? 'bg-primary text-white shadow-md shadow-primary/30'
          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
      )}
      onClick={onClick}
    >
      <AnimatePresence>
        {hovered && (
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
}: {
  items: FloatingDockItem[]
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className={cn('relative block md:hidden', className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute bottom-full mb-3 right-0 flex flex-col gap-2 items-end z-50"
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
                  onClick={() => {
                    item.onClick?.()
                    setOpen(false)
                  }}
                  className={cn(
                    'h-11 w-11 rounded-full flex items-center justify-center border shadow-lg cursor-pointer transition-colors',
                    item.active
                      ? 'bg-primary text-white border-primary/20 shadow-primary/20'
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
        onClick={() => setOpen(!open)}
        className="h-12 w-12 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-lg cursor-pointer border border-primary/10 transition-transform active:scale-95"
      >
        <span className="text-xl font-bold">{open ? '✕' : '☰'}</span>
      </button>
    </div>
  )
}
