-- Ensure invoices can be created without a due_date (for uploaded PDFs)
ALTER TABLE invoices
  ALTER COLUMN due_date DROP NOT NULL;

-- Also relax common monetary fields in case prior migration didn’t apply
ALTER TABLE invoices
  ALTER COLUMN subtotal DROP NOT NULL,
  ALTER COLUMN tax DROP NOT NULL,
  ALTER COLUMN total DROP NOT NULL;

-- And allow invoices without a project if not already relaxed
ALTER TABLE invoices
  ALTER COLUMN project_id DROP NOT NULL;
