import type { FC, ReactNode } from "react";
import { BrandLogo } from "@/components/ui/page-elements";
import { StatusBadge as Badge } from "@/components/ui/status-badge";
import { Routes } from "@/routes/routes";

/** Two-column auth layout from the mockups (form + dark brand panel). */
const AuthLayout: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="auth">
    <main className="auth-form">
      <BrandLogo to={Routes.auth.sign_in} className="!p-0" />
      {children}
    </main>
    <aside className="auth-side" aria-hidden>
      <h2>Stop chasing documents.</h2>
      <p className="quote">Collect, organize and track client documents in one workspace — with reminders that run themselves.</p>
      <div className="mini">
        <div className="row between">
          <span>Tax Clearance Certificate</span>
          <Badge tone="review">Under Review</Badge>
        </div>
        <div className="row between">
          <span>Passport</span>
          <Badge tone="approved">Approved</Badge>
        </div>
        <div className="row between">
          <span>Liability Insurance</span>
          <Badge tone="expiring">Expires in 19 days</Badge>
        </div>
      </div>
    </aside>
  </div>
);

export default AuthLayout;
