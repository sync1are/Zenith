import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants, useDragControls } from 'framer-motion';
import { X, Minus, Maximize2, LayoutPanelLeft, LayoutPanelTop, LayoutPanelLeft as LayoutRight } from 'lucide-react';
import { AppConfig } from '../types';

interface WindowProps {
    app: AppConfig;
    isOpen: boolean;
    isMinimized: boolean;
    isActive: boolean;
    zIndex: number;
    iconRect?: DOMRect;
    mode?: 'normal' | 'maximized' | 'left' | 'right';
    position?: { x: number; y: number };
    onClose: () => void;
    onMinimize: () => void;
    onMaximize: () => void;
    onSnap: (mode: 'left' | 'right' | 'normal') => void;
    onMove?: (x: number, y: number) => void;
    onFocus: () => void;
}

const getVariants = (width: number, height: number, mode: string, position?: { x: number; y: number }): Variants => {
    // Calculate dimensions based on mode
    let targetWidth = width;
    let targetHeight = height;
    let targetX = position?.x || 0;
    let targetY = position?.y || 0;

    // We need to calculate offsets relative to the initial centered position
    // Initial position is: left: calc(50% - width/2), top: 100px
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const centerX = windowWidth / 2;
    const initialTop = 100;

    // Calculate the 'zero' point (where the window is initially placed via CSS)
    const initialLeft = centerX - (width / 2);

    if (mode === 'maximized') {
        targetWidth = windowWidth;
        targetHeight = windowHeight; // Full height, cover dock
        // Move to top-left (0,0) relative to screen
        // Current CSS position is (initialLeft, initialTop)
        // So we need to translate by (-initialLeft, -initialTop)
        targetX = -initialLeft;
        targetY = -initialTop;
    } else if (mode === 'left') {
        targetWidth = windowWidth / 2;
        targetHeight = windowHeight - 80;
        targetX = -initialLeft;
        targetY = -initialTop;
    } else if (mode === 'right') {
        targetWidth = windowWidth / 2;
        targetHeight = windowHeight - 80;
        targetX = (windowWidth / 2) - initialLeft;
        targetY = -initialTop;
    }

    return {
        initial: (custom: { iconRect?: DOMRect }) => {
            if (!custom?.iconRect) {
                return { opacity: 0, scale: 0.8, y: 100, x: 0 };
            }

            const windowCenterX = window.innerWidth / 2;
            const windowCenterY = 100 + height / 2;
            const iconCenterX = custom.iconRect.left + custom.iconRect.width / 2;
            const iconCenterY = custom.iconRect.top + custom.iconRect.height / 2;

            return {
                x: iconCenterX - windowCenterX,
                y: iconCenterY - windowCenterY,
                scale: 0.05,
                opacity: 0,
            };
        },
        animate: {
            opacity: 1,
            scale: 1,
            x: targetX,
            y: targetY,
            width: targetWidth,
            height: targetHeight,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 30,
            }
        },
        exit: (custom: { iconRect?: DOMRect }) => {
            if (!custom?.iconRect) {
                return { opacity: 0, scale: 0.8, y: 100, transition: { duration: 0.15 } };
            }

            const windowCenterX = window.innerWidth / 2;
            const windowCenterY = 100 + height / 2;
            const iconCenterX = custom.iconRect.left + custom.iconRect.width / 2;
            const iconCenterY = custom.iconRect.top + custom.iconRect.height / 2;

            return {
                x: iconCenterX - windowCenterX,
                y: iconCenterY - windowCenterY,
                scale: 0.05,
                opacity: 0,
                transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] }
            };
        }
    };
};

