## Course/CLO Query Notes

- **Source tables**: `cur_m_cur_subject` holds the course master keyed by `subject_code`; `cur_t_subject_clo` stores CLO rows linked through `csubject_id`; `cls_t_section` carries `academic_year`/`semester` per offering.

- **Joins**: Sections join to subjects via `subject_code`, and CLOs join via `csubject_id`, so every section shares the same CLO set defined in the master tables.

- **Uniqueness expectations**: `subject_code` should be unique in `cur_m_cur_subject`. Each code fans out to many sections (year/semester) and many CLOs, confirming a one-to-many relationship in both directions. Once a course’s CLOs are defined in `cur_t_subject_clo`, that set is reused by every offering because the query never filters CLOs by year/semester.

- **Implication**: Unless the master tables themselves have duplicates, it is not possible for different offerings (per year/semester) to carry different CLO definitions using this query; you would need a year/semester column on the CLO table for that.

- **Sanity Check**: On clean datasets, the course code to name is one-to-one, and each course code maps to a consistent set of CLO names across offerings.

- **Assumptions**: The data model assumes CLOs are defined at the course level, not the offering level. If CLOs vary by offering, the current schema does not support that distinction.
