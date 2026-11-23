import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, EmptyState, buttonClasses } from "@/shared/ui";

export function AdminNotFoundPage() {
  return (
    <Card>
      <title>Not found · Admin</title>
      <EmptyState
        icon={Compass}
        title="This page doesn't exist"
        description="The link may be out of date, or you may not have access to it."
        action={
          <Link to="/admin" className={buttonClasses("secondary")}>
            Go to dashboard
          </Link>
        }
      />
    </Card>
  );
}
