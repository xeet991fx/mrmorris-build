"use client";

/**
 * Canvas Form Builder
 *
 * A 2D drag-and-drop form designer with:
 * - Free XY positioning
 * - Resize handles
 * - Grid snap system
 * - Layer management
 * - Content blocks (text, images, etc.)
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
    PlusIcon,
    TrashIcon,
    Squares2X2Icon,
    CursorArrowRaysIcon,
    DocumentTextIcon,
    PhotoIcon,
    PencilIcon,
    EnvelopeIcon,
    PhoneIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    ArrowsPointingOutIcon,
    LockClosedIcon,
    LockOpenIcon,
    EyeIcon,
    EyeSlashIcon,
    ChevronUpIcon,
    ChevronDownIcon as ChevronDownIconSolid,
    ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { FormField, FieldType } from "@/lib/api/form";

interface CanvasElement extends FormField {
    canvas: {
        x: number;
        y: number;
        width: number;
        height: number;
        zIndex: number;
        locked?: boolean;
        visible?: boolean;
    };
}

interface CanvasFormBuilderProps {
    elements: CanvasElement[];
    onChange: (elements: CanvasElement[]) => void;
    canvasWidth?: number;
    canvasHeight?: number;
    gridSize?: number;
    showGrid?: boolean;
}

// Element types available in canvas mode
const CANVAS_ELEMENTS = [
    // Form Fields
    { type: "text", label: "Text Input", Icon: PencilIcon, category: "fields" },
    { type: "email", label: "Email", Icon: EnvelopeIcon, category: "fields" },
    { type: "phone", label: "Phone", Icon: PhoneIcon, category: "fields" },
    { type: "textarea", label: "Text Area", Icon: DocumentTextIcon, category: "fields" },
    { type: "select", label: "Dropdown", Icon: ChevronDownIcon, category: "fields" },
    { type: "checkbox", label: "Checkbox", Icon: CheckCircleIcon, category: "fields" },
    // Content Elements
    { type: "heading", label: "Heading", Icon: DocumentTextIcon, category: "content" },
    { type: "paragraph", label: "Paragraph", Icon: DocumentTextIcon, category: "content" },
    // Image removed as per request
    { type: "divider", label: "Divider", Icon: ArrowsPointingOutIcon, category: "content" },
    { type: "spacer", label: "Spacer", Icon: Squares2X2Icon, category: "content" },
    { type: "button", label: "Button", Icon: CursorArrowRaysIcon, category: "content" },
];

export default function CanvasFormBuilder({
    elements,
    onChange,
    canvasWidth = 800,
    canvasHeight = 1200,
    gridSize = 20,
    showGrid = true,
}: CanvasFormBuilderProps) {

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [elementStart, setElementStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [resizeHandle, setResizeHandle] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [showElementPanel, setShowElementPanel] = useState(true);
    const canvasRef = useRef<HTMLDivElement>(null);

    const selectedElement = elements.find((el) => el.id === selectedId);

    // Snap to grid
    const snapToGrid = (value: number) => {
        return Math.round(value / gridSize) * gridSize;
    };

    // Generate unique ID
    const generateId = () => `elem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add new element
    const addElement = (type: FieldType) => {
        const newElement: CanvasElement = {
            id: generateId(),
            type,
            label: type === "heading" ? "Heading" : type === "paragraph" ? "Your text here..." : `New ${type}`,
            required: false,
            canvas: {
                x: 50,
                y: 50 + elements.length * 80,
                width: type === "button" ? 150 : type === "heading" ? 400 : 300,
                height: type === "textarea" ? 100 : type === "heading" ? 50 : type === "paragraph" ? 80 : 60,
                zIndex: elements.length + 1,
                locked: false,
                visible: true,
            },
        };
        onChange([...elements, newElement]);
        setSelectedId(newElement.id);
    };

    // Delete element
    const deleteElement = (id: string) => {
        onChange(elements.filter((el) => el.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    // Update element
    const updateElement = (id: string, updates: Partial<CanvasElement>) => {
        onChange(
            elements.map((el) =>
                el.id === id ? { ...el, ...updates } : el
            )
        );
    };

    // Handle mouse down on element
    const handleMouseDown = (e: React.MouseEvent, element: CanvasElement, handle?: string) => {
        e.stopPropagation();
        if (element.canvas.locked) return;

        setSelectedId(element.id);

        if (handle) {
            setIsResizing(true);
            setResizeHandle(handle);
        } else {
            setIsDragging(true);
        }

        setDragStart({ x: e.clientX, y: e.clientY });
        setElementStart({
            x: element.canvas.x,
            y: element.canvas.y,
            width: element.canvas.width,
            height: element.canvas.height,
        });
    };

    // Handle mouse move
    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!selectedId) return;

            const element = elements.find((el) => el.id === selectedId);
            if (!element || element.canvas.locked) return;

            const deltaX = (e.clientX - dragStart.x) / zoom;
            const deltaY = (e.clientY - dragStart.y) / zoom;

            if (isDragging) {
                const newX = snapToGrid(Math.max(0, Math.min(canvasWidth - element.canvas.width, elementStart.x + deltaX)));
                const newY = snapToGrid(Math.max(0, elementStart.y + deltaY));

                updateElement(selectedId, {
                    canvas: { ...element.canvas, x: newX, y: newY },
                });
            } else if (isResizing && resizeHandle) {
                let newWidth = element.canvas.width;
                let newHeight = element.canvas.height;
                let newX = element.canvas.x;
                let newY = element.canvas.y;

                if (resizeHandle.includes("e")) {
                    newWidth = snapToGrid(Math.max(50, elementStart.width + deltaX));
                }
                if (resizeHandle.includes("w")) {
                    newWidth = snapToGrid(Math.max(50, elementStart.width - deltaX));
                    newX = snapToGrid(elementStart.x + deltaX);
                }
                if (resizeHandle.includes("s")) {
                    newHeight = snapToGrid(Math.max(30, elementStart.height + deltaY));
                }
                if (resizeHandle.includes("n")) {
                    newHeight = snapToGrid(Math.max(30, elementStart.height - deltaY));
                    newY = snapToGrid(elementStart.y + deltaY);
                }

                updateElement(selectedId, {
                    canvas: { ...element.canvas, x: newX, y: newY, width: newWidth, height: newHeight },
                });
            }
        },
        [isDragging, isResizing, selectedId, dragStart, elementStart, zoom, elements, resizeHandle]
    );

    // Handle mouse up
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
        setResizeHandle(null);
    }, []);

    // Add/remove mouse event listeners
    useEffect(() => {
        if (isDragging || isResizing) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

    // Bring to front / send to back
    const bringToFront = (id: string) => {
        const maxZ = Math.max(...elements.map((el) => el.canvas.zIndex));
        updateElement(id, {
            canvas: { ...elements.find((el) => el.id === id)!.canvas, zIndex: maxZ + 1 },
        });
    };

    const sendToBack = (id: string) => {
        const minZ = Math.min(...elements.map((el) => el.canvas.zIndex));
        updateElement(id, {
            canvas: { ...elements.find((el) => el.id === id)!.canvas, zIndex: minZ - 1 },
        });
    };

    // Render element content based on type
    const renderElementContent = (element: CanvasElement) => {
        switch (element.type) {
            case "heading":
                return (
                    <div className="text-xl font-bold text-gray-800 p-2">
                        {element.label || "Heading"}
                    </div>
                );
            case "paragraph":
                return (
                    <div className="text-sm text-gray-600 p-2 leading-relaxed">
                        {element.label || "Paragraph text goes here..."}
                    </div>
                );
            case "image":
                return (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded">
                        <PhotoIcon className="w-12 h-12 text-gray-300" />
                    </div>
                );
            case "divider":
                return <div className="w-full h-px bg-gray-300 my-auto" />;
            case "spacer":
                return <div className="w-full h-full bg-gray-50 border border-dashed border-gray-200 rounded" />;
            case "button":
                return (
                    <button className="w-full h-full bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors">
                        {element.label || "Submit"}
                    </button>
                );
            default:
                // Form fields
                return (
                    <div className="p-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {element.label}
                            {element.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {element.type === "textarea" ? (
                            <div className="w-full h-16 bg-white border border-gray-300 rounded px-3 py-2 text-gray-400 text-sm">
                                {element.placeholder || "Enter text..."}
                            </div>
                        ) : element.type === "select" ? (
                            <div className="w-full h-10 bg-white border border-gray-300 rounded px-3 flex items-center justify-between text-gray-400 text-sm">
                                <span>{element.placeholder || "Select..."}</span>
                                <ChevronDownIcon className="w-4 h-4" />
                            </div>
                        ) : element.type === "checkbox" ? (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                                <span className="text-sm text-gray-600">{element.placeholder || "Option"}</span>
                            </div>
                        ) : (
                            <div className="w-full h-10 bg-white border border-gray-300 rounded px-3 flex items-center text-gray-400 text-sm">
                                {element.placeholder || "Enter value..."}
                            </div>
                        )}
                    </div>
                );
        }
    };

    // Resize handles
    const ResizeHandles = ({ isSelected }: { isSelected: boolean }) => {
        if (!isSelected) return null;

        const handles = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
        const handleStyles: Record<string, string> = {
            n: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-n-resize",
            ne: "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize",
            e: "top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-e-resize",
            se: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize",
            s: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize",
            sw: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize",
            w: "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-w-resize",
            nw: "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize",
        };

        return (
            <>
                {handles.map((handle) => (
                    <div
                        key={handle}
                        className={cn(
                            "absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-sm z-50",
                            handleStyles[handle]
                        )}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            const element = elements.find((el) => el.id === selectedId);
                            if (element) handleMouseDown(e, element, handle);
                        }}
                    />
                ))}
            </>
        );
    };

    return (
        <div className="flex h-full bg-gray-100">
            {/* Left Panel - Elements */}
            <div
                className={cn(
                    "bg-white border-r border-gray-200 transition-all overflow-y-auto",
                    showElementPanel ? "w-64" : "w-12"
                )}
            >
                <button
                    onClick={() => setShowElementPanel(!showElementPanel)}
                    className="w-full p-3 flex items-center justify-center hover:bg-gray-50"
                >
                    <Squares2X2Icon className="w-5 h-5 text-gray-500" />
                </button>

                {showElementPanel && (
                    <div className="p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Form Fields</h3>
                        <div className="space-y-1 mb-6">
                            {CANVAS_ELEMENTS.filter((el) => el.category === "fields").map(({ type, label, Icon }) => (
                                <button
                                    key={type}
                                    onClick={() => addElement(type as FieldType)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-left text-sm"
                                >
                                    <Icon className="w-4 h-4 text-gray-500" />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>

                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Content</h3>
                        <div className="space-y-1">
                            {CANVAS_ELEMENTS.filter((el) => el.category === "content").map(({ type, label, Icon }) => (
                                <button
                                    key={type}
                                    onClick={() => addElement(type as FieldType)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-left text-sm"
                                >
                                    <Icon className="w-4 h-4 text-gray-500" />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto p-8">
                {/* Toolbar */}
                <div className="mb-4 flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-1.5">
                        <button
                            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            -
                        </button>
                        <span className="text-sm text-gray-600 min-w-[4rem] text-center">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            +
                        </button>
                    </div>

                    {selectedElement && (
                        <>
                            <div className="h-6 w-px bg-gray-200" />
                            <button
                                onClick={() => bringToFront(selectedId!)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                                title="Bring to Front"
                            >
                                <ChevronUpIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => sendToBack(selectedId!)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                                title="Send to Back"
                            >
                                <ChevronDownIconSolid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() =>
                                    updateElement(selectedId!, {
                                        canvas: { ...selectedElement.canvas, locked: !selectedElement.canvas.locked },
                                    })
                                }
                                className="p-2 hover:bg-gray-100 rounded-lg"
                                title={selectedElement.canvas.locked ? "Unlock" : "Lock"}
                            >
                                {selectedElement.canvas.locked ? (
                                    <LockClosedIcon className="w-4 h-4" />
                                ) : (
                                    <LockOpenIcon className="w-4 h-4" />
                                )}
                            </button>
                            <button
                                onClick={() => deleteElement(selectedId!)}
                                className="p-2 hover:bg-red-100 rounded-lg text-red-500"
                                title="Delete"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>

                {/* Canvas */}
                <div
                    ref={canvasRef}
                    className="relative bg-white rounded-lg shadow-lg"
                    style={{
                        width: canvasWidth * zoom,
                        height: canvasHeight * zoom,
                        transform: `scale(${zoom})`,
                        transformOrigin: "top left",
                    }}
                    onClick={() => setSelectedId(null)}
                >
                    {/* Grid */}
                    {showGrid && (
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                backgroundImage: `
                                    linear-gradient(to right, #f0f0f0 1px, transparent 1px),
                                    linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)
                                `,
                                backgroundSize: `${gridSize}px ${gridSize}px`,
                            }}
                        />
                    )}

                    {/* Elements */}
                    {[...elements]
                        .sort((a, b) => a.canvas.zIndex - b.canvas.zIndex)
                        .map((element) => {
                            const isSelected = selectedId === element.id;
                            const isVisible = element.canvas.visible !== false;

                            if (!isVisible) return null;

                            return (
                                <div
                                    key={element.id}
                                    className={cn(
                                        "absolute transition-shadow",
                                        isSelected ? "ring-2 ring-blue-500" : "hover:ring-1 hover:ring-blue-300",
                                        element.canvas.locked ? "cursor-not-allowed opacity-80" : "cursor-move"
                                    )}
                                    style={{
                                        left: element.canvas.x,
                                        top: element.canvas.y,
                                        width: element.canvas.width,
                                        height: element.canvas.height,
                                        zIndex: element.canvas.zIndex,
                                    }}
                                    onMouseDown={(e) => handleMouseDown(e, element)}
                                >
                                    {renderElementContent(element)}
                                    <ResizeHandles isSelected={isSelected && !element.canvas.locked} />
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Right Panel - Properties */}
            {selectedElement && (
                <div className="w-72 bg-white border-l border-gray-200 p-4 overflow-y-auto">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Properties</h3>

                    {/* Label */}
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                        <input
                            type="text"
                            value={selectedElement.label}
                            onChange={(e) => updateElement(selectedId!, { label: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                    </div>

                    {/* Placeholder */}
                    {!["heading", "paragraph", "image", "divider", "spacer", "button"].includes(selectedElement.type) && (
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Placeholder</label>
                            <input
                                type="text"
                                value={selectedElement.placeholder || ""}
                                onChange={(e) => updateElement(selectedId!, { placeholder: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                        </div>
                    )}

                    {/* Required */}
                    {!["heading", "paragraph", "image", "divider", "spacer", "button"].includes(selectedElement.type) && (
                        <div className="mb-4 flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="required"
                                checked={selectedElement.required}
                                onChange={(e) => updateElement(selectedId!, { required: e.target.checked })}
                                className="rounded"
                            />
                            <label htmlFor="required" className="text-sm text-gray-700">
                                Required field
                            </label>
                        </div>
                    )}

                    {/* Position */}
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-500 mb-2">Position</label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">X</label>
                                <input
                                    type="number"
                                    value={selectedElement.canvas.x}
                                    onChange={(e) =>
                                        updateElement(selectedId!, {
                                            canvas: { ...selectedElement.canvas, x: Number(e.target.value) },
                                        })
                                    }
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Y</label>
                                <input
                                    type="number"
                                    value={selectedElement.canvas.y}
                                    onChange={(e) =>
                                        updateElement(selectedId!, {
                                            canvas: { ...selectedElement.canvas, y: Number(e.target.value) },
                                        })
                                    }
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Size */}
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-500 mb-2">Size</label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Width</label>
                                <input
                                    type="number"
                                    value={selectedElement.canvas.width}
                                    onChange={(e) =>
                                        updateElement(selectedId!, {
                                            canvas: { ...selectedElement.canvas, width: Number(e.target.value) },
                                        })
                                    }
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Height</label>
                                <input
                                    type="number"
                                    value={selectedElement.canvas.height}
                                    onChange={(e) =>
                                        updateElement(selectedId!, {
                                            canvas: { ...selectedElement.canvas, height: Number(e.target.value) },
                                        })
                                    }
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Z-Index */}
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Layer (Z-Index)</label>
                        <input
                            type="number"
                            value={selectedElement.canvas.zIndex}
                            onChange={(e) =>
                                updateElement(selectedId!, {
                                    canvas: { ...selectedElement.canvas, zIndex: Number(e.target.value) },
                                })
                            }
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                        />
                    </div>

                    {/* Delete Button */}
                    <button
                        onClick={() => deleteElement(selectedId!)}
                        className="w-full mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                    >
                        Delete Element
                    </button>
                </div>
            )}
        </div>
    );
}
