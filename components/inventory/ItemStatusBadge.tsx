import { Badge } from "@/components/ui/badge";

type ItemStatus = "AVAILABLE" | "IN_USE" | "IN_REPAIR" | "DECOMMISSIONED";

const STATUS_LABELS: Record<ItemStatus, string> = {
  AVAILABLE: "Disponible",
  IN_USE: "En uso",
  IN_REPAIR: "En reparación",
  DECOMMISSIONED: "Dado de baja",
};

const STATUS_VARIANTS: Record<ItemStatus, "success" | "info" | "warning" | "destructive"> = {
  AVAILABLE: "success",
  IN_USE: "info",
  IN_REPAIR: "warning",
  DECOMMISSIONED: "destructive",
};

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
