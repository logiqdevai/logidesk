import { useState, type FC } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo, DetailSkeleton, EmptyState } from "@/components/ui/page-elements";
import { Dropzone, acceptFor } from "@/components/ui/dropzone";
import { usePublicForm, usePublicPortal, useSubmitPublicForm } from "@/features/portal/hooks/use-portal";
import { FileFormatFormOptions } from "@/config/constants/dropdowns/documents/file-format-form.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import type { ApiError } from "@/lib/api-error";
import { Routes } from "@/routes/routes";
import { pluralize } from "@/lib/format";
import { FormRenderer, isFieldVisible, missingRequired } from "@/pages/shared/components/form-renderer";

const PublicShell: FC<{ org?: string; children: React.ReactNode }> = ({ org, children }) => (
  <div className="min-h-screen">
    <header className="portal-nav">
      <BrandLogo className="!p-0" />
      <span className="grow" />
      {org && <span className="org-tag">{org}</span>}
    </header>
    <main className="portal-page">{children}</main>
  </div>
);

/** Public portal home: forms shared publicly by the organization (no account needed). */
export const PublicPortalPage: FC = () => {
  const { slug } = useParams();
  const portal = usePublicPortal(slug);
  if (portal.isPending) return <PublicShell><DetailSkeleton /></PublicShell>;
  if (portal.isError || !portal.data) {
    return (
      <PublicShell>
        <div className="card">
          <EmptyState title="This portal link is not available" description="Ask the organization for an up-to-date link." />
        </div>
      </PublicShell>
    );
  }
  const p = portal.data;
  return (
    <PublicShell org={p.organization.name}>
      <div className="portal-hero">
        <p className="eyebrow">{p.organization.name}</p>
        <h1 className="mt-2">Submit your documents</h1>
        <p className="muted mt-2 text-[16px]">{p.welcome_message || "Choose a form below. No account is needed."}</p>
      </div>
      <div className="gr c2 mt-6">
        {p.forms.length === 0 ? (
          <div className="card col-span-2">
            <EmptyState icon={<FileText className="h-5 w-5" />} title="No forms are shared yet" />
          </div>
        ) : (
          p.forms.map((f) => (
            <Link key={f.id} to={Routes.public_portal.form(slug!, f.id)} className="card cream pad clickable flex flex-col gap-2" style={{ color: "inherit" }}>
              <h3>{f.title}</h3>
              {f.description && <p className="muted">{f.description}</p>}
              <span className="caption">
                {pluralize(f.field_count - f.document_count, "question")} · {pluralize(f.document_count, "document")}
              </span>
            </Link>
          ))
        )}
      </div>
    </PublicShell>
  );
};

export const PublicFormPage: FC = () => {
  const { slug, formId } = useParams();
  const form = usePublicForm(slug, formId);
  const submit = useSubmitPublicForm();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (form.isPending) return <PublicShell><DetailSkeleton /></PublicShell>;
  if (form.isError || !form.data) {
    return (
      <PublicShell>
        <div className="card">
          <EmptyState title="This form is not available" />
        </div>
      </PublicShell>
    );
  }
  const f = form.data;
  const reqs = new Map(f.requirements.map((r) => [r.field_key, r]));

  if (submit.isSuccess) {
    return (
      <PublicShell org={f.organization_name}>
        <div className="card">
          <EmptyState
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Thank you — your submission was received"
            description={`Reference ${submit.data.reference}. ${f.organization_name} will review your documents.`}
            action={
              <Button variant="outline" asChild>
                <Link to={Routes.public_portal.root(slug!)}>Back to forms</Link>
              </Button>
            }
          />
        </div>
      </PublicShell>
    );
  }

  const onSubmit = () => {
    const errs: Record<string, string> = { ...missingRequired(f.definition, answers) };
    if (!name.trim()) errs.submitter_name = "Enter your name";
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.submitter_email = "Enter a valid email address";
    for (const field of f.definition.sections.flatMap((s) => s.fields)) {
      const r = reqs.get(field.id);
      if (r?.is_required && isFieldVisible(field, answers, f.definition) && !(files[field.id]?.length)) errs[field.id] = `Upload ${r.name}`;
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const data = new FormData();
    data.append("submitter_name", name);
    data.append("submitter_email", email);
    if (company) data.append("submitter_company", company);
    data.append("answers", JSON.stringify(answers));
    for (const [key, list] of Object.entries(files)) list.forEach((file) => data.append(`file_${key}`, file));
    submit.mutate({ slug: slug!, formId: formId!, data }, { onError: (e) => setErrors((e as ApiError).fieldErrors ?? {}) });
  };

  return (
    <PublicShell org={f.organization_name}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to={Routes.public_portal.root(slug!)}>Forms</Link>
        <span>›</span>
        <span>{f.title}</span>
      </nav>
      <h1>{f.title}</h1>
      {f.description && <p className="muted mt-2">{f.description}</p>}
      {f.instructions && <p className="mt-2 whitespace-pre-line">{f.instructions}</p>}

      <section className="card pad mt-6">
        <h3 className="mb-4">Your details</h3>
        <div className="form-grid">
          <div className="field">
            <Label htmlFor="pub-name">Full name</Label>
            <Input id="pub-name" placeholder="e.g. Alex Morgan" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.submitter_name} />
            {errors.submitter_name && <span className="text-[12.5px] text-[var(--g-error-ink)]">{errors.submitter_name}</span>}
          </div>
          <div className="field">
            <Label htmlFor="pub-email">Email</Label>
            <Input id="pub-email" placeholder="you@company.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.submitter_email} />
            {errors.submitter_email && <span className="text-[12.5px] text-[var(--g-error-ink)]">{errors.submitter_email}</span>}
          </div>
          <div className="field">
            <Label htmlFor="pub-company">
              Company <span className="soft">(optional)</span>
            </Label>
            <Input id="pub-company" placeholder="Your company name" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
        </div>
      </section>

      <div className="mt-4">
        <FormRenderer
          definition={f.definition}
          answers={answers}
          errors={errors}
          onChange={(k, v) => setAnswers((a) => ({ ...a, [k]: v }))}
          renderFile={(field) => {
            const r = reqs.get(field.id);
            if (!r) return null;
            return (
              <div className="field border-b px-5 py-4">
                <Label>
                  {r.name}
                  {r.is_required && <span className="text-[var(--g-error)]">*</span>}
                </Label>
                {r.description && <span className="hint">{r.description}</span>}
                <Dropzone
                  compact
                  files={files[field.id] ?? []}
                  onChange={(list) => setFiles((x) => ({ ...x, [field.id]: list }))}
                  maxFiles={r.max_files}
                  accept={acceptFor(r.accepted_formats)}
                  hint={`${r.accepted_formats.map((x) => getDropdownOptionLabel(FileFormatFormOptions, x)).join(", ")} · up to ${r.max_file_size_mb} MB`}
                />
                {errors[field.id] && <span className="text-[12.5px] text-[var(--g-error-ink)]">{errors[field.id]}</span>}
              </div>
            );
          }}
        />
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="caption">Your submission is reviewed by {f.organization_name} before it is added to your file.</span>
        <Button loading={submit.isPending} onClick={onSubmit}>
          Submit
        </Button>
      </div>
    </PublicShell>
  );
};

