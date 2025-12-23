"use client";

import { ComputerDesktopIcon, DeviceTabletIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { useEmailTemplateStore } from "@/store/useEmailTemplateStore";

// ============================================
// DEVICE CONFIGURATION
// ============================================

const DEVICES = [
    {
        id: "desktop" as const,
        label: "Desktop",
        icon: ComputerDesktopIcon,
        width: "100%",
    },
    {
        id: "tablet" as const,
        label: "Tablet",
        icon: DeviceTabletIcon,
        width: "768px",
    },
    {
        id: "mobile" as const,
        label: "Mobile",
        icon: DevicePhoneMobileIcon,
        width: "375px",
    },
];

// ============================================
// COMPONENT
// ============================================

export default function DevicePreviewToggle() {
    const { previewDevice, setPreviewDevice } = useEmailTemplateStore();

    return (
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {DEVICES.map((device) => {
                const Icon = device.icon;
                const isActive = previewDevice === device.id;

                return (
                    <button
                        key={device.id}
                        onClick={() => setPreviewDevice(device.id)}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-md transition-all
                            ${
                                isActive
                                    ? "bg-card text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                            }
                        `}
                        title={device.label}
                    >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium hidden md:inline">{device.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
