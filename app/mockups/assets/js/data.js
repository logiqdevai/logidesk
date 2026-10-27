/* Mock data for the Gatherly UI mockup (Phase 1 / MVP). "Today" in the mockup = 27 Oct 2026. */
window.MOCK = (function () {
  const org = { name: 'Meridian Accounting', short: 'MA', tz: 'Europe/Athens' };

  const team = [
    { id: 'u1', name: 'Alex Morgan', email: 'alex@meridian.co', role: 'Owner', status: 'active', clients: 10, last: 'Today, 09:12', c: 'c1' },
    { id: 'u2', name: 'Maria Costa', email: 'maria@meridian.co', role: 'Owner', status: 'active', clients: 6, last: 'Today, 08:40', c: 'c2' },
    { id: 'u3', name: 'Tom Becker', email: 'tom@meridian.co', role: 'Admin', status: 'active', clients: 4, last: 'Yesterday', c: 'c3' },
    { id: 'u4', name: 'Nina Alvarez', email: 'nina@meridian.co', role: 'Member', status: 'active', clients: 3, last: '23 Oct 2026', c: 'c4' },
    { id: 'u5', name: 'david@meridian.co', email: 'david@meridian.co', role: 'Member', status: 'invited', clients: 0, last: 'Invitation sent 25 Oct', c: 'c4' }
  ];

  // progress: [approved, review, missing/problem] counts are derived from `req`
  const clients = [
    { id: 'c1', first: 'Dimitris', last: 'Nikolaou', company: 'Northwind Logistics Ltd', name: 'Dimitris Nikolaou', email: 'accounts@northwind.example', phone: '+30 210 555 0142', tax: 'EL 094512345', assignees: ['u2', 'u3'], forms: 2, req: { approved: 9, review: 2, missing: 2, expired: 1, expiring: 1 }, portal: 'active', added: '12 Mar 2026' },
    { id: 'c2', first: 'Elena', last: 'Papadopoulou', company: '', name: 'Elena Papadopoulou', email: 'elena.p@mail.example', phone: '+30 694 555 0187', tax: '', assignees: ['u3'], forms: 1, req: { approved: 5, review: 0, missing: 0, expired: 0, expiring: 0 }, portal: 'active', added: '02 Apr 2026' },
    { id: 'c3', first: 'Katerina', last: 'Vlachou', company: 'Brightside Dental Clinic', name: 'Katerina Vlachou', email: 'office@brightside.example', phone: '+30 210 555 0199', tax: 'EL 801234567', assignees: ['u2', 'u4'], forms: 2, req: { approved: 4, review: 1, missing: 4, expired: 0, expiring: 2 }, portal: 'active', added: '19 Apr 2026' },
    { id: 'c4', first: 'James', last: "O'Connor", company: '', name: "James O'Connor", email: 'james.oc@mail.example', phone: '+353 85 555 0123', tax: '', assignees: ['u4'], forms: 1, req: { approved: 1, review: 0, missing: 4, expired: 0, expiring: 0 }, portal: 'invited', added: '21 Oct 2026' },
    { id: 'c5', first: 'Nikos', last: 'Laskaris', company: 'Helios Renewable Energy', name: 'Nikos Laskaris', email: 'finance@helios.example', phone: '+30 231 555 0160', tax: 'EL 998877665', assignees: ['u1', 'u2'], forms: 3, req: { approved: 14, review: 3, missing: 1, expired: 2, expiring: 0 }, portal: 'active', added: '05 Jan 2026' },
    { id: 'c6', first: 'Sofia', last: 'Marinou', company: '', name: 'Sofia Marinou', email: 'sofia.m@mail.example', phone: '+30 697 555 0111', tax: '', assignees: ['u3'], forms: 1, req: { approved: 3, review: 1, missing: 1, expired: 0, expiring: 1 }, portal: 'active', added: '14 May 2026' },
    { id: 'c7', first: 'Giorgos', last: 'Antoniou', company: 'Atlas Construction Group', name: 'Giorgos Antoniou', email: 'hr@atlas-group.example', phone: '+30 210 555 0123', tax: 'EL 112233445', assignees: ['u2'], forms: 2, req: { approved: 7, review: 0, missing: 3, expired: 1, expiring: 0 }, portal: 'active', added: '28 Feb 2026' },
    { id: 'c8', first: 'Daniel', last: 'Kowalski', company: '', name: 'Daniel Kowalski', email: 'daniel.k@mail.example', phone: '+48 600 555 012', tax: '', assignees: ['u4'], forms: 1, req: { approved: 5, review: 0, missing: 0, expired: 0, expiring: 0 }, portal: 'active', added: '09 Jun 2026' },
    { id: 'c9', first: 'Anna', last: 'Stavrou', company: 'Olive & Vine Restaurants', name: 'Anna Stavrou', email: 'owner@oliveandvine.example', phone: '+30 210 555 0177', tax: 'EL 556677889', assignees: ['u3', 'u1'], forms: 1, req: { approved: 2, review: 1, missing: 3, expired: 0, expiring: 1 }, portal: 'not-invited', added: '24 Oct 2026' },
    { id: 'c10', first: 'Priya', last: 'Raman', company: '', name: 'Priya Raman', email: 'priya.r@mail.example', phone: '+44 7700 555 012', tax: '', assignees: ['u1'], forms: 1, req: { approved: 4, review: 1, missing: 0, expired: 0, expiring: 0 }, portal: 'active', added: '30 Jul 2026' }
  ];

  const forms = [
    { id: 'f1', name: 'Individual KYC Onboarding', desc: 'Identity and address verification for individual clients.', fields: 9, docs: 5, assigned: 4, updated: '18 Oct 2026', template: true, status: 'published' },
    { id: 'f2', name: 'Business Compliance Pack', desc: 'Registration, tax clearance and insurance for companies.', fields: 14, docs: 8, assigned: 5, updated: '02 Oct 2026', template: true, status: 'published' },
    { id: 'f3', name: 'Annual Tax Documents', desc: 'Statements and receipts required for the yearly tax return.', fields: 11, docs: 6, assigned: 6, updated: '11 Sep 2026', template: false, status: 'published' },
    { id: 'f4', name: 'Employee Onboarding Checklist', desc: 'Contracts, ID and bank details for new hires.', fields: 12, docs: 5, assigned: 2, updated: '28 Aug 2026', template: true, status: 'published' },
    { id: 'f5', name: 'Insurance Certificates Renewal', desc: 'Annual renewal of liability and property cover.', fields: 6, docs: 3, assigned: 3, updated: '20 Oct 2026', template: false, status: 'published' },
    { id: 'f6', name: 'VAT Quarterly Pack (draft)', desc: '', fields: 4, docs: 2, assigned: 0, updated: '25 Oct 2026', template: false, status: 'draft' }
  ];

  // Document requirement + its latest submission, per client
  const documents = [
    { id: 'd1', name: 'Certificate of Incorporation', file: 'incorporation-cert.pdf', client: 'c1', form: 'Business Compliance Pack', status: 'approved', expires: '', uploaded: '14 Mar 2026', by: 'Client', src: 'portal' },
    { id: 'd2', name: 'Tax Clearance Certificate', file: 'tax-clearance-2026.pdf', client: 'c1', form: 'Business Compliance Pack', status: 'review', expires: '30 Jun 2027', uploaded: '26 Oct 2026', by: 'Client', src: 'portal' },
    { id: 'd3', name: 'Public Liability Insurance', file: 'liability-insurance.pdf', client: 'c1', form: 'Insurance Certificates Renewal', status: 'expiring', expires: '15 Nov 2026', uploaded: '16 Nov 2025', by: 'Tom Becker', src: 'employee' },
    { id: 'd4', name: 'Property Insurance', file: 'property-insurance.pdf', client: 'c1', form: 'Insurance Certificates Renewal', status: 'expired', expires: '12 Oct 2026', uploaded: '12 Oct 2025', by: 'Client', src: 'portal' },
    { id: 'd5', name: 'Passport', file: 'passport-scan.jpg', client: 'c2', form: 'Individual KYC Onboarding', status: 'approved', expires: '03 Feb 2030', uploaded: '05 Apr 2026', by: 'Client', src: 'portal' },
    { id: 'd6', name: 'Proof of Address', file: 'utility-bill-sep.pdf', client: 'c3', form: 'Business Compliance Pack', status: 'rejected', expires: '', uploaded: '22 Oct 2026', by: 'Client', src: 'portal' },
    { id: 'd7', name: 'Medical Practice License', file: 'license-2026.pdf', client: 'c3', form: 'Business Compliance Pack', status: 'expiring', expires: '02 Dec 2026', uploaded: '03 Dec 2025', by: 'Maria Costa', src: 'employee' },
    { id: 'd8', name: 'Proof of Identity', file: 'id-front-back.pdf', client: 'c4', form: 'Individual KYC Onboarding', status: 'missing', expires: '', uploaded: '', by: '', src: '' },
    { id: 'd9', name: 'Bank Statement (Q3)', file: 'bank-q3.pdf', client: 'c5', form: 'Annual Tax Documents', status: 'review', expires: '', uploaded: '25 Oct 2026', by: 'Client', src: 'portal' },
    { id: 'd10', name: 'Employer Liability Cover', file: 'employer-liability.pdf', client: 'c5', form: 'Insurance Certificates Renewal', status: 'expired', expires: '20 Oct 2026', uploaded: '21 Oct 2025', by: 'Client', src: 'portal' },
    { id: 'd11', name: 'Payroll Summary', file: 'payroll-2026.xlsx', client: 'c7', form: 'Annual Tax Documents', status: 'approved', expires: '', uploaded: '10 Oct 2026', by: 'Nina Alvarez', src: 'employee' },
    { id: 'd12', name: 'Health & Safety Certificate', file: '', client: 'c7', form: 'Business Compliance Pack', status: 'missing', expires: '', uploaded: '', by: '', src: '' },
    { id: 'd13', name: 'Proof of Address', file: 'council-tax.pdf', client: 'c6', form: 'Individual KYC Onboarding', status: 'review', expires: '', uploaded: '27 Oct 2026', by: 'Client', src: 'portal' },
    { id: 'd14', name: 'Food Hygiene Certificate', file: 'hygiene-cert.png', client: 'c9', form: 'Business Compliance Pack', status: 'expiring', expires: '09 Nov 2026', uploaded: '10 Nov 2025', by: 'Tom Becker', src: 'employee' }
  ];

  // Phase 1: inbox receives employee + client-portal uploads only (always known client + requirement, High / Matched).
  const inbox = [
    { id: 'i1', client: 'c1', doc: 'Tax Clearance Certificate', file: 'tax-clearance-2026.pdf', src: 'portal', form: 'Business Compliance Pack', req: 'Tax Clearance Certificate', status: 'matched', needs: 'approval', when: '26 Oct, 16:42', size: '412 KB', signals: ['Uploaded by client to this requirement', 'Requirement requires employee approval'] },
    { id: 'i2', client: 'c6', doc: 'Proof of Address', file: 'council-tax.pdf', src: 'portal', form: 'Individual KYC Onboarding', req: 'Proof of Address', status: 'matched', needs: 'approval', when: '27 Oct, 09:05', size: '238 KB', signals: ['Uploaded by client to this requirement', 'Requirement requires employee approval'] },
    { id: 'i3', client: 'c5', doc: 'Bank Statement (Q3)', file: 'bank-q3.pdf', src: 'portal', form: 'Annual Tax Documents', req: 'Bank Statement (Q3)', status: 'matched', needs: 'approval', when: '25 Oct, 14:18', size: '1.2 MB', signals: ['Uploaded by client to this requirement', 'Requirement requires employee approval'] },
    { id: 'i4', client: 'c9', doc: 'Food Hygiene Certificate', file: 'hygiene-cert.png', src: 'portal', form: 'Business Compliance Pack', req: 'Food Hygiene Certificate', status: 'matched', needs: 'approval', when: '27 Oct, 10:31', size: '860 KB', signals: ['Uploaded by client to this requirement', 'Replacement for expiring document'] },
    { id: 'i5', client: 'c10', doc: 'Proof of Identity', file: 'passport-priya.jpg', src: 'portal', form: 'Individual KYC Onboarding', req: 'Proof of Identity', status: 'matched', needs: 'approval', when: '24 Oct, 18:02', size: '1.8 MB', signals: ['Uploaded by client to this requirement', 'Requirement requires employee approval'] },
    { id: 'i6', client: 'c7', doc: 'Payroll Summary', file: 'payroll-2026.pdf', src: 'employee', form: 'Annual Tax Documents', req: 'Payroll Summary', status: 'resolved', needs: '', when: '10 Oct, 11:20', size: '540 KB', by: 'Nina Alvarez', signals: ['Uploaded by employee on behalf of client'] },
    { id: 'i7', client: 'c3', doc: 'Medical Practice License', file: 'license-2026.pdf', src: 'employee', form: 'Business Compliance Pack', req: 'Medical Practice License', status: 'resolved', needs: '', when: '03 Dec 2025', size: '301 KB', by: 'Maria Costa', signals: ['Uploaded by employee on behalf of client'] },
    { id: 'i8', client: 'c2', doc: 'Passport', file: 'passport-scan.jpg', src: 'portal', form: 'Individual KYC Onboarding', req: 'Passport', status: 'resolved', needs: '', when: '05 Apr 2026', size: '1.1 MB', by: 'Maria Costa', signals: ['Uploaded by client to this requirement', 'Approved by Maria Costa'] }
  ];

  const activity = [
    { ico: 'upload', tone: 'brand', text: '<b>Sofia Marinou</b> uploaded <b>Proof of Address</b>', when: '12 min ago' },
    { ico: 'upload', tone: 'brand', text: '<b>Anna Stavrou</b> uploaded <b>Food Hygiene Certificate</b>', when: '1 hr ago' },
    { ico: 'send', tone: '', text: 'Reminder sent to <b>Katerina Vlachou</b> (4 missing)', when: '2 hrs ago' },
    { ico: 'check', tone: 'ok', text: '<b>Maria Costa</b> approved <b>Passport</b> for Daniel Kowalski', when: 'Yesterday' },
    { ico: 'x', tone: 'bad', text: '<b>Tom Becker</b> rejected <b>Proof of Address</b> for Katerina Vlachou', when: 'Yesterday' },
    { ico: 'forms', tone: '', text: '<b>Insurance Certificates Renewal</b> assigned to Nikos Laskaris', when: '25 Oct' },
    { ico: 'clock', tone: 'warn', text: '<b>Employer Liability Cover</b> (Nikos Laskaris) expired', when: '20 Oct' },
    { ico: 'users', tone: '', text: 'New client added: <b>James O\'Connor</b>', when: '21 Oct' }
  ];

  const notifications = [
    { to: 'Katerina Vlachou', email: 'office@brightside.example', type: 'Missing documents', subject: 'You have 4 documents waiting', when: '27 Oct, 08:00', status: 'delivered', by: 'Automatic' },
    { to: 'Dimitris Nikolaou', email: 'accounts@northwind.example', type: 'Expiring documents', subject: 'Public Liability Insurance expires 15 Nov 2026', when: '27 Oct, 08:00', status: 'sent', by: 'Automatic' },
    { to: 'Nikos Laskaris', email: 'finance@helios.example', type: 'Expired documents', subject: 'Employer Liability Cover has expired', when: '26 Oct, 09:00', status: 'delivered', by: 'Automatic' },
    { to: 'James O\'Connor', email: 'james.oc@mail.example', type: 'New form assignment', subject: 'Individual KYC Onboarding is ready for you', when: '21 Oct, 15:44', status: 'delivered', by: 'Maria Costa' },
    { to: 'Giorgos Antoniou', email: 'hr@atlas-group.example', type: 'Missing documents', subject: 'Reminder: 3 documents outstanding', when: '20 Oct, 10:12', status: 'failed', by: 'Tom Becker', reason: 'Mailbox full (provider response 552)' },
    { to: 'Elena Papadopoulou', email: 'elena.p@mail.example', type: 'Document approved', subject: 'Your passport has been approved', when: '05 Apr, 12:30', status: 'delivered', by: 'Automatic' }
  ];

  const templates = [
    { id: 't1', name: 'New form assignment', subject: 'Action needed: {{form_name}}', body: 'Hi {{client_name}},\n\n{{company_name}} has asked you to complete "{{form_name}}". You can upload everything securely in your portal:\n{{portal_link}}\n\nThank you!' },
    { id: 't2', name: 'Missing documents', subject: 'Reminder: documents still needed for {{form_name}}', body: 'Hi {{client_name}},\n\nWe are still waiting for:\n{{missing_documents}}\n\nUpload them here: {{portal_link}}' },
    { id: 't3', name: 'Expiring documents', subject: 'Your document expires on {{expiration_date}}', body: 'Hi {{client_name}},\n\nThe following documents are expiring soon:\n{{missing_documents}}\n\nPlease upload a renewed copy: {{portal_link}}' },
    { id: 't4', name: 'Expired documents', subject: 'A document has expired', body: 'Hi {{client_name}},\n\nThese documents have expired:\n{{missing_documents}}\n\nPlease submit replacements: {{portal_link}}' },
    { id: 't5', name: 'Document rejection', subject: 'We could not accept your document', body: 'Hi {{client_name}},\n\nUnfortunately we could not accept your upload for {{form_name}}. Please upload a new copy: {{portal_link}}' },
    { id: 't6', name: 'Document approval', subject: 'Your document was approved', body: 'Hi {{client_name}},\n\nGood news - your document for {{form_name}} has been approved.' }
  ];

  const SIZES = ['412 KB','1.2 MB','640 KB','388 KB','1.1 MB','238 KB','301 KB','','1.2 MB','520 KB','540 KB','','238 KB','860 KB'];
  documents.forEach((d, i) => { d.size = SIZES[i]; });

  const workspaces = [
    { id: 'w1', name: 'Meridian Accounting', short: 'MA', role: 'Owner', members: 5, clients: 10 },
    { id: 'w2', name: 'Harbor Legal Group', short: 'HL', role: 'Member', members: 12, clients: 48 },
    { id: 'w3', name: 'Alex Morgan Consulting', short: 'AC', role: 'Owner', members: 1, clients: 3 }
  ];
  // Portals this person was invited to as a client of other organizations
  const portals = [{ id: 'p1', org: 'Studio Kappa Design', client: 'Alex Morgan', pending: 2 }];

  // Form submissions: one row per client a form was assigned to
  const submissions = [
    { id: 's1', form: 'f2', client: 'c1', assigned: '12 Mar 2026', submitted: '26 Oct 2026', deadline: '20 Nov 2026', status: 'review', done: 5, total: 8 },
    { id: 's2', form: 'f2', client: 'c3', assigned: '19 Apr 2026', submitted: '22 Oct 2026', deadline: '15 Nov 2026', status: 'inprogress', done: 4, total: 8 },
    { id: 's3', form: 'f2', client: 'c7', assigned: '28 Feb 2026', submitted: '10 Oct 2026', deadline: '30 Oct 2026', status: 'inprogress', done: 5, total: 8 },
    { id: 's4', form: 'f2', client: 'c9', assigned: '24 Oct 2026', submitted: '27 Oct 2026', deadline: '24 Nov 2026', status: 'inprogress', done: 2, total: 8 },
    { id: 's5', form: 'f2', client: 'c5', assigned: '05 Jan 2026', submitted: '14 Jan 2026', deadline: '28 Feb 2026', status: 'complete', done: 8, total: 8 },
    { id: 's6', form: 'f1', client: 'c2', assigned: '02 Apr 2026', submitted: '05 Apr 2026', deadline: '30 Apr 2026', status: 'complete', done: 5, total: 5 },
    { id: 's7', form: 'f1', client: 'c4', assigned: '21 Oct 2026', submitted: '', deadline: '25 Nov 2026', status: 'not-started', done: 1, total: 5 },
    { id: 's8', form: 'f1', client: 'c6', assigned: '14 May 2026', submitted: '27 Oct 2026', deadline: '10 Nov 2026', status: 'review', done: 4, total: 5 },
    { id: 's9', form: 'f1', client: 'c8', assigned: '09 Jun 2026', submitted: '12 Jun 2026', deadline: '30 Jun 2026', status: 'complete', done: 5, total: 5 },
    { id: 's10', form: 'f1', client: 'c10', assigned: '30 Jul 2026', submitted: '24 Oct 2026', deadline: '15 Nov 2026', status: 'review', done: 4, total: 5 },
    { id: 's11', form: 'f3', client: 'c5', assigned: '01 Sep 2026', submitted: '25 Oct 2026', deadline: '31 Oct 2026', status: 'review', done: 4, total: 6 },
    { id: 's12', form: 'f3', client: 'c7', assigned: '01 Sep 2026', submitted: '10 Oct 2026', deadline: '15 Oct 2026', status: 'overdue', done: 3, total: 6 },
    { id: 's13', form: 'f3', client: 'c1', assigned: '01 Sep 2026', submitted: '', deadline: '15 Oct 2026', status: 'overdue', done: 0, total: 6 },
    { id: 's14', form: 'f5', client: 'c1', assigned: '10 Oct 2026', submitted: '16 Oct 2026', deadline: '15 Nov 2026', status: 'inprogress', done: 1, total: 3 },
    { id: 's15', form: 'f5', client: 'c5', assigned: '25 Oct 2026', submitted: '', deadline: '25 Nov 2026', status: 'not-started', done: 0, total: 3 }
  ];

  const assigneesOf = (c) => c.assignees.map(userById);
  const fileTag = (f) => ({ Image: 'IMG', PDF: 'PDF', Excel: 'XLS', Word: 'DOC' }[fileKind(f)] || '—');
  const fileKind = (f) => { const e = (f.split('.').pop() || '').toLowerCase(); return ['jpg', 'jpeg', 'png'].includes(e) ? 'Image' : e === 'pdf' ? 'PDF' : e === 'xlsx' ? 'Excel' : e === 'docx' ? 'Word' : ''; };

  const clientById = (id) => clients.find((c) => c.id === id);
  const userById = (id) => team.find((u) => u.id === id);
  const initials = (n) => n.replace(/[^A-Za-z& ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const needsReview = () => inbox.filter((i) => i.needs).length;

  return { fileTag, workspaces, portals, submissions, assigneesOf, fileKind, org, team, clients, forms, documents, inbox, activity, notifications, templates, clientById, userById, initials, needsReview, me: team[0] };
})();
