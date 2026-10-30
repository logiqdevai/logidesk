import { useEffect, useRef, useState, type FC } from "react";
import { Copy, ExternalLink, ImageUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/ui/password-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterSelect } from "@/components/ui/filter-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/hooks/use-toast";
import {
  useNotificationSettings,
  useOrganization,
  useUpdateDocumentSettings,
  useUpdateNotificationSettings,
  useUpdateOrganization,
  useUpdatePortalSettings,
  useUploadLogo,
} from "@/features/workspace/hooks/use-workspace-data";
import { useChangePassword, useMe, useResendVerification, useUpdateProfile } from "@/features/auth/hooks/use-auth";
import type { Organization, PortalAccessMode } from "@/features/organizations/interfaces/organizations.interfaces";
import type { AutomationRule, Schedule } from "@/features/notifications/interfaces/notifications.interfaces";
import type { ExpirationPolicy, IntervalUnit, ReminderScheduleInput } from "@/features/forms/interfaces/forms.interfaces";
import type { FileFormat } from "@/features/documents/interfaces/documents.interfaces";
import { TimeZoneOptions } from "@/config/constants/dropdowns/shared/time-zone.options";
import { PortalAccessModeFormOptions } from "@/config/constants/dropdowns/shared/portal-access-mode-form.options";
import { FileFormatFormOptions } from "@/config/constants/dropdowns/documents/file-format-form.options";
import { ExpirationPolicyFormOptions } from "@/config/constants/dropdowns/documents/expiration-policy-form.options";
import { IntervalUnitFormOptions } from "@/config/constants/dropdowns/documents/interval-unit-form.options";
import { environments } from "@/config/environments";
import { Routes } from "@/routes/routes";
import { ScheduleEditor } from "@/pages/shared/components/schedule-editor";

const SectionCard: FC<{ title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }> = ({ title, description, children, footer }) => (
  <section className="card">
    <div className="card-head flex-col !items-start gap-1">
      <h3>{title}</h3>
      {description && <p className="caption">{description}</p>}
    </div>
    <div className="card-body flex flex-col gap-4">{children}</div>
    {footer && <div className="flex justify-end gap-2 border-t border-[var(--g-hairline-soft)] px-5 py-3">{footer}</div>}
  </section>
);

const ToggleRow: FC<{ label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ label, hint, checked, onChange, disabled }) => (
  <label className="flex items-center justify-between gap-4">
    <span>
      <span className="label block">{label}</span>
      {hint && <span className="caption">{hint}</span>}
    </span>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} />
  </label>
);

