# Build a Multi-Tenant Document Management & Client Portal SaaS (MVP)

## 1. Project Overview

Build a modern, multi-tenant SaaS application that helps businesses collect, organize, manage, track, and process documents from their clients.

The application should eliminate the need for businesses to manually chase clients for missing documents, organize documents across email inboxes, and maintain spreadsheets to track document expiration dates.

Each organization should have its own workspace, employees, clients, document forms, notification settings, and email integrations.

The platform should provide two main interfaces:

1. **Business Dashboard:** Where business owners and employees manage clients, create document forms, track document collection, upload documents, send reminders, and configure automation.
2. **Client Portal:** Where clients can access their assigned forms, upload requested documents, complete form fields, and track the status of their submissions.

The MVP must deliver a functional end-to-end experience, not simply a UI prototype.

Prioritize reliability, usability, clean architecture, data isolation, and a well-designed user experience.

---

# 2. Core Application Architecture

Build the application using a modular architecture with clearly separated domains.

The main modules should be:

- Authentication & Authorization
- Organizations & Team Management
- Client Management
- Document Form Builder
- Document Management
- Document Inbox
- Document Assignment & Tracking
- Client Portal
- Notifications & Reminders
- Email Integrations
- Automatic Email Document Processing
- Application Settings
- Activity & Audit Logs

Each module should have its own responsibilities and should not be tightly coupled to unrelated modules.

The architecture must support adding new functionality later without requiring significant restructuring.

## Multi-Tenancy

The application must support multiple independent organizations.

Each organization should have:

- Its own employees and permissions.
- Its own clients.
- Its own document forms and templates.
- Its own document records and uploaded files.
- Its own notification configuration.
- Its own email integrations.
- Its own automation rules.
- Its own activity logs.

All organization-owned records must be associated with an organization ID.

**Data isolation is mandatory.** Users must never be able to access another organization's information by manipulating URLs, API requests, identifiers, or other client-side parameters.

Implement tenant isolation at the backend/database authorization level, not just through frontend filtering.

---

# 3. Authentication & Organization Management

Implement authentication with:

- Email and password registration.
- Login and logout.
- Password recovery.
- Email verification.
- Session management.
- Organization (workspace) creation.
- Organization invitation system.

**Single sign-in / create-account page.** There is exactly one authentication page for everyone: team members, workspace owners and clients. It offers "Sign in" and "Create account" modes (account creation collects first name, last name, email and password). There are no separate team and client login or registration pages; invitation links (team or client) land on the same page with the invitation context shown.

**Multiple workspaces per user.** A user account can belong to any number of organizations (workspaces), with an independent role in each, and can create their own new workspace at any time (becoming its Owner). After signing in, the user chooses a workspace, creates a new one, or opens a client portal they were invited to; they can switch workspaces at any time from the sidebar. The same account can also be a client of other organizations; client portals are listed separately from the workspaces the user works in, and data never crosses between them.

## Organization Roles

Implement three predefined roles. A workspace may have **more than one Owner**; an Owner can promote any member to Owner or change any role, and the last remaining Owner cannot be demoted or removed. Only Owners can grant the Owner role.

| Role | Permissions |
|---|---|
| Owner | Full organization access, billing-ready settings, integrations, team management (including granting Owner), and all data. Multiple Owners are allowed |
| Admin | Manage clients, forms, documents, employees (except ownership), settings, and notifications |
| Member | Manage assigned clients, view and edit all of their forms' data (answers and documents), upload documents, complete forms on behalf of clients, and send reminders |

Implement centralized permission checks on the backend.

Do not rely on hiding frontend buttons as an authorization mechanism.

The permission system should be extensible to support custom roles and granular permissions in the future.

---

# 4. Business Dashboard

Create a professional dashboard that gives employees an immediate overview of their document collection operations.

## Dashboard Overview

Display useful statistics:

- Total clients.
- Total assigned document forms.
- Documents awaiting submission.
- Documents received and awaiting review.
- Approved documents.
- Rejected documents.
- Expired documents.
- Documents expiring soon.
- Overdue client submissions.
- Document Inbox items needing review.

Include a visual overview of document collection progress.

For example:

- 120 requested documents.
- 85 completed.
- 20 missing.
- 10 awaiting review.
- 5 expired.

These statistics must come from actual database records.

## Recent Activity

Display recent events:

- New client added.
- Document uploaded.
- Document approved or rejected.
- New form assigned.
- Reminder sent.
- Document expired.
- Email attachment automatically processed.

## Quick Actions

Provide shortcuts for:

- Add client.
- Create document form.
- Assign a form.
- Upload a document.
- Send reminders.

The dashboard should be useful without requiring users to navigate through multiple pages.

---

# 5. Client Management

Create a comprehensive client management module.

## Client Records

Each client should have:

- First name (required).
- Last name (required).
- Company (optional, separate field).
- Email address.
- Phone number.
- Optional company information / notes.
- Tax identification number (optional).
- Address (optional).
- Internal notes.
- Assigned employees: one or more employees can be assigned to the same client, and an employee can be assigned to many clients.
- Creation date.
- Client portal access status.

Allow employees to create, edit, archive, search, and filter clients.

Do not require every optional field during client creation. There is no Individual/Business client type: a client is a person with an optional company. Client lists display the full name with the company underneath, can be searched by first name, last name or company, and can be filtered by assigned employee.

## Client Details Page

Each client should have a dedicated page with the following sections:

