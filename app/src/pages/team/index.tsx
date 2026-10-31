import { useState, type FC } from "react";
import { MoreHorizontal, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { InitialsAvatar, PageHeader, TableSkeleton } from "@/components/ui/page-elements";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterSelect } from "@/components/ui/filter-select";
import { useChangeRole, useInviteMember, useRemoveMember, useResendInvitation, useRevokeInvitation, useTeam } from "@/features/workspace/hooks/use-workspace-data";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions, type OrganizationRole } from "@/features/auth/interfaces/auth.interfaces";
import type { TeamMember } from "@/features/team/interfaces/team.interfaces";
import { OrganizationRoleFormOptions, getOrganizationRoleLabel } from "@/config/constants/dropdowns/users/organization-role-form.options";
import { formatDate, formatRelative } from "@/lib/format";
import { OrganizationRoleDescriptionOptions } from "@/config/constants/dropdowns/users/organization-role-description.options";


const TeamPage: FC = () => {
  const { t } = useTranslation("team");
  const team = useTeam();
  const { can } = useWorkspace();
  const invite = useInviteMember();
  const resend = useResendInvitation();
  const revoke = useRevokeInvitation();
  const changeRole = useChangeRole();
  const remove = useRemoveMember();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationRole>("MEMBER");
  const [message, setMessage] = useState("");
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [revoking, setRevoking] = useState<{ id: string; email: string } | null>(null);
  const manage = can(Permissions.TEAM_MANAGE);
  const grantOwner = can(Permissions.TEAM_GRANT_OWNER);
  const roleOptions = OrganizationRoleFormOptions.filter((o) => grantOwner || o.id !== "OWNER");
  const data = team.data;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          manage && (
            <Button
              onClick={() => {
                setEmail("");
                setRole("MEMBER");
                setMessage("");
                setInviteOpen(true);
              }}
            >
              <UserPlus />
              {t("inviteButton")}
            </Button>
          )
        }
      />
      <section className="card">
        {team.isPending ? (
          <TableSkeleton rows={4} />
        ) : (
          <div className="table-wrap">
            <Table className="table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.member")}</TableHead>
                  <TableHead>{t("columns.role")}</TableHead>
                  <TableHead>{t("columns.clients")}</TableHead>
                  <TableHead>{t("columns.lastActive")}</TableHead>
                  <TableHead>{t("columns.joined")}</TableHead>
                  <TableHead className="actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.members.map((m) => {
                  const lastOwner = m.role === "OWNER" && (data?.owner_count ?? 0) <= 1;
                  const canEditRole = manage && (grantOwner || m.role !== "OWNER");
                  return (
                    <TableRow key={m.member_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <InitialsAvatar name={m.name} />
                          <div>
                            <div className="cell-main">
                              {m.name}
                              {m.is_you && <span className="muted font-normal"> ({t("you")})</span>}
                            </div>
                            <div className="cell-sub">{m.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {canEditRole && !lastOwner ? (
                          <FilterSelect label={t("roleOf", { name: m.name })} value={m.role} onChange={(v) => changeRole.mutate({ memberId: m.member_id, role: v as OrganizationRole })} options={roleOptions.some((o) => o.id === m.role) ? roleOptions : OrganizationRoleFormOptions} className="min-w-[120px]" />
                        ) : (
                          <StatusBadge tone={m.role === "OWNER" ? "coral" : "plain"} title={lastOwner ? t("lastOwnerCannotDemote") : undefined}>
                            {getOrganizationRoleLabel(m.role)}
                          </StatusBadge>
                        )}
                      </TableCell>
                      <TableCell>{m.client_count}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatRelative(m.last_active_at)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(m.joined_at)}</TableCell>
                      <TableCell className="actions">
                        {manage && !m.is_you && !lastOwner && (grantOwner || m.role !== "OWNER") && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" aria-label={t("actionsFor", { name: m.name })}>
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{m.name}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-[var(--g-error-ink)]" onSelect={() => setRemoving(m)}>
                                {t("removeFromWorkspace")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {data?.invitations.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <InitialsAvatar name={i.email} />
                        <div>
                          <div className="cell-main">{i.email}</div>
                          <div className="cell-sub">
                            {i.invited_by ? t("invitedBy", { when: formatRelative(i.last_sent_at), by: i.invited_by }) : t("invitedWhen", { when: formatRelative(i.last_sent_at) })}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone="plain">{getOrganizationRoleLabel(i.role)}</StatusBadge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={i.expired ? "notreq" : "invited"}>{i.expired ? t("invitationExpired") : t("invited")}</StatusBadge>
                    </TableCell>
                    <TableCell className="caption">{t("expires", { date: formatDate(i.expires_at) })}</TableCell>
                    <TableCell />
                    <TableCell className="actions">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" loading={resend.isPending && resend.variables === i.id} onClick={() => resend.mutate(i.id)}>
                          {t("resend")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRevoking({ id: i.id, email: i.email })}>
                          {t("revoke")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="gr c3 mt-5">
        {OrganizationRoleFormOptions.map((r) => (
          <div key={r.id} className="card pad">
            <h3>{r.label}</h3>
            <p className="muted mt-1">{OrganizationRoleDescriptionOptions[r.id]}</p>
          </div>
        ))}
      </section>

      <Dialog open={inviteOpen} onOpenChange={(o) => !invite.isPending && setInviteOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="display text-[26px] font-medium">{t("dialog.title")}</DialogTitle>
            <DialogDescription>{t("dialog.description")}</DialogDescription>
          </DialogHeader>
          <form
            id="invite-form"
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate({ email, role, message: message || undefined }, { onSuccess: () => setInviteOpen(false) });
            }}
          >
            <div className="field">
              <Label htmlFor="inv-email">{t("dialog.email")}</Label>
              <Input id="inv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("dialog.emailPlaceholder")} />
            </div>
            <div className="field">
              <Label>{t("dialog.role")}</Label>
              <FilterSelect label={t("dialog.role")} size="default" className="w-full" value={role} onChange={(v) => setRole(v as OrganizationRole)} options={roleOptions} />
              <span className="hint">{OrganizationRoleDescriptionOptions[role]}</span>
            </div>
            <div className="field">
              <Label htmlFor="inv-msg">
                {t("dialog.message")} <span className="soft">({t("dialog.optional")})</span>
              </Label>
              <Textarea id="inv-msg" placeholder={t("dialog.messagePlaceholder")} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={invite.isPending}>
              {t("dialog.cancel")}
            </Button>
            <Button type="submit" form="invite-form" loading={invite.isPending} disabled={!/^\S+@\S+\.\S+$/.test(email)}>
              {t("dialog.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmationDialog
        isOpen={!!removing}
        onClose={() => setRemoving(null)}
        variant="destructive"
        title={t("removeConfirm.title", { name: removing?.name })}
        description={t("removeConfirm.description")}
        confirmText={t("removeConfirm.confirm")}
        isLoading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.member_id, { onSuccess: () => setRemoving(null) })}
      />
      <ConfirmationDialog
        isOpen={!!revoking}
        onClose={() => setRevoking(null)}
        variant="destructive"
        title={t("revokeConfirm.title")}
        description={t("revokeConfirm.description", { email: revoking?.email })}
        confirmText={t("revokeConfirm.confirm")}
        isLoading={revoke.isPending}
        onConfirm={() => revoking && revoke.mutate(revoking.id, { onSuccess: () => setRevoking(null) })}
      />
    </>
  );
};

export default TeamPage;
