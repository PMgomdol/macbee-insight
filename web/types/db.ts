export type ArchiveItem = {
  id: number;
  main_category: string;
  sub_category: string | null;
  tags: string[];
  title: string;
  summary: string | null;
  external_url: string | null;
  file_url: string | null;
  format: string | null;
  published_at: string | null;
  registered_at: string;
  proposer: string | null;
  status: string;
  last_checked_at: string | null;
  category_owner: string | null;
  exposure_grade: string;
  notes: string | null;
  views: number;
  downloads: number;
  kind: 'files' | 'insights';
};

export type FAQItem = {
  id: number;
  main_category: string;
  sub_category: string | null;
  question: string;
  answer: string;
  registered_at: string;
  views: number;
  notes: string | null;
};

export type Category = {
  id: number;
  main_category: string;
  sub_category: string | null;
  description: string | null;
  owner: string | null;
};