export const Window: React.FC<WindowProps> = ({
    app,
    isOpen,
    isMinimized,
    isActive,
    zIndex,
    iconRect,
    mode = 'normal',
    position,
    onClose,
    onMinimize,
    onMaximize,
    onSnap,
    onMove,
    onFocus
}) => {
    const width = app.width || 600;
    const height = app.height || 500;
    const [isDragging, setIsDragging] = useState(false);
    const dragControls = useDragControls();

    const variants = React.useMemo(() => getVariants(width, height, mode, position), [width, height, mode, position]);

    return (
        <AnimatePresence>
            {isOpen && !isMinimized && (
                <motion.div
                    custom={{ iconRect }}
                    variants={variants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    drag
                    dragListener={false}
                    dragControls={dragControls}
                    dragMomentum={false}
                    dragElastic={0}
                    dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
                    onDragStart={(event, info) => {
                        setIsDragging(true);
                        onFocus();

                        // Drag to restore logic
                        if (mode !== 'normal') {
                            // Calculate where to place the window so the mouse is over the title bar
                            // Center horizontally on mouse
                            const windowWidth = window.innerWidth;
                            const centerX = windowWidth / 2;
                            // info.point.x is global mouse x
                            // We want x (offset from center) such that:
                            // center + x + width/2 = mouseX ? No.
                            // The window is positioned at left: calc(50% - width/2)
                            // So its center is at 50% + x
                            // We want 50% + x = mouseX
                            // x = mouseX - 50%

                            const newX = info.point.x - centerX;
                            const newY = info.point.y - 120; // 100px top offset + 20px title bar offset

                            if (onMove) onMove(newX, newY);
                            onSnap('normal');
                        }
                    }}
                    onDragEnd={(event, info) => {
                        setIsDragging(false);
                        // Save position
                        if (mode === 'normal' && onMove) {
                            // We need to add the drag offset to the current position
                            // info.offset is the drag distance
                            // But framer motion might have already applied it to the visual state?
                            // Actually, if we use 'x' and 'y' in animate, we should update them.
                            // The easiest way is to read the current x/y from the point?
                            // Or just use the delta?

                            // Better: use the final point relative to center
                            const windowWidth = window.innerWidth;
                            const centerX = windowWidth / 2;
                            const newX = info.point.x - centerX; // Assuming we grabbed center-ish? 
                            // Wait, info.point is where the mouse is.
                            // If we grabbed the title bar, the window x should be relative to that.
                            // This is an approximation but good enough for "drop where I left it"

                            // A more accurate way:
                            // currentX = position?.x || 0
                            // newX = currentX + info.offset.x
                            const currentX = position?.x || 0;
                            const currentY = position?.y || 0;
                            if (onMove) onMove(currentX + info.offset.x, currentY + info.offset.y);
                        }
                    }}
                    onMouseDown={onFocus}
                    style={{
                        zIndex,
                        position: 'absolute',
                        left: `calc(50% - ${width / 2}px)`,
                        top: `calc(50% - ${height / 2}px)`,
                        transformOrigin: "center center",
                        boxShadow: isDragging
                            ? '0 25px 50px rgba(0,0,0,0.25)'
                            : '0 20px 40px rgba(0,0,0,0.15)',
                        willChange: 'transform, width, height',
                    }}
                    className={`
            flex flex-col overflow-hidden rounded-2xl
            bg-white/80 border border-white/50
            transition-shadow duration-150
            ${isActive ? '' : 'opacity-90'}
            ${mode !== 'normal' ? 'rounded-none border-0' : ''} 
          `}
                >
                    {/* Title Bar - Drag Handle */}
                    <div
                        className="h-10 flex items-center justify-between px-4 select-none cursor-grab active:cursor-grabbing bg-white/20"
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            onFocus();
                            dragControls.start(e);
                        }}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            onMaximize();
                        }}
                    >
                        {/* Traffic Lights */}
                        <div className="flex gap-2 group z-10 items-center">
                            <button
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors flex items-center justify-center"
                            >
                                <X size={7} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-900" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onMinimize(); }}
                                className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors flex items-center justify-center"
                            >
                                <Minus size={7} className="opacity-0 group-hover:opacity-100 transition-opacity text-yellow-900" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onMaximize(); }}
                                className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 transition-colors flex items-center justify-center"
                            >
                                <Maximize2 size={7} className="opacity-0 group-hover:opacity-100 transition-opacity text-green-900" />
                            </button>
                        </div>

                        <div className="absolute left-0 right-0 text-center pointer-events-none text-xs font-semibold text-gray-700/90">
                            {app.title}
                        </div>

                        {/* Snap Controls */}
                        <div className="flex items-center gap-1 z-10">
                            <button
                                onClick={(e) => { e.stopPropagation(); onSnap('left'); }}
                                className="p-1 hover:bg-black/5 rounded text-gray-500 hover:text-gray-700 transition-colors"
                                title="Snap Left"
                            >
                                <LayoutPanelLeft size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onSnap('right'); }}
                                className="p-1 hover:bg-black/5 rounded text-gray-500 hover:text-gray-700 transition-colors"
                                title="Snap Right"
                            >
                                <LayoutRight size={14} className="rotate-180" />
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div
                        className="flex-1 overflow-hidden relative bg-white/60"
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{
                            pointerEvents: isDragging ? 'none' : 'auto'
                        }}
                    >
                        {app.component}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
