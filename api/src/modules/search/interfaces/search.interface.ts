export interface SearchClientHit {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  status: string;
}

export interface SearchFormHit {
  id: string;
  name: string;
  status: string;
  is_template: boolean;
}

export interface SearchAssignmentHit {
  id: string;
  form_name: string;
  status: string;
  client: { id: string; name: string };
}

export interface SearchDocumentHit {
  id: string;
  title: string;
  filename: string;
  review_status: string;
  assignment_id: string | null;
  client: { id: string; name: string } | null;
}

export interface SearchMemberHit {
  member_id: string;
  name: string;
  email: string;
  role: string;
}

export interface SearchResponse {
  query: string;
  /** True when the query was a full UUID and matched by id. */
  by_id: boolean;
  clients: SearchClientHit[];
  forms: SearchFormHit[];
  assignments: SearchAssignmentHit[];
  documents: SearchDocumentHit[];
  members: SearchMemberHit[];
}
