import { Badge } from "@/components/ui/badge";

export function UserStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? "success" : "destructive"}>
      {isActive ? "Activo" : "Inactivo"}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: "ADMIN" | "TECHNICIAN" }) {
  return (
    <Badge variant={role === "ADMIN" ? "info" : "outline"}>
      {role === "ADMIN" ? "Admin" : "Técnico"}
    </Badge>
  );
}
