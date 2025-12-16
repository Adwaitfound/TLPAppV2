-- Add new columns to invoices table for invoice upload management
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS advance_date DATE,
ADD COLUMN IF NOT EXISTS tax_type TEXT CHECK (tax_type IN ('gst', 'non_gst', 'both')) DEFAULT 'gst',
ADD COLUMN IF NOT EXISTS invoice_file_url TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update the invoices table to make some fields optional since we're uploading invoices
ALTER TABLE invoices 
ALTER COLUMN project_id DROP NOT NULL,
ALTER COLUMN due_date DROP NOT NULL,
ALTER COLUMN subtotal DROP NOT NULL,
ALTER COLUMN tax DROP NOT NULL,
ALTER COLUMN total DROP NOT NULL;

-- Add comment to explain the redesign
COMMENT ON TABLE invoices IS 'Invoices table - supports both manual creation and uploaded invoices with advance payment tracking';