### Overview
- General client information.
- Overall document collection progress.
- Missing documents.
- Expired documents.
- Documents expiring soon.
- Recently submitted documents.
- Assigned employees.

### Assigned Forms
Display every form assigned to the client, including:

- Form name.
- Assignment date.
- Submission deadline.
- Completion percentage.
- Number of missing documents.
- Number of expired documents.
- Current status.
- A "View form" action that opens the full client form (see below).

### Client Form View

Each form assigned to a client has a dedicated page showing **everything the client submitted for that form**, not only the documents:

- Every field answer, grouped by the form's sections and laid out like the form itself (text, numbers, dates, dropdown, yes/no, checkbox and long-text answers). Fields hidden by conditional visibility are not shown.
- Every document requirement with its status, current file, uploader, upload date and expiration date, with preview, download, approve, reject, replace, and upload-on-behalf actions.
- Overall completion for that assignment and the form's current status.
- A "Recent changes" audit trail of edits to answers and documents.

The page opens read-only. Any team member with access to the client (assigned employees, Admins and Owners) can switch to **Edit** mode and change any answer or document on the client's behalf; saving records who changed what and when in the audit log, and the client sees the updated values in their portal. Edits never create a new form version and are validated against the form version the assignment is pinned to. The page is reachable from the client's Assigned Forms tab and from the form's Submissions page (View full form / Edit answers).

### Documents
A centralized list of all documents associated with the client.

Allow filtering by:

- Document type.
- Form.
- Status.
- Expiration date.
- Upload date.

### Activity
A chronological timeline of interactions and changes.

### Notes
Internal notes visible only to organization employees.

---

# 6. Custom Document Form Builder

This is one of the application's most important features.

Businesses must be able to create fully customizable document collection forms, similar to Google Forms.

The form builder should be flexible enough to support different business types and document collection workflows.

## Form Builder Interface

Implement a visual form builder with:

- Form title.
- Description and instructions.
- Sections.
- Drag-and-drop field ordering.
- Field editing.
- Required/optional configuration.
- Field deletion.
- Preview mode.

Users should be able to save forms as reusable templates.

## Supported Field Types

Implement the following field types:

| Field | Description |
|---|---|
| Short Text | Single-line text |
| Long Text | Multiline text |
| Number | Numeric input |
| Email | Email address with validation |
| Phone | Phone number |
| Date | Date selection |
| Dropdown | Single selection |
| Multiple Choice | Radio selection |
| Checkboxes | Multiple selections |
| File Upload | Document or image upload |
| Yes/No | Boolean response |
| Heading | Section heading |
| Description | Informational text |
| Divider | Visual section separator |

Each field should support:

- Custom label.
- Description/help text.
- Required/optional setting.
- Default value (for field types that hold a value).
- Validation rules.
- Conditional visibility: show or hide a field based on the answer to another field in the same form.

Store form definitions as structured JSON schemas, with validation performed on the backend.

## Document-Specific Configuration

File upload fields must have additional configuration options:

- Accepted file formats (PDF, Image, Word, Excel).
- Maximum file size.
- Maximum number of files.
- Required/optional.
- Document expiration date configuration.
- Whether multiple submissions are allowed.
- Whether employee approval is required.
- Reminder schedule for this document (see "Reminder Schedules" in Section 10): when to start reminding before the deadline and how often to repeat.

### Form-Level Settings

Each form also has form-level settings:

- Default reminder schedule for all documents in the form (see Section 10).
- Default expiration policy (see below).

### Expiration Dates

Expiration must be supported at two levels:

1. **Form-level configuration:** Define a default expiration policy for documents collected through a form.
2. **Individual document level:** Set or edit the expiration date of a specific uploaded document.

Support:

- Fixed expiration dates.
- Expiration dates calculated from the document submission date.
- Expiration dates manually entered by an employee.
- Expiration dates extracted from uploaded documents, subject to verification.

An expiration date must belong to the individual document record, not simply to the form.

## Form Management

Businesses should be able to:

- Create forms.
- Edit forms.
- Duplicate forms.
- Archive forms.
- Preview forms.
- Reuse existing templates.
- View all submissions of a form (see below).

### Form Submissions Page

Each form has a dedicated subpage listing every client the form was assigned to, reachable from the form card, the form builder and the assignment count. It shows:

- Summary counts: assigned clients, complete, under review, overdue.
- One row per client: client name and company, assigned employees, assignment date, last submission date, deadline, documents completed out of total, and status (Not started, In progress, Under review, Complete, Overdue).
- Filters: free-text search, client, status, assigned employee and submission time range (including "not submitted yet").
- Row actions: view the client's full form, edit their answers, open the client, send a reminder, review in the Document Inbox. Clicking a row opens the full client form.
- CSV export of the filtered list.

Implement form versioning so that editing a form does not unexpectedly change existing client assignments or invalidate previously submitted data.

Versioning rules:

- Every published form version is immutable.
- Editing a published form creates a new version; the previous version is retained.
- Each assignment is pinned to the form version it was created with, and its document requirements and responses are validated against that version.
- Existing assignments are never migrated to a new version automatically. Reassigning a client to a newer version is done by creating a new assignment.
- Versioning is implemented in the database and the API only. The UI does not expose versions: no version history, version picker, version labels, or assignment counts per version. Saving an edited form in the builder calls the API, which creates the new version behind the scenes; the UI always shows and edits the latest version, and a newly assigned form always uses the latest version.
- Client portal and employee views of an existing assignment render the version that assignment is pinned to, without displaying the version number.

