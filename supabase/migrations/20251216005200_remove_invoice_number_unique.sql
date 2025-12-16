-- Remove UNIQUE constraint from invoice_number since invoices for different clients can have the same number
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;
