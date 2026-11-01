## UI components

This project uses **shadcn/ui** (`src/components/ui/`).

### Dropdowns — shadcn only (never plain HTML)

Every dropdown, select, or menu **must** use the shared shadcn components. **Never** render a plain HTML `<select>` / `<option>` / `<datalist>`, or hand-roll a dropdown from `<div>`/`<ul>` + state.

| Need                                   | Use                                                              |
| -------------------------------------- | ---------------------------------------------------------------- |
| Pick one value (form, filter)          | `@/components/ui/select` (or the `select-dropdown.tsx` wrapper)  |
| Action menu (row actions, kebab, user) | `@/components/ui/dropdown-menu`                                  |
| Searchable / command palette           | `@/components/ui/command`                                        |

Reuse an existing shared component from `src/components/ui/` before creating a new one. If a needed component is missing, add it with the shadcn CLI (`npx shadcn@latest add <component>`) rather than writing a plain HTML alternative.

### Role-based visibility — `RoleGate` only

Whenever UI is conditionally shown based on a user's role, wrap it in `<RoleGate>` (`@/components/access/role-gate`) — or `useRoleAccess()` (`@/hooks/use-role-access`) for non-JSX logic. Never write inline `role === ...` checks. Reusable role sets live in `src/config/constants/access/`. This only controls visibility; the API must still enforce access. Full rules: `.cursor/rules/app-shadcn-code-structure-and-best-practices.mdc`.