---

# 7. Document Assignment & Tracking

Employees must be able to assign one or more forms to individual clients.

## Assignment Workflow

1. Employee selects a client.
2. Employee selects one or more existing forms.
3. Employee configures assignment-specific options.
4. Employee optionally sets a submission deadline for the assignment, and optionally a different deadline for individual document requirements.
5. Employee optionally overrides the reminder schedule for the assignment or for individual document requirements.
6. The system creates the assignment.
7. The client receives an invitation or notification.
8. The assigned forms appear in the client's portal.

Each assignment should have:

- Client ID.
- Form ID.
- Form version.
- Assignment date.
- Submission deadline.
- Optional per-requirement deadlines (a requirement without its own deadline uses the assignment deadline).
- Optional reminder schedule overrides, for the whole assignment or per requirement.
- Assigned employee.
- Status.
- Completion progress.

## Document Statuses

Implement a clear document lifecycle.

Statuses:

- Missing: Document has not been submitted.
- Submitted: Document has been uploaded.
- Under Review: Awaiting employee approval.
- Approved: Accepted by the business.
- Rejected: Requires a new submission.
- Expired: Document is past its expiration date.
- Not Required: No longer required for this assignment.

The system should automatically identify expired documents based on their expiration dates.

Do not permanently overwrite the historical status of a document. Maintain its lifecycle and calculate its current effective status using its dates and review state.

## Document Requirements vs. Uploaded Documents

Keep these two concepts strictly separate in the data model and the application logic:

- **Document requirement:** What is expected. It is defined by a form version, belongs to an assignment, and persists for the life of that assignment.
- **Uploaded document:** What was actually received. It is a file with its own metadata, source, expiration date, and review state.

A requirement can have multiple submissions over time (initial submission, rejected attempts, replacements, renewals after expiration). A requirement's current state is derived from its latest relevant submission and that submission's dates and review state. Replacing a document adds a new submission and preserves the earlier ones; it never overwrites them.

## Assignment Progress

Calculate completion progress automatically.

Example:

A client has an assigned form requiring five documents.

- 3 approved.
- 1 missing.
- 1 expired.

The assignment should clearly indicate that two documents require attention.

Allow employees to see missing and problematic documents without opening every individual client record.

---

# 8. Document Management & Uploads

Implement a centralized document management system.

Employees should be able to:

- Upload documents manually.
- Upload multiple files.
- Attach documents to a specific client.
- Attach documents to a specific form assignment.
- Select the corresponding document requirement.
- Edit document metadata.
- Set expiration dates.
- Replace existing documents.
- Download documents.
- Preview supported file formats.
- Approve or reject submissions.

Supported initial file formats are presented to users as four simple groups:

- **PDF.**
- **Image** (JPG, JPEG and PNG are one "Image" option; users never pick individual image extensions).
- **Word** (DOCX).
- **Excel** (XLSX).

Form-level and organization-level "Accepted file formats" settings use these groups.

Validate file extensions, actual file types, file sizes, and upload permissions.

Store files in private object storage, not publicly accessible directories.

Use short-lived signed URLs for authorized downloads and previews.

## Document Metadata

Each uploaded document should contain:

- Original filename.
- Storage reference.
- MIME type.
- File size.
- Client ID.
- Organization ID.
- Form assignment ID.
- Document requirement ID.
- Upload source.
- Upload date.
- Expiration date.
- Review status.
- Uploaded by.
- Reviewer.
- Review date.

Upload sources should distinguish:

- Employee upload.
- Client portal upload.
- Automatic email processing.

## Employee Upload on Behalf of Clients

Employees must be able to upload documents and complete form inputs on behalf of clients.

The employee should be able to choose a client, select an assigned form, and complete its fields without requiring the client to log in.

Maintain an audit trail identifying the employee who performed the action.

## File Space

A dedicated **File Space** page (sidebar, under Workspace) lets every employee browse all files the organization stores, as a folder view:

- Folder hierarchy: Client > Form > files. Breadcrumbs allow navigating up.
- Folders show item count, total size and last modified date; files show name, document type, status, size and upload date.
- Search within the current folder and filter by file type (PDF, Image, Word, Excel).
- Storage summary: storage used versus the plan allowance, file count, and breakdown by type.
- Actions: preview and download a file (short-lived signed URL), download a folder as a .zip.
- Employees only see the files of clients they are permitted to access; Owners and Admins see everything.

## Centralized Document Inbox

Provide a single, unified inbox for incoming documents, regardless of where they originated. Employees should be able to review everything that needs attention in one place, without navigating between clients, email integrations, and form assignments.

Every incoming document must appear in the inbox, whether it arrived by:

- Email (automatic email processing).
- Client portal upload.
- Employee upload.

Each inbox item must display:

- **Client identification:** The identified client, or "Unidentified" when no client could be determined.
- **Document type:** The detected or selected document type.
- **Source:** Email, Client Portal, or Employee Upload (with a reference to the original email where applicable).
- **Suggested form assignment:** The suggested assignment and document requirement it would satisfy.
- **Matching confidence:** High, Medium, or Low, with the underlying score and the signals that produced it.
- **Processing status:** One of Received, Processing, Matched, Needs Review, Unmatched, Failed, Duplicate, Resolved.
- **Review action:** For uncertain matches: confirm the suggested match, change the client/assignment/requirement, or dismiss. For documents that require employee approval: approve or reject.

