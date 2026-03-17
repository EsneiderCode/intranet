"use client";

import { useState } from "react";
import { InventoryReport } from "./InventoryReport";
import { VacationReport } from "./VacationReport";
import { ActivityReport } from "./ActivityReport";

type Tab = "inventory" | "vacations" | "activity";

const TABS: { id: Tab; label: string }[] = [
  { id: "inventory", label: "Inventario" },
  { id: "vacations", label: "Vacaciones" },
  { id: "activity", label: "Actividad" },
];

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
}

interface Props {
  technicians: Technician[];
}

export function ReportsPageClient({ technicians }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("inventory");

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#1E3A5F] text-[#1E3A5F]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "inventory" && <InventoryReport technicians={technicians} />}
      {activeTab === "vacations" && <VacationReport technicians={technicians} />}
      {activeTab === "activity" && <ActivityReport technicians={technicians} />}
    </div>
  );
}
