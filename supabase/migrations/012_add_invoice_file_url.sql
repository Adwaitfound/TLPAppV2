-- Ensure invoice uploads work with new columns
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_file_url TEXT,
ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS advance_date DATE,
ADD COLUMN IF NOT EXISTS tax_type TEXT CHECK (tax_type IN ('gst','non_gst','both')) DEFAULT 'gst',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Make project_id optional to allow uploads without a project
ALTER TABLE invoices
ALTER COLUMN project_id DROP NOT NULL;

-- Make monetary fields nullable for uploaded invoices where breakdown is not provided
ALTER TABLE invoices
ALTER COLUMN subtotal DROP NOT NULL,
ALTER COLUMN tax DROP NOT NULL,
ALTER COLUMN total DROP NOT NULL;