Requirements:

- Filter and sort by source, status, confidence, client, document type, and date.
- Provide a preview of the document alongside the match details so employees can verify it without leaving the inbox.
- Employee uploads and client portal uploads always arrive with the client and requirement known, so they appear with High confidence and status Matched. They need review only when the requirement requires employee approval, in which case the review action is approve or reject.
- Items awaiting review (Medium confidence, Low confidence, Failed, and uploads requiring approval) must be clearly separated from items that were processed automatically.
- Resolving an item must create or update the document record, link it to the chosen requirement, update the assignment status, and write an audit log entry identifying the reviewing employee.
- Members only see inbox items for clients they are assigned to; Owners and Admins see all items in the organization, including items with an unidentified client.
- Display a count of items needing review in the main navigation and on the dashboard.
- The inbox is the primary review surface for uncertain email matches and replaces the need for a separate unassigned documents queue. The Email Processing area (see Section 11) remains responsible for integration status and processing history.

The inbox is part of the MVP. In Phase 1 it receives employee uploads and client portal uploads awaiting review; email-sourced items are added when email processing is delivered in Phase 2, using the same model.

---

# 9. Client Portal

Every client should have a dedicated, secure portal.

The portal must be simple enough for non-technical users.

## Client Portal Access Mode

Each organization chooses, in Settings > Client Portal, who can open its portal:

- **Clients sign in themselves (default):** every client activates their own account from an invitation and only sees their own forms and documents. Email verification can be required.
- **Public portal for everyone:** anyone with the organization's public portal link can open the portal without an account and submit the forms that are shared publicly. A copyable link is shown. Public submissions are marked unverified and land in the Document Inbox for employee review; invitation and email-verification settings do not apply.

The mode can be changed at any time; it never exposes client records through predictable URLs.

## Client Authentication

Support:

- Secure invitation links.
- Email verification.
- Password-based access.
- Password recovery.

Clients use the same single sign-in / create-account page as employees. The initial invitation flow should allow a client to activate their portal without an employee manually creating their password.

Do not expose client records through predictable public URLs.

## Client Portal Dashboard

Display:

- Welcome message.
- Client information.
- Overall document collection progress.
- Assigned forms.
- Missing documents.
- Documents awaiting review.
- Rejected documents.
- Expired documents.
- Documents expiring soon.

## Assigned Form Page

When a client opens an assigned form, display all its sections and required inputs.

For each document requirement, show:

- Document name.
- Description.
- Instructions.
- Required/optional indicator.
- Current status.
- Expiration date, if applicable.
- Upload button.
- Existing uploaded file, if available.

Clients should be able to:

- Complete text fields.
- Select predefined options.
- Upload documents.
- Replace rejected documents.
- Save incomplete forms as drafts.
- Submit completed forms.

Allow clients to upload documents individually without requiring the entire form to be completed first.

## Client Overview

Provide a centralized page where clients can see their information and all assigned forms.

Make the next required action obvious.

For example:

"Your identification document is missing."

"Your insurance certificate expires on 15/11/2026."

"Your submitted tax document is awaiting approval."

---

# 10. Notification & Reminder System

Build a notification engine that supports multiple communication channels.

The supported channels are:

- Email (Phase 1).
- SMS (Phase 2).

In Phase 1 the application exposes only the Email channel in the UI and settings. The notification architecture is built from the start for multiple channels, so adding SMS in Phase 2 requires only a new provider. SMS-related settings (SMS provider, default SMS sender) are added in Phase 2.

The architecture must allow future integrations with WhatsApp, push notifications, and other messaging providers.

## Notification Architecture

Use a provider-independent notification service.

Avoid implementing notification logic directly inside client, document, or form modules.

Create a common notification interface that different providers can implement.

For example:

- Email Provider.
- SMS Provider.
- Future WhatsApp Provider.

Each provider should handle its own authentication, delivery, error handling, and provider-specific functionality.

## Manual Reminders

Employees should be able to send reminders directly from:

- Dashboard.
- Client details page.
- Assigned form page.
- Missing documents list.

Before sending, display:

- Recipient.
- Missing or expired documents.
- Message preview.
- Selected communication channel.

Allow employees to customize the message before sending.

## Automatic Reminders

Implement configurable automation rules.

Examples:

**Missing Documents**
- Send an initial reminder when a form is assigned.
- Send another reminder after a configurable number of days.
- Repeat reminders at configurable intervals.
- Stop reminders when all required documents are approved.

**Expiring Documents**
- Notify clients 30 days before expiration.
- Send another reminder 7 days before expiration.
- Notify clients on the expiration date.

**Expired Documents**
- Notify clients when a required document expires.
- Continue reminders until a replacement is submitted and approved.

All intervals must be configurable.

Do not hardcode these examples as mandatory behavior.

## Reminder Schedules

Reminders for missing documents are driven by a reminder schedule that is configurable at several levels. A reminder schedule contains:

- **Enabled:** Whether automatic reminders are on.
- **Start:** How many days before the deadline reminders begin (0 means start on the deadline day). Reminders also begin immediately at assignment when the deadline is closer than this number of days.
- **Frequency:** How often to repeat, as an interval and a unit: every N days or every N weeks (for example daily is every 1 day, weekly is every 1 week, every 3 days is every 3 days).
- **Send time:** The time of day to send, in the organization's time zone.
- **After the deadline:** Whether to keep sending overdue reminders, and at what frequency (same options as above), with an optional maximum number of overdue reminders.

