"use client";
// blocks/marketing/admin/MarketingAdmin.tsx
import MarketingCampaign from "@/components/dashboards/MarketingCampaign";
import type { BlockAdminProps } from "@/types/blocks";

export default function MarketingAdmin({ negocio }: BlockAdminProps) {
  return <MarketingCampaign negocio={negocio} />;
}