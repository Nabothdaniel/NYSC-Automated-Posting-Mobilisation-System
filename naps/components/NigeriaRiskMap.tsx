"use client";

import dynamic from "next/dynamic";
import type { NigeriaRiskMapProps } from "./NigeriaRiskMapInner";

const NigeriaRiskMapClient = dynamic(() => import("./NigeriaRiskMapInner"), {
  ssr: false,
  loading: () => (
    <div className="h-[430px] w-full rounded-xl border border-slate-200 bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-500">
      Loading interactive Nigeria OpenStreetMap Risk Choropleth…
    </div>
  ),
});

export function NigeriaRiskMap(props: NigeriaRiskMapProps) {
  return <NigeriaRiskMapClient {...props} />;
}