Levels, from lowest to highest precedence:

1. Organization default (Notification Settings).
2. Form-level default (form settings).
3. Document-level schedule (File Upload field configuration).
4. Assignment-level override, for the whole assignment or for individual requirements.

The most specific level that is configured applies; unset values fall through to the next level. Form-level and document-level schedules are part of the form version, so they follow the versioning rules in Section 6. Assignment-level overrides belong to the assignment.

The deadline used for a requirement is its own deadline if set, otherwise the assignment deadline. A requirement with no deadline at all starts reminders at assignment and repeats on the configured frequency.

Rules:

- Reminders stop for a requirement as soon as it is Approved or Not Required.
- Reminders respect the organization's quiet hours and time zone. A reminder that falls in quiet hours is sent at the end of them.
- A client receives one combined reminder per send time listing all of their due requirements, not one message per document.
- Schedule changes apply to future reminders only; reminders already sent are never resent.
- The UI shows a plain-language summary of the effective schedule, for example "Starts 14 days before the deadline, then every 3 days at 09:00".

## Notification Settings

Create an organization-level notification settings page.

Allow organizations to configure:

- Enabled notification channels.
- Email provider.
- SMS provider.
- Default sender name.
- Default sender email.
- Default SMS sender (Phase 2).
- Default reminder schedule (start days before deadline, frequency, send time, overdue behavior; see "Reminder Schedules").
- Automatic reminder activation.
- Notification templates.
- Quiet hours.
- Time zone.
- Retry policies.

Support organization-level defaults and allow individual automation rules to override them.

## Notification Templates

Allow businesses to create and edit reusable templates.

Support variables such as:

- `{{client_name}}`
- `{{company_name}}`
- `{{form_name}}`
- `{{missing_documents}}`
- `{{expiration_date}}`
- `{{portal_link}}`

Include default templates for:

- New form assignment.
- Missing documents.
- Expiring documents.
- Expired documents.
- Document rejection.
- Document approval.

## Notification History

Maintain a notification log containing:

- Recipient.
- Channel.
- Message.
- Related client.
- Related assignment.
- Creation date.
- Delivery status.
- Provider response.
- Failure reason.

Implement the delivery states Pending, Sent, Delivered, Failed, and Cancelled. A provider that does not report delivery receipts leaves the notification at Sent.

Prevent duplicate notifications through idempotency controls.

---

# 11. Automatic Email Document Processing

This is an important differentiating feature.

Businesses should be able to connect an existing email inbox so the application can automatically process incoming emails and identify client documents.

The system should operate in the background without requiring employees to manually download and upload every attachment.

## Email Integrations

Support an extensible email integration architecture.

Initial integration options:

1. IMAP connection for generic email providers (Phase 2).
2. Gmail API with OAuth2 (Phase 2).
3. Microsoft Graph with OAuth2 (Phase 3).
4. Additional providers in the future.

All of Section 11 is delivered in Phase 2. The Email Processing page and Email Integrations settings are not shown in the UI until then.

Important distinction: SMTP is an outbound email protocol. Use SMTP for sending email where appropriate, not for reading incoming messages.

For incoming email processing, use IMAP or the relevant provider API.

## Inbox Configuration

Create an Email Integrations settings page.

Allow organization administrators to:

- Connect an email inbox.
- Configure incoming email access.
- Authenticate through OAuth where supported.
- Configure IMAP server details where applicable.
- Test the connection.
- Enable or disable email scanning for each connected inbox.
- Enable or disable automatic upload of matched documents (see "Automatic Document Attachment").
- Configure scanning frequency.
- View connection status.
- Disconnect an inbox.
- Review processing history.

Store credentials and refresh tokens securely using encrypted secret storage.

Never expose integration credentials to the frontend.

## Email Scanning

Create a background email processing service.

It should:

1. Connect to the configured inbox.
2. Retrieve new incoming messages.
3. Identify PDF attachments. Only PDF attachments are processed in the MVP.
4. Ignore irrelevant emails and non-PDF attachments.
5. Extract email metadata.
6. Extract attachment metadata.
7. Analyze document contents.
8. Attempt to identify the client.
9. Identify the corresponding expected document.
10. Upload and associate matching documents with the correct client record.
11. Update the relevant document assignment.
12. Record the processing result.

Track processed email IDs and attachment hashes to prevent duplicate processing.

## Document Identification

Implement a document classification and matching pipeline.

The system should use multiple signals:

**Email Metadata**
- Sender email address.
- Recipient.
- Subject.
- Message body.
- Email date.

**PDF Metadata**
- Filename.
- Extracted text.
- Document structure.
- Relevant identifiers.

**Client Information**
- Client name.
- Email address.
- Company name.
- Tax identification number, when available.
- Existing client documents.

**Expected Documents**
- Assigned forms.
- Missing document requirements.
- Document names.
- Document descriptions.
- Expected identifiers.

Use text extraction for digitally generated PDFs.

OCR for scanned PDFs is Phase 3 and is not built in the MVP. Keep the extraction step behind an interface so an OCR provider can be added later.

## Matching Logic

The system should attempt to identify:

- Which client sent the document.
- What type of document it is.
- Which assigned form it belongs to.
- Which specific document requirement it satisfies.

Use a confidence-based matching system.

Default thresholds (configurable per organization):

