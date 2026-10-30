import type { FC } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/page-elements";
import { Routes } from "@/routes/routes";

/** Last-resort error screen for unexpected rendering errors. */
export const RouteError: FC = () => {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? error.statusText : error instanceof Error ? error.message : "Something went wrong";
  return (
    <main className="page max-w-xl pt-16">
      <BrandLogo className="!p-0" />
      <h1 className="mt-8">Something went wrong</h1>
      <p className="muted mt-2">{message}</p>
      <div className="mt-6 flex gap-2">
        <Button onClick={() => window.location.reload()}>Reload the page</Button>
        <Button variant="outline" onClick={() => (window.location.href = Routes.root)}>
          Go home
        </Button>
      </div>
    </main>
  );
};
