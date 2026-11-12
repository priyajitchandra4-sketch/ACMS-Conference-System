export const ROLE_LABELS = {
  chair: 'Chair',
  track_chair: 'Track Chair',
  meta_reviewer: 'Meta-Reviewer',
  reviewer: 'Reviewer',
  external_reviewer: 'External Reviewer',
  author: 'Author',
  delegate: 'Delegate',
};

export const roleLabel = (role) => ROLE_LABELS[role] || role;