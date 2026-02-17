"use client";

import React, { memo, useMemo } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleQuantile } from "d3-scale";

// URL to world topology (public CDN)
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface MapChartWidgetProps {
    data: any[]; // Expected: [{ _id: "USA", count: 10 }, ...]
    metricLabel?: string;
}

const MapChartWidget = ({ data = [], metricLabel = "Count" }: MapChartWidgetProps) => {
    // Data processing: Map _id (ISO code or Name) to values
    const dataMap = useMemo(() => {
        const map = new Map();
        data.forEach(d => {
            if (d._id) {
                // Normalize keys if needed (e.g. uppercase)
                map.set(String(d._id).toUpperCase(), d.count || d.value || 0);
            }
        });
        return map;
    }, [data]);

    const maxVal = useMemo(() => Math.max(0, ...Array.from(dataMap.values())), [dataMap]);

    // Color scale logic (Simple orange gradient)
    const getColor = (value: number) => {
        if (value === 0) return null; // Use default
        // Simple linear interpolation for opacity
        const opacity = maxVal > 0 ? 0.4 + (value / maxVal) * 0.6 : 0.4;
        return `rgba(249, 115, 22, ${opacity})`; // Orange-500 with opacity
    };

    return (
        <div className="w-full h-full min-h-[200px] flex items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/20 rounded-lg overflow-hidden relative">
            <ComposableMap projection="geoMercator" projectionConfig={{ scale: 100 }}>
                <ZoomableGroup center={[0, 0]} zoom={1} minZoom={0.5} maxZoom={4}>
                    <Geographies geography={GEO_URL}>
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                // Match against data
                                // geo.properties.ISO_A3 (e.g. "USA") or NAME (e.g. "United States")
                                const iso = geo.properties.ISO_A3 ? geo.properties.ISO_A3.toUpperCase() : "";
                                const name = geo.properties.NAME ? geo.properties.NAME.toUpperCase() : "";

                                const value = dataMap.get(iso) || dataMap.get(name) || 0;
                                const fill = getColor(value);

                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill={fill || "var(--map-default-fill)"}
                                        stroke="var(--map-stroke)"
                                        strokeWidth={0.5}
                                        className="outline-none transition-colors duration-200"
                                        style={{
                                            default: {
                                                fill: fill || "var(--map-default-fill)",
                                                stroke: "var(--map-stroke)",
                                                outline: "none"
                                            },
                                            hover: {
                                                fill: value > 0 ? "#fb923c" : "var(--map-hover-fill)",
                                                outline: "none",
                                                cursor: value > 0 ? "pointer" : "default"
                                            },
                                            pressed: {
                                                fill: "#f97316",
                                                outline: "none"
                                            },
                                        }}
                                        data-tooltip-id="map-tooltip"
                                        data-tooltip-content={`${geo.properties.NAME}: ${value}`}
                                    // Simple title as fallback
                                    >
                                        <title>{`${geo.properties.NAME}: ${value}`}</title>
                                    </Geography>
                                );
                            })
                        }
                    </Geographies>
                </ZoomableGroup>
            </ComposableMap>

            {/* CSS Variables for theme support */}
            <style jsx>{`
                :global(.dark) {
                    --map-default-fill: #3f3f46; /* zinc-700 */
                    --map-hover-fill: #52525b; /* zinc-600 */
                    --map-stroke: #27272a; /* zinc-800 */
                }
                :root {
                    --map-default-fill: #e4e4e7; /* zinc-200 */
                    --map-hover-fill: #d4d4d8; /* zinc-300 */
                    --map-stroke: #ffffff;
                }
            `}</style>

            {dataMap.size === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-xs text-zinc-400">No geographic data found</p>
                </div>
            )}
        </div>
    );
};

export default memo(MapChartWidget);