// ── Profile ───────────────────────────────────────────────────────────────────
export const ProfileSection: FC = () => {
  const me = useMe();
  const update = useUpdateProfile();
  const change = useChangePassword();
  const resend = useResendVerification();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  useEffect(() => {
    if (me.data) {
      setFirst(me.data.user.first_name ?? "");
      setLast(me.data.user.last_name ?? "");
      setPhone(me.data.user.phone ?? "");
    }
  }, [me.data]);
  if (!me.data) return <Skeleton className="h-64" />;
  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Your profile"
        description="Used across every workspace and client portal you belong to."
        footer={
          <Button loading={update.isPending} disabled={!first.trim() || !last.trim()} onClick={() => update.mutate({ first_name: first.trim(), last_name: last.trim(), phone: phone.trim() || undefined })}>
            Save profile
          </Button>
        }
      >
        <div className="form-grid">
          <div className="field">
            <Label htmlFor="pf-first">First name</Label>
            <Input id="pf-first" placeholder="First name" value={first} onChange={(e) => setFirst(e.target.value)} />
          </div>
          <div className="field">
            <Label htmlFor="pf-last">Last name</Label>
            <Input id="pf-last" placeholder="Last name" value={last} onChange={(e) => setLast(e.target.value)} />
          </div>
          <div className="field">
            <Label>Email</Label>
            <div className="flex items-center gap-2">
              <Input value={me.data.user.email} readOnly placeholder="Email address" />
              {me.data.user.email_verified ? <StatusBadge tone="approved">Verified</StatusBadge> : <StatusBadge tone="expiring">Unverified</StatusBadge>}
            </div>
            {!me.data.user.email_verified && (
              <button className="link-btn self-start text-[13px]" onClick={() => resend.mutate()}>
                Resend verification email
              </button>
            )}
          </div>
          <div className="field">
            <Label htmlFor="pf-phone">Phone</Label>
            <Input id="pf-phone" placeholder="e.g. +30 694 555 0187" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
      </SectionCard>
      <SectionCard
        title="Password"
        description="Changing your password signs out your other sessions."
        footer={
          <Button
            variant="outline"
            loading={change.isPending}
            disabled={!current || next.length < 8}
            onClick={() =>
              change.mutate(
                { current_password: current, new_password: next },
                {
                  onSuccess: () => {
                    setCurrent("");
                    setNext("");
                  },
                },
              )
            }
          >
            Change password
          </Button>
        }
      >
        <div className="form-grid">
          <div className="field">
            <Label htmlFor="pw-cur">Current password</Label>
            <PasswordInput id="pw-cur" placeholder="Enter your current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="field">
            <Label htmlFor="pw-new">New password</Label>
            <PasswordInput id="pw-new" placeholder="At least 8 characters" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
            <span className="hint">At least 8 characters.</span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

// ── Organization ──────────────────────────────────────────────────────────────
export const OrganizationSection: FC<{ canManage: boolean }> = ({ canManage }) => {
  const org = useOrganization();
  const update = useUpdateOrganization();
  const logo = useUploadLogo();
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Partial<Organization>>({});
  useEffect(() => {
    if (org.data) setForm(org.data);
  }, [org.data]);
  if (!org.data) return <Skeleton className="h-80" />;
  const set = (patch: Partial<Organization>) => setForm((f) => ({ ...f, ...patch }));
  return (
    <SectionCard
      title="Organization"
      description="How your organization appears to clients."
      footer={
        canManage && (
          <Button
            loading={update.isPending}
            onClick={() =>
              update.mutate({
                name: form.name,
                contact_email: form.contact_email || null,
                contact_phone: form.contact_phone || null,
                address: form.address || null,
                time_zone: form.time_zone,
                default_language: form.default_language,
              })
            }
          >
            Save changes
          </Button>
        )
      }
    >
      <div className="flex items-center gap-4">
        {org.data.logo_url ? (
          <img src={org.data.logo_url} alt="Organization logo" className="h-14 w-14 rounded-lg border object-contain" />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-lg bg-[var(--g-ink)] text-lg font-semibold text-[var(--g-on-dark)]">{org.data.name.slice(0, 2).toUpperCase()}</span>
        )}
        {canManage && (
          <>
            <Button variant="outline" size="sm" loading={logo.isPending} onClick={() => fileInput.current?.click()}>
              <ImageUp />
              Upload logo
            </Button>
            <input ref={fileInput} type="file" accept=".png,.jpg,.jpeg" className="sr-only" onChange={(e) => e.target.files?.[0] && logo.mutate(e.target.files[0])} />
            <span className="caption">PNG or JPG, up to 2 MB</span>
          </>
        )}
      </div>
      <fieldset disabled={!canManage} className="form-grid">
        <div className="field">
          <Label htmlFor="org-name">Organization name</Label>
          <Input id="org-name" placeholder="e.g. Meridian Accounting" value={form.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="field">
          <Label>Time zone</Label>
          <FilterSelect label="Time zone" size="default" className="w-full" value={form.time_zone ?? "UTC"} onChange={(v) => set({ time_zone: v })} options={TimeZoneOptions} disabled={!canManage} />
        </div>
        <div className="field">
          <Label htmlFor="org-email">Contact email</Label>
          <Input id="org-email" placeholder="office@yourcompany.com" type="email" value={form.contact_email ?? ""} onChange={(e) => set({ contact_email: e.target.value })} />
        </div>
        <div className="field">
          <Label htmlFor="org-phone">Contact phone</Label>
          <Input id="org-phone" placeholder="e.g. +30 210 555 0100" value={form.contact_phone ?? ""} onChange={(e) => set({ contact_phone: e.target.value })} />
        </div>
        <div className="field full">
          <Label htmlFor="org-address">Address</Label>
          <Input id="org-address" placeholder="Street, number, city, postal code" value={form.address ?? ""} onChange={(e) => set({ address: e.target.value })} />
        </div>
        <div className="field">
          <Label>Default language</Label>
          <FilterSelect label="Default language" size="default" className="w-full" value={form.default_language ?? "en"} onChange={(v) => set({ default_language: v })} options={[{ id: "en", label: "English" }]} disabled={!canManage} />
        </div>
      </fieldset>
    </SectionCard>
  );
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const NotificationsSection: FC<{ canManage: boolean }> = ({ canManage }) => {
  const settings = useNotificationSettings();
  const update = useUpdateNotificationSettings();
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [auto, setAuto] = useState(true);
  const [quiet, setQuiet] = useState(false);
  const [quietStart, setQuietStart] = useState("20:00");
  const [quietEnd, setQuietEnd] = useState("08:00");
  const [retries, setRetries] = useState(3);
  const [retryMinutes, setRetryMinutes] = useState(60);
  const [schedule, setSchedule] = useState<ReminderScheduleInput>({});
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [timeZone, setTimeZone] = useState("UTC");

  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setSenderName(s.sender_name ?? "");
    setSenderEmail(s.sender_email ?? "");
    setAuto(s.auto_reminders_enabled);
    setQuiet(!!s.quiet_hours_start && !!s.quiet_hours_end);
    setQuietStart(s.quiet_hours_start ?? "20:00");
    setQuietEnd(s.quiet_hours_end ?? "08:00");
    setRetries(s.retry_max_attempts);
    setRetryMinutes(s.retry_interval_minutes);
    const { summary: _summary, ...rest } = s.default_reminder_schedule;
    setSchedule(rest);
    setRules(s.automation_rules);
    setTimeZone(s.time_zone);
  }, [settings.data]);

  if (!settings.data) return <Skeleton className="h-96" />;
  const rule = (trigger: string) => rules.find((r) => r.trigger === trigger);
  const setRule = (trigger: string, patch: Partial<AutomationRule>) => setRules((rs) => rs.map((r) => (r.trigger === trigger ? { ...r, ...patch } : r)));
  const emailProvider = settings.data.providers.find((p) => p.channel === "EMAIL" && p.configured);

  const save = () =>
    update.mutate({
      sender_name: senderName || null,
      sender_email: senderEmail || null,
      auto_reminders_enabled: auto,
      quiet_hours_start: quiet ? quietStart : null,
      quiet_hours_end: quiet ? quietEnd : null,
      retry_max_attempts: retries,
      retry_interval_minutes: retryMinutes,
      time_zone: timeZone,
      default_reminder_schedule: schedule as Omit<Schedule, "summary">,
      automation_rules: rules.map((r) => ({
        id: r.id,
        enabled: r.enabled,
        offsets_days: r.offsets_days,
        repeat_enabled: r.repeat_enabled,
        repeat_interval_count: r.repeat_interval_count ?? undefined,
        repeat_interval_unit: r.repeat_interval_unit ?? undefined,
        max_sends: r.max_sends,
      })),
    });


  return (
    <fieldset disabled={!canManage} className="flex flex-col gap-4">
      <SectionCard title="Email" description="Phase 1 delivers notifications by email. SMS arrives in a later release.">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="approved">Email enabled</StatusBadge>
          <span className="caption">
            Provider: {emailProvider ? emailProvider.name : "not configured"}
            {emailProvider?.name === "outbox" ? " (development outbox — messages are written to the server's .outbox folder)" : ""}
          </span>
        </div>
        <div className="form-grid">
          <div className="field">
            <Label htmlFor="ns-name">Default sender name</Label>
            <Input id="ns-name" placeholder="e.g. Meridian Accounting" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
          </div>
          <div className="field">
            <Label htmlFor="ns-email">Reply-to email</Label>
            <Input id="ns-email" type="email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="office@yourcompany.com" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Automatic reminders" description="The organization default. Forms, documents and assignments can override it.">
        <ToggleRow label="Send automatic reminders" hint="Turn off to only send reminders manually." checked={auto} onChange={setAuto} />
        <div className="field max-w-xs">
          <Label>Time zone</Label>
          <FilterSelect label="Time zone" size="default" className="w-full" value={timeZone} onChange={setTimeZone} options={TimeZoneOptions} disabled={!canManage} />
        </div>
        <div>
          <span className="label">Missing documents — default schedule</span>
          <div className="mt-2">
            <ScheduleEditor value={schedule} onChange={setSchedule} />
          </div>
        </div>
        <div className="divider !my-0" />
        <ToggleRow label="Notify when a form is assigned" checked={rule("FORM_ASSIGNED")?.enabled ?? true} onChange={(v) => setRule("FORM_ASSIGNED", { enabled: v })} />
        <ToggleRow label="Notify when a document is rejected" checked={rule("DOCUMENT_REJECTED")?.enabled ?? true} onChange={(v) => setRule("DOCUMENT_REJECTED", { enabled: v })} />
        <ToggleRow label="Notify when a document is approved" checked={rule("DOCUMENT_APPROVED")?.enabled ?? true} onChange={(v) => setRule("DOCUMENT_APPROVED", { enabled: v })} />
        <ToggleRow label="Missing document reminders" checked={rule("MISSING_DOCUMENTS")?.enabled ?? true} onChange={(v) => setRule("MISSING_DOCUMENTS", { enabled: v })} />
        <div className="divider !my-0" />
        <ToggleRow label="Expiring documents" hint="Notify clients before a document expires." checked={rule("DOCUMENT_EXPIRING")?.enabled ?? true} onChange={(v) => setRule("DOCUMENT_EXPIRING", { enabled: v })} />
        {rule("DOCUMENT_EXPIRING")?.enabled && (
          <div className="field max-w-sm">
            <Label htmlFor="ns-offsets">Days before expiration (comma separated)</Label>
            <Input
              id="ns-offsets"
              placeholder="e.g. 30, 7, 0"
              value={(rule("DOCUMENT_EXPIRING")?.offsets_days ?? []).join(", ")}
              onChange={(e) =>
                setRule("DOCUMENT_EXPIRING", {
                  offsets_days: e.target.value
                    .split(",")
                    .map((x) => parseInt(x.trim(), 10))
                    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 365),
                })
              }
            />
            <span className="hint">For example “30, 7, 0” — 30 days before, 7 days before, and on the day.</span>
          </div>
        )}
        <ToggleRow label="Expired documents" hint="Notify clients when a document expires." checked={rule("DOCUMENT_EXPIRED")?.enabled ?? true} onChange={(v) => setRule("DOCUMENT_EXPIRED", { enabled: v })} />
        {rule("DOCUMENT_EXPIRED")?.enabled && (
          <div className="flex flex-wrap items-end gap-3">
            <ToggleRow label="Keep reminding until replaced" checked={rule("DOCUMENT_EXPIRED")?.repeat_enabled ?? false} onChange={(v) => setRule("DOCUMENT_EXPIRED", { repeat_enabled: v })} />
            {rule("DOCUMENT_EXPIRED")?.repeat_enabled && (
              <>
                <div className="field w-24">
                  <Label htmlFor="ns-rc">Every</Label>
                  <Input id="ns-rc" placeholder="1" type="number" min={1} value={rule("DOCUMENT_EXPIRED")?.repeat_interval_count ?? 1} onChange={(e) => setRule("DOCUMENT_EXPIRED", { repeat_interval_count: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                </div>
                <div className="field w-32">
                  <Label>Unit</Label>
                  <FilterSelect label="Repeat unit" size="default" className="w-full" value={rule("DOCUMENT_EXPIRED")?.repeat_interval_unit ?? "WEEKS"} onChange={(v) => setRule("DOCUMENT_EXPIRED", { repeat_interval_unit: v as IntervalUnit })} options={IntervalUnitFormOptions} disabled={!canManage} />
                </div>
                <div className="field w-28">
                  <Label htmlFor="ns-max">Max</Label>
                  <Input id="ns-max" type="number" min={1} value={rule("DOCUMENT_EXPIRED")?.max_sends ?? ""} placeholder="No limit" onChange={(e) => setRule("DOCUMENT_EXPIRED", { max_sends: e.target.value ? parseInt(e.target.value, 10) : null })} />
                </div>
              </>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Delivery" description="Quiet hours and retry policy for failed sends.">
        <ToggleRow label="Quiet hours" hint="Automatic messages that fall in quiet hours are sent when they end." checked={quiet} onChange={setQuiet} />
        {quiet && (
          <div className="flex gap-3">
            <div className="field">
              <Label htmlFor="ns-qs">From</Label>
              <Input id="ns-qs" type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} />
            </div>
            <div className="field">
              <Label htmlFor="ns-qe">Until</Label>
              <Input id="ns-qe" type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} />
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <div className="field w-40">
            <Label htmlFor="ns-ret">Max attempts</Label>
            <Input id="ns-ret" placeholder="3" type="number" min={1} max={10} value={retries} onChange={(e) => setRetries(Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1)))} />
          </div>
          <div className="field w-48">
            <Label htmlFor="ns-rmin">Minutes between retries</Label>
            <Input id="ns-rmin" placeholder="60" type="number" min={1} max={1440} value={retryMinutes} onChange={(e) => setRetryMinutes(Math.min(1440, Math.max(1, parseInt(e.target.value, 10) || 1)))} />
          </div>
        </div>
        <p className="caption">Retries back off exponentially from this interval.</p>
      </SectionCard>
      {canManage && (
        <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-3 border-t border-[var(--g-hairline)] bg-[var(--g-canvas)] px-1 py-3">
          <span className="caption">Changes apply to future reminders only.</span>
          <Button loading={update.isPending} onClick={save}>
            Save notification settings
          </Button>
        </div>
      )}
    </fieldset>
  );
};

// ── Client portal ─────────────────────────────────────────────────────────────
export const PortalSection: FC<{ canManage: boolean }> = ({ canManage }) => {
  const org = useOrganization();
  const update = useUpdatePortalSettings();
  const [mode, setMode] = useState<PortalAccessMode>("PRIVATE");
  const [welcome, setWelcome] = useState("");
  const [accent, setAccent] = useState("#cc785c");
  const [validity, setValidity] = useState(7);
  const [inviteFirst, setInviteFirst] = useState(true);
  const [verify, setVerify] = useState(true);
  useEffect(() => {
    const p = org.data?.portal_settings;
    if (!p) return;
    setMode(p.access_mode);
    setWelcome(p.welcome_message ?? "");
    setAccent(p.accent_color ?? "#cc785c");
    setValidity(p.invitation_validity_days);
    setInviteFirst(p.invite_on_first_assignment);
    setVerify(p.require_email_verification);
  }, [org.data]);
  if (!org.data) return <Skeleton className="h-96" />;
  const slug = org.data.portal_settings.public_slug;
  const link = slug ? `${environments.APP_URL}${Routes.public_portal.root(slug)}` : null;
  const save = (extra: { regenerate_public_link?: boolean } = {}) =>
    update.mutate({
      access_mode: mode,
      welcome_message: welcome || null,
      accent_color: accent,
      invitation_validity_days: validity,
      invite_on_first_assignment: inviteFirst,
      require_email_verification: verify,
      ...extra,
    });
  return (
    <fieldset disabled={!canManage} className="flex flex-col gap-4">
      <SectionCard
        title="Portal access"
        description="Who can open your client portal. You can change this at any time."
        footer={
          canManage && (
            <Button loading={update.isPending} onClick={() => save()}>
              Save portal settings
            </Button>
          )
        }
      >
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as PortalAccessMode)} className="flex flex-col gap-3">
          {PortalAccessModeFormOptions.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-[var(--g-primary)]">
              <RadioGroupItem value={o.id} className="mt-0.5" />
              <span>
                <span className="label block">{o.label}</span>
                <span className="caption">
                  {o.id === "PRIVATE"
                    ? "Every client activates their own account from an invitation and only sees their own forms and documents."
                    : "Anyone with the link can submit your publicly shared forms without an account. Submissions are unverified and land in the Document Inbox."}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
        {mode === "PUBLIC" && org.data.portal_settings.access_mode === "PUBLIC" && link && (
          <div className="callout items-center">
            <span className="mono grow truncate">{link}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(link);
                toast({ title: "Link copied" });
              }}
            >
              <Copy />
              Copy
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href={link} target="_blank" rel="noreferrer">
                <ExternalLink />
                Open
              </a>
            </Button>
            {canManage && (
              <Button size="sm" variant="ghost" onClick={() => save({ regenerate_public_link: true })}>
                <RefreshCw />
                New link
              </Button>
            )}
          </div>
        )}
        {mode === "PUBLIC" && org.data.portal_settings.access_mode !== "PUBLIC" && <p className="caption">Save to generate your public link. Mark forms as “Share on the public portal” in the form builder.</p>}
        {mode === "PRIVATE" && (
          <>
            <ToggleRow label="Invite clients on their first assignment" hint="Send the portal activation link together with the first form." checked={inviteFirst} onChange={setInviteFirst} />
            <ToggleRow label="Require email verification" hint="Clients must verify their email before opening the portal." checked={verify} onChange={setVerify} />
            <div className="field w-56">
              <Label htmlFor="ps-valid">Invitation link valid for (days)</Label>
              <Input id="ps-valid" placeholder="7" type="number" min={1} max={60} value={validity} onChange={(e) => setValidity(Math.min(60, Math.max(1, parseInt(e.target.value, 10) || 1)))} />
            </div>
          </>
        )}
      </SectionCard>
      <SectionCard
        title="Branding"
        description="Shown to clients in the portal and in emails."
        footer={
          canManage && (
            <Button loading={update.isPending} onClick={() => save()}>
              Save branding
            </Button>
          )
        }
      >
        <div className="field">
          <Label htmlFor="ps-welcome">Welcome message</Label>
          <Textarea id="ps-welcome" rows={3} value={welcome} onChange={(e) => setWelcome(e.target.value)} placeholder="Everything we need from you is on this page." />
        </div>
        <div className="field">
          <Label htmlFor="ps-accent">Accent color</Label>
          <div className="flex items-center gap-2">
            <input id="ps-accent" type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-14 cursor-pointer rounded border" />
            <Input value={accent} onChange={(e) => setAccent(e.target.value)} className="w-32 font-mono" aria-label="Accent color hex" placeholder="#cc785c" />
          </div>
        </div>
      </SectionCard>
    </fieldset>
  );
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const DocumentsSection: FC<{ canManage: boolean }> = ({ canManage }) => {
  const org = useOrganization();
  const update = useUpdateDocumentSettings();
  const [maxMb, setMaxMb] = useState(10);
  const [formats, setFormats] = useState<FileFormat[]>([]);
  const [policy, setPolicy] = useState<ExpirationPolicy>("MANUAL");
  const [days, setDays] = useState<number | null>(null);
  const [approval, setApproval] = useState(true);
  useEffect(() => {
    const d = org.data?.document_settings;
    if (!d) return;
    setMaxMb(d.default_max_upload_mb);
    setFormats(d.accepted_formats);
    setPolicy(d.default_expiration_policy);
    setDays(d.default_expiration_days);
    setApproval(d.require_approval_by_default);
  }, [org.data]);
  if (!org.data) return <Skeleton className="h-80" />;
  return (
    <fieldset disabled={!canManage}>
      <SectionCard
        title="Document settings"
        description="Defaults for new document fields in the form builder."
        footer={
          canManage && (
            <Button
              loading={update.isPending}
              disabled={!formats.length}
              onClick={() => update.mutate({ default_max_upload_mb: maxMb, accepted_formats: formats, default_expiration_policy: policy, default_expiration_days: policy === "FROM_UPLOAD_DATE" ? days : null, require_approval_by_default: approval })}
            >
              Save document settings
            </Button>
          )
        }
      >
        <div className="field w-56">
          <Label htmlFor="ds-max">Default maximum upload size (MB)</Label>
          <Input id="ds-max" placeholder="10" type="number" min={1} max={100} value={maxMb} onChange={(e) => setMaxMb(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)))} />
        </div>
        <div>
          <span className="label">Accepted file formats</span>
          <div className="mt-2 flex flex-wrap gap-4">
            {FileFormatFormOptions.map((o) => (
              <label key={o.id} className="flex items-center gap-2">
                <Checkbox checked={formats.includes(o.id)} onCheckedChange={(c) => setFormats((f) => (c ? [...f, o.id] : f.filter((x) => x !== o.id)))} />
                {o.label}
              </label>
            ))}
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <Label>Default expiration policy</Label>
            <FilterSelect label="Default expiration policy" size="default" className="w-full" value={policy} onChange={(v) => setPolicy(v as ExpirationPolicy)} options={ExpirationPolicyFormOptions.filter((o) => o.id !== "FIXED_DATE")} disabled={!canManage} />
          </div>
          {policy === "FROM_UPLOAD_DATE" && (
            <div className="field">
              <Label htmlFor="ds-days">Days after upload</Label>
              <Input id="ds-days" placeholder="e.g. 365" type="number" min={1} value={days ?? ""} onChange={(e) => setDays(e.target.value ? parseInt(e.target.value, 10) : null)} />
            </div>
          )}
        </div>
        <ToggleRow label="Require employee approval by default" checked={approval} onChange={setApproval} />
      </SectionCard>
    </fieldset>
  );
};