- High confidence (score 0.90 or above): Automatically associate and upload the document.
- Medium confidence (0.60 to 0.89): Create a suggested match for employee review.
- Low confidence (below 0.60): Place the document in the Document Inbox as Unmatched.

Do not automatically attach ambiguous documents to client records.

A wrong client-document association could expose sensitive information.

Review is mandatory for any uncertain match:

- Only High-confidence matches may be attached automatically, only when automatic upload is enabled for the inbox, and only when the client is identified unambiguously (for example, an exact sender email match to a single client).
- Medium-confidence matches create a suggested match in the Centralized Document Inbox (see Section 8) and are not attached until an employee confirms.
- Low-confidence matches appear in the inbox as Unmatched.
- If a document could match more than one client, it must never be auto-attached, regardless of score.
- Each match records the signals used and the resulting score so reviewers can see why it was suggested.

## Scanning and Auto-Upload Controls

Organization Owners and Admins control email processing with two independent settings per connected inbox:

- **Email scanning (on/off):** When off, the inbox is not read at all and no emails or attachments are retrieved or stored. Turning it on starts scanning from that moment; emails received while it was off are not processed retroactively. New inboxes start with scanning off until an administrator turns it on.
- **Automatic upload of matched documents (on/off):** When on, High-confidence matches are attached automatically as described below. When off, scanning still runs, but every match, including High confidence, is placed in the Document Inbox for an employee to confirm and nothing is attached automatically. This setting only matters while scanning is on.

Changes to either setting take effect on the next scan, are recorded in the audit log, and are shown on the Email Processing page.

## Automatic Document Attachment

When a reliable match is identified and automatic upload is enabled:

- Upload the PDF to private storage.
- Create the document record.
- Associate it with the correct organization.
- Associate it with the correct client.
- Associate it with the matching document requirement.
- Save the original email reference.
- Record the processing source.
- Update the assignment status.
- Notify the assigned employees of the client.

If employee approval is required, set the document status to Under Review rather than Approved. If approval is not required, set it to Approved.

## Email Processing Dashboard

Create an interface showing:

- Emails processed.
- Documents automatically matched.
- Documents awaiting review.
- Unmatched attachments.
- Processing failures.
- Duplicate attachments.
- Last successful synchronization.

Employees resolve uncertain matches in the Document Inbox (see Section 8); this page links to the relevant inbox items.

Provide an email processing history with the ability to inspect the email metadata, attachment, and suggested client/document match.

---

# 12. Settings & Configuration

Create a centralized settings area with the following sections:

### Organization
- Organization name.
- Logo.
- Contact information.
- Time zone.
- Default language.

### Team
- Employee invitations.
- Roles and permissions (Owner, Admin, Member; multiple Owners allowed).
- Member management.

### Notifications
- Email configuration.
- SMS configuration.
- Automatic reminders.
- Notification templates.

### Email Integrations
- Connected inboxes.
- Provider configuration.
- Email scanning and automatic upload toggles per inbox.
- Synchronization settings.
- Processing history.

### Client Portal
- Portal access mode (clients sign in themselves, or public portal) and the public link.
- Portal branding.
- Invitation settings.
- Default access configuration.

### Document Settings
- Default maximum upload size.
- Accepted file formats (PDF, Image, Word, Excel).
- Default expiration policies.
- Document review requirements.

---

# 13. Activity Logs & Audit Trail

Implement an activity history for important operations.

Track:

- Client creation and modification.
- Form creation and modification.
- Form assignments.
- Document uploads.
- Document replacements.
- Document approvals and rejections.
- Expiration date changes.
- Reminder sending.
- Notification failures.
- Email processing.
- Team member changes.
- Integration changes.

Each activity should contain:

- Organization ID.
- User ID or system actor.
- Action type.
- Related entity.
- Timestamp.
- Relevant metadata.

Audit records should not be editable by ordinary organization users.

---

# 14. Database Architecture

Design a relational database with clear relationships and proper indexing.

The following entities should form the initial data model.

| Entity | Responsibility |
|---|---|
| users | User accounts |
| organizations | Organizations/workspaces |
| organization_members | Organization membership and roles; a user can have many memberships (one per workspace) and a workspace can have several Owners |
| client_assignments | Many-to-many link between clients and assigned employees (organization members) |
| invitations | Team invitations |
| clients | Client records (first_name, last_name, optional company) |
| client_users | Client portal accounts and associations |
| forms | Reusable document form definitions |
| form_versions | Immutable form versions |
| form_assignments | Forms assigned to clients |
| form_responses | Client or employee-submitted form responses |
| document_requirements | Expected documents within form versions |
| documents | Uploaded document records (submissions), each linked to a document requirement |
| document_versions | History of changes (file, metadata, expiration date) made to a single document record |
| document_inbox_items | Centralized document inbox entries: source, detected client and document type, suggested assignment/requirement, confidence score and signals, processing status, and review outcome |
| notifications | Notification history |
| notification_templates | Reusable message templates |
| automation_rules | Automatic reminder configuration |
| email_integrations | Connected email accounts |
| processed_emails | Email synchronization records |
| email_attachments | Attachment processing records |
| activity_logs | Audit trail |

Form fields are stored as a JSON schema inside `form_versions`. When a form version is published, its File Upload fields generate the `document_requirements` rows.

Column-level details are decided during implementation, but the separation between reusable forms, form versions, client assignments, document requirements, and uploaded documents must be preserved.

## Important Database Requirements

