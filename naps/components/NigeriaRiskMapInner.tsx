"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";
import { RISK_COLOR } from "@/lib/constants/risk";
import { STATES, type RiskLevel } from "@/lib/constants/states";

export interface StateMapMetric {
  code: string;
  name: string;
  riskLevel: RiskLevel;
  incidentCount?: number;
  allocatedCount?: number;
  campName?: string;
  campCapacity?: number;
  campOccupied?: number;
}

export interface NigeriaRiskMapProps {
  states: StateMapMetric[];
  selectedCodes?: string[];
  excludedCode?: string;
  onSelectState?: (code: string) => void;
  height?: number;
}

export default function NigeriaRiskMapInner({
  states,
  selectedCodes = [],
  excludedCode,
  onSelectState,
  height = 430,
}: NigeriaRiskMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [9.082, 8.6753],
      zoom: 6,
      minZoom: 5,
      maxZoom: 10,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const byCode = new Map(states.map((s) => [s.code, s]));
    const staticByCode = new Map(STATES.map((s) => [s.code, s]));

    fetch("/geo/nigeria-states.geojson")
      .then((r) => r.json())
      .then((geojson) => {
        if (!mapRef.current) return;
        if (geoLayerRef.current) {
          geoLayerRef.current.remove();
        }

        const layer = L.geoJSON(geojson, {
          style: (feature) => {
            const code = feature?.properties?.code as string;
            const info = byCode.get(code);
            const risk: RiskLevel = info?.riskLevel ?? staticByCode.get(code)?.defaultRisk ?? "Moderate";
            const isSelected = selectedCodes.includes(code);
            const isOrigin = excludedCode === code;

            return {
              fillColor: isOrigin ? "#64748b" : RISK_COLOR[risk],
              weight: isSelected ? 3 : 1.2,
              opacity: 1,
              color: isSelected ? "#0f172a" : "#ffffff",
              fillOpacity: isOrigin ? 0.35 : isSelected ? 0.85 : 0.62,
            };
          },
          onEachFeature: (feature, lyr) => {
            const code = feature?.properties?.code as string;
            const st = staticByCode.get(code);
            const info = byCode.get(code);
            const risk = info?.riskLevel ?? st?.defaultRisk ?? "Moderate";
            const prefIdx = selectedCodes.indexOf(code);

            const html = `
              <div style="font-family: system-ui, sans-serif; min-width: 180px;">
                <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">
                  ${st?.name ?? feature?.properties?.name} (${code})
                </div>
                <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
                  Zone: <b>${st?.zone ?? "—"}</b> • Capital: <b>${st?.capital ?? "—"}</b>
                </div>
                <div style="font-size: 11px; margin-bottom: 3px;">
                  Security Risk: <b style="color:${RISK_COLOR[risk]}">${risk}</b>
                  ${info?.incidentCount !== undefined ? ` (${info.incidentCount} incidents)` : ""}
                </div>
                ${
                  info?.campName || st?.campName
                    ? `<div style="font-size: 11px; color: #334155;">Camp: ${info?.campName ?? st?.campName}</div>`
                    : ""
                }
                ${
                  info?.campCapacity !== undefined
                    ? `<div style="font-size: 11px; color: #334155;">Capacity: ${info.campOccupied ?? 0} / ${info.campCapacity}</div>`
                    : ""
                }
                ${
                  info?.allocatedCount !== undefined
                    ? `<div style="font-size: 11px; font-weight: 600; color: #047857; margin-top: 3px;">Posted Corps Members: ${info.allocatedCount}</div>`
                    : ""
                }
                ${
                  excludedCode === code
                    ? `<div style="font-size: 11px; font-weight: 700; color: #dc2626; margin-top: 4px;">Excluded (Your State of Origin)</div>`
                    : prefIdx >= 0
                      ? `<div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 4px;">Selected Preference #${prefIdx + 1}</div>`
                      : ""
                }
              </div>
            `;
            lyr.bindPopup(html);

            lyr.on("click", () => {
              if (onSelectState) {
                onSelectState(code);
              }
            });
          },
        });

        layer.addTo(mapRef.current);
        geoLayerRef.current = layer;
      })
      .catch(() => {});
  }, [states, selectedCodes, excludedCode, onSelectState]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
      <div ref={containerRef} style={{ height: `${height}px`, width: "100%" }} />
      <div className="bg-white/95 backdrop-blur-xs border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-700">Security Risk Legend:</span>
          {(["Low", "Moderate", "High", "Critical"] as RiskLevel[]).map((r) => (
            <span key={r} className="inline-flex items-center gap-1.5 text-slate-700">
              <span
                className="w-3 h-3 rounded-xs inline-block"
                style={{ backgroundColor: RISK_COLOR[r] }}
              />
              {r}
            </span>
          ))}
        </div>
        <span className="text-[11px] text-slate-500">
          OpenStreetMap + GeoBoundaries ADM1 (Click any state for details)
        </span>
      </div>
    </div>
  );
}
