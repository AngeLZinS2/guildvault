
export interface MemberData {
  id: string;
  name: string;
  role?: string;
  status?: string;
  state_id?: string;
  join_date?: string;
}

export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