- Use UUIDs as primary keys.
- Add organization-level foreign key relationships.
- Add indexes for common filtering operations.
- Add unique constraints where appropriate.
- Use transactions for multi-step document submission operations.
- Maintain historical records where replacing or updating documents could otherwise destroy important information.
- Use soft deletion or archival where appropriate.
- Implement database-level tenant isolation with PostgreSQL row-level security.

---

# 15. Background Jobs & Automation

The application must support background operations.

Do not execute long-running processes directly inside normal HTTP requests.

Use a background job system for:

- Automatic reminder scheduling.
- Email synchronization.
- PDF text extraction.
- Document classification.
- Notification delivery.
- Expiration checks.
- Retry operations.

Jobs should be:

- Retryable.
- Idempotent.
- Logged.
- Observable.
- Safe to execute multiple times.

Scheduled processes should respect organization time zones.

Background processing must run independently of user-facing requests. Email scanning, reminders, and notifications must continue to work, and be retried, when the web application is idle, restarting, or being deployed. Use a persistent queue with a dedicated worker process so that no job is lost on restart.

---

# 16. User Interface & Design Requirements

Create a polished, professional SaaS interface.

The design should feel like a modern business productivity platform rather than a generic admin dashboard.

## Design Direction

- Clean and minimal interface.
- Neutral color palette.
- Clear typography.
- Consistent spacing.
- Subtle borders and shadows.
- Professional tables.
- Well-designed empty states.
- Useful status indicators.
- Responsive layouts.
- Accessible forms and controls.

Avoid excessive gradients, unnecessary animations, oversized cards, and decorative UI elements.

Prioritize information density and usability.

## Main Navigation

The business dashboard should have the following sidebar structure:

**Workspace**
- Dashboard
- Clients
- Documents
- File Space
- Document Inbox
- Forms & Templates

**Communication**
- Notifications
- Email Processing (shown from Phase 2)

**Administration**
- Team
- Settings

The client portal should have a separate, simplified navigation:

- Overview
- My Forms
- My Documents
- My Information
- Account Settings

The sidebar header doubles as a workspace switcher listing every workspace the user belongs to, with a "Create workspace" action.

Ensure the business dashboard and client portal are visually related but have different navigation and permissions.

---

# 17. Security, Privacy & Reliability

The application will process sensitive personal and business documents. Security must be considered from the beginning.

Implement:

- Strict organization data isolation.
- Backend authorization checks.
- Secure client authentication.
- Private document storage.
- Signed download URLs.
- Encrypted integration credentials.
- Secure OAuth token handling.
- Upload validation.
- Protection against unauthorized file access.
- Rate limiting.
- Input validation.
- Secure session management.
- Audit logging.
- Database backups.
- Error handling.

Follow GDPR principles where applicable, including data minimization, access controls, retention policies, and appropriate deletion/export workflows.

Do not log document contents, passwords, access tokens, or other sensitive information.

Document deletion, replacement, and archival must have clearly defined behavior.

---

# 18. MVP Scope & Development Priorities

Do not attempt to build every possible advanced feature immediately.

The initial MVP must prioritize a complete working document collection workflow.

## Phase 1 — Essential MVP

Implement fully:

1. Authentication (a single sign-in / create-account page).
2. Workspace creation and multi-workspace membership.
3. Team management with Owner (multiple allowed), Admin, and Member roles.
4. Client management.
5. Custom form builder.
6. Reusable form templates.
7. Form assignments.
8. Document uploads.
9. Document expiration tracking.
10. Document status management.
11. Centralized document inbox (employee and client portal uploads).
12. Employee dashboard.
13. Client portal.
14. Manual email reminders.
15. Configurable automatic email reminders for missing, expiring, and expired documents.
16. Basic email notification history.
17. Basic audit logs.
18. File Space (folder view of stored files).
19. Form submissions page per form.
20. Client portal access mode (private or public).

## Phase 2 — Integrations & Automation

Implement:

1. SMS notifications.
2. IMAP inbox integration.
3. Gmail API integration.
4. Automatic PDF attachment detection.
5. PDF text extraction.
6. Client and document matching.
7. Automatic document attachment.
8. Email-sourced items and match review in the Centralized Document Inbox.
9. Email processing history and retry management.
10. SMS as a channel for manual and automatic reminders.

## Phase 3 — Future Enhancements

Keep the architecture extensible for:

- Microsoft Graph integration.
- OCR for scanned documents.
- Advanced AI document classification.
- Automatic extraction of expiration dates and identifiers.
- Custom employee permissions.
- Advanced workflow automation.
- WhatsApp notifications.
- Multiple client contacts.
- Public document request links.
- Advanced analytics and reporting.
- Organization subscription and billing.
- API and webhook integrations.

Do not implement Phase 3 features unless necessary to support the architecture.

---

# 19. Development Instructions

All technology decisions below are final. Implement them as written without asking for confirmation, and make reasonable implementation choices for any detail not specified here.

## Technology Stack (fixed)

The repository already contains the stack. Extend it; do not replace it.

- **Backend:** NestJS in `api/`, following the rules in `.cursor/rules/api-code-structure-and-best-practices.mdc`.
- **Database:** PostgreSQL through Prisma (`api/prisma`). Every schema change ships as a Prisma migration. Enforce tenant isolation with PostgreSQL row-level security in addition to organization-scoped backend queries.
- **Background jobs:** BullMQ via `@nestjs/bullmq`, run in a dedicated worker process.
- **Frontend:** React and Vite in `app/`, following the rules in `.cursor/rules/app-code-structure-and-best-practices.mdc`. Reuse the existing components and styling system.
- **Authentication:** Extend the authentication already present in `api/`. Add a separate client-portal principal (client users) with its own invitation, email verification, and password recovery flows. Employee and client sessions must not be interchangeable.
- **Document storage:** Google Cloud Storage with a private bucket. Downloads and previews use short-lived V4 signed URLs. Access it through a storage interface so the provider stays replaceable.
- **Email sending:** Resend, behind the provider-independent notification interface.
- **SMS (Phase 2):** Twilio, behind the same interface, with delivery status webhooks.
- **Inbound email (Phase 2):** IMAP and Gmail API, each implemented behind a common inbox-provider interface.
- **PDF text extraction:** A server-side PDF text library running inside background jobs. OCR is not built in this MVP; scanned PDFs without extractable text go to the inbox as Low confidence.

## Implementation Order

1. Read the existing repository to learn its conventions, and reuse its infrastructure.
2. Define the database schema and migrations before any frontend work.
3. Implement backend modules, then the frontend, one module at a time in the order of the Phase 1 list.
4. Cover each module with tests before moving on.

Keep secrets and API credentials in environment variables or secure secret storage.

Provide an `.env.example` file.

Document all required environment variables and external service configurations.

---

# 20. Functional Acceptance Criteria

Phase 1 is not complete until Workflows A, B, C, D, E, and G (without the email source) work end to end. Phase 2 is not complete until Workflow F and the email source of Workflow G work end to end, and Workflows C and D also work over SMS.

### Workflow A: New Organization

1. A user creates an account on the single sign-in / create-account page.
2. Creates a workspace (the user can later create more, or join others by invitation).
3. Becomes its Owner (more Owners can be added later).
4. Invites an employee.
5. The employee accepts the invitation.
6. Both users access the same organization workspace with their respective permissions.

### Workflow B: Client Document Collection

1. An employee creates a client.
2. Creates a custom document form.
3. Adds multiple required document fields.
4. Assigns the form to the client.
5. The client receives an invitation.
6. The client logs into the portal.
7. Uploads the requested documents.
8. The employee reviews the submissions.
9. Approves or rejects each document.
10. The client and employee can see the updated statuses.

### Workflow C: Missing Document Reminders

1. An employee assigns a form.
2. The client submits only some documents.
3. The dashboard identifies missing documents.
4. The employee manually sends a reminder.
5. The client receives the notification.
6. Alternatively, an automatic reminder is sent according to organization settings.
7. Reminders stop when the relevant requirements are satisfied.

### Workflow D: Document Expiration

1. A document has an expiration date.
2. The system identifies it as approaching expiration.
3. The dashboard displays it.
4. The notification engine sends reminders according to configured rules.
5. The document becomes expired when its expiration date passes.
6. The client is asked to submit a replacement.
7. The employee approves the replacement.
8. The previous document remains in historical records.

### Workflow E: Employee Upload

1. An employee opens a client record.
2. Selects an assigned form.
3. Uploads a document on the client's behalf.
4. Associates it with the correct requirement.
5. The system records the employee as the uploader.
6. The client portal reflects the updated document status.

### Workflow F: Automatic Email Processing

1. An organization connects an email inbox.
2. The system synchronizes incoming emails.
3. An email arrives with a PDF attachment.
4. The system extracts its contents.
5. Identifies the likely client and expected document.
6. Automatically attaches the document if the match is sufficiently reliable.
7. Sends uncertain matches to the Centralized Document Inbox for employee review.
8. Updates the client record.
9. Records the processing result.

### Workflow G: Centralized Document Inbox

1. Documents arrive from different sources: a client portal upload, an employee upload, and (once Phase 2 is delivered) an email attachment.
2. All of them appear in the Document Inbox with client, document type, source, suggested assignment, confidence, and processing status.
3. An employee opens an item needing review and previews the document next to the suggested match.
4. The employee confirms or corrects the client, assignment, and requirement.
5. The document is attached, the assignment status updates, and the action is recorded in the audit log.
6. The item leaves the "needs review" list and the navigation count decreases.

---

# 21. Final Implementation Requirements

Build the application as a real, functional SaaS MVP.

Do not:

- Create buttons that do nothing.
- Use fake statistics or hardcoded dashboard data.
- Simulate successful uploads without storing files.
- Store sensitive documents in public directories.
- Implement authorization only in the frontend.
- Couple notification logic to individual modules.
- Hardcode reminder schedules.
- Automatically associate uncertain documents with clients.
- Create placeholder integrations that appear connected but do not work.

Use realistic seed data only for development and demonstrations.

Provide clear loading states, error messages, validation feedback, and empty states.

Every major workflow should have a complete and usable interface.

At the end of development:

1. Verify database migrations.
2. Test organization isolation.
3. Test role permissions.
4. Test form creation and assignments.
5. Test client submissions.
6. Test document uploads and downloads.
7. Test expiration calculations.
8. Test manual and automatic notifications.
9. Test email processing and duplicate prevention (Phase 2).
10. Fix critical issues before considering the MVP complete.

**The primary objective is to deliver a reliable document collection and management platform that a real business can use to manage clients and collect their documents without relying on spreadsheets, manual email handling, or repetitive follow-ups.**

Prioritize a complete, dependable MVP over a large number of partially implemented features.