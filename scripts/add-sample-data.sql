DO $$ BEGIN RAISE EXCEPTION 'Sample data script disabled: use your live database.'; END $$;



-- DO NOT USE: Sample data script disabled. Use real Supabase data.
DO $$ BEGIN RAISE EXCEPTION 'Disabled: sample data script removed. Use live database only.'; END $$;
-- Add sample projects
INSERT INTO projects (id, client_id, name, description, status, budget, start_date, deadline, progress_percentage, created_at, updated_at)
VALUES 
    -- Tech Innovations Inc projects
    ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Product Launch Video', 'High-quality product demonstration video for new software release', 'completed', 45000, '2024-09-01', '2024-10-15', 100, NOW() - INTERVAL '4 months', NOW() - INTERVAL '2 months'),
    ('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Corporate Training Series', '10-part training video series for employee onboarding', 'in_progress', 60000, '2024-11-01', '2025-02-15', 65, NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 day'),
    ('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Social Media Campaign', 'Series of short promotional videos for social media platforms', 'planning', 20000, '2025-01-15', '2025-03-01', 15, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 day'),
    
    -- Creative Studios LLC projects
    ('b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Brand Documentary', '30-minute documentary showcasing company history and values', 'completed', 75000, '2024-07-01', '2024-09-30', 100, NOW() - INTERVAL '6 months', NOW() - INTERVAL '3 months'),
    ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Annual Report Video', 'Executive summary video for annual stakeholder meeting', 'completed', 35000, '2024-10-01', '2024-11-15', 100, NOW() - INTERVAL '3 months', NOW() - INTERVAL '1 month'),
    ('b3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Customer Testimonials', 'Collection of customer success story videos', 'in_progress', 50000, '2024-12-01', '2025-01-31', 75, NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 days'),
    ('b4444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Event Coverage', 'Full coverage of annual conference including keynotes and panels', 'in_review', 62500, '2024-11-15', '2024-12-30', 95, NOW() - INTERVAL '1 month', NOW() - INTERVAL '3 days'),
    ('b5555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Product Demo Reel', 'Comprehensive product demonstration for trade shows', 'planning', 40000, '2025-02-01', '2025-03-31', 10, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),
    
    -- Global Marketing Group projects
    ('c1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'TV Commercial Spot', '60-second television commercial for prime time slots', 'completed', 85000, '2024-08-01', '2024-10-01', 100, NOW() - INTERVAL '5 months', NOW() - INTERVAL '2 months'),
    ('c2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Website Hero Videos', 'Series of homepage hero videos for website redesign', 'in_progress', 30000, '2024-12-10', '2025-01-25', 45, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 hour'),
    
    -- StartUp Ventures projects
    ('d1111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Investor Pitch Deck Video', 'Compelling pitch video for Series A funding round', 'completed', 25000, '2024-06-01', '2024-07-15', 100, NOW() - INTERVAL '7 months', NOW() - INTERVAL '5 months'),
    ('d2222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'App Tutorial Videos', 'In-app tutorial video series for mobile application', 'completed', 42000, '2024-08-01', '2024-10-01', 100, NOW() - INTERVAL '5 months', NOW() - INTERVAL '2 months'),
    ('d3333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'Explainer Animation', '2-minute animated explainer video for landing page', 'in_progress', 38000, '2024-11-20', '2025-01-15', 80, NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '6 hours'),
    ('d4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'Team Introduction Video', 'Meet the team video for company about page', 'planning', 18000, '2025-01-10', '2025-02-20', 20, NOW() - INTERVAL '2 days', NOW() - INTERVAL '4 hours'),
    
    -- Enterprise Solutions projects
    ('e1111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Security Training Videos', 'Comprehensive cybersecurity training video series', 'in_progress', 55000, '2024-12-01', '2025-02-28', 35, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '3 hours'),
    
    -- Digital Media Co projects
    ('f1111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 'Podcast Video Series', 'Video versions of popular podcast episodes', 'completed', 65000, '2024-05-01', '2024-08-30', 100, NOW() - INTERVAL '9 months', NOW() - INTERVAL '4 months'),
    ('f2222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'Behind the Scenes Content', 'Documentary-style BTS content for social channels', 'in_progress', 48000, '2024-11-01', '2025-01-20', 70, NOW() - INTERVAL '6 weeks', NOW() - INTERVAL '12 hours'),
    ('f3333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', 'Live Event Streaming', 'Multi-camera live streaming setup for quarterly events', 'planning', 76000, '2025-03-01', '2025-03-15', 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- Add sample invoices
INSERT INTO invoices (id, invoice_number, project_id, client_id, issue_date, due_date, subtotal, tax, total, status, paid_at, created_at)
VALUES 
    -- Paid invoices
    ('inv11111-1111-1111-1111-111111111111', 'INV-2024-001', 'a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '2024-10-16', '2024-11-15', 45000, 3600, 48600, 'paid', '2024-11-10', NOW() - INTERVAL '2 months'),
    ('inv22222-2222-2222-2222-222222222222', 'INV-2024-002', 'b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '2024-10-01', '2024-10-31', 75000, 6000, 81000, 'paid', '2024-10-28', NOW() - INTERVAL '3 months'),
    ('inv33333-3333-3333-3333-333333333333', 'INV-2024-003', 'b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '2024-11-16', '2024-12-16', 35000, 2800, 37800, 'paid', '2024-12-10', NOW() - INTERVAL '1 month'),
    ('inv44444-4444-4444-4444-444444444444', 'INV-2024-004', 'c1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '2024-10-02', '2024-11-01', 85000, 6800, 91800, 'paid', '2024-10-30', NOW() - INTERVAL '2 months'),
    ('inv55555-5555-5555-5555-555555555555', 'INV-2024-005', 'd1111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '2024-07-16', '2024-08-15', 25000, 2000, 27000, 'paid', '2024-08-12', NOW() - INTERVAL '5 months'),
    ('inv66666-6666-6666-6666-666666666666', 'INV-2024-006', 'd2222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', '2024-10-02', '2024-11-01', 42000, 3360, 45360, 'paid', '2024-11-01', NOW() - INTERVAL '2 months'),
    ('inv77777-7777-7777-7777-777777777777', 'INV-2024-007', 'f1111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', '2024-09-01', '2024-09-30', 65000, 5200, 70200, 'paid', '2024-09-25', NOW() - INTERVAL '4 months'),
    
    -- Sent invoices (pending payment)
    ('inv88888-8888-8888-8888-888888888888', 'INV-2024-008', 'b3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2024-12-01', '2024-12-31', 50000, 4000, 54000, 'sent', NULL, NOW() - INTERVAL '2 weeks'),
    ('inv99999-9999-9999-9999-999999999999', 'INV-2024-009', 'c2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '2024-12-10', '2025-01-09', 30000, 2400, 32400, 'sent', NULL, NOW() - INTERVAL '5 days'),
    ('invAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'INV-2024-010', 'd3333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '2024-12-05', '2025-01-04', 38000, 3040, 41040, 'sent', NULL, NOW() - INTERVAL '10 days'),
    
    -- Draft invoices
    ('invBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', 'INV-2024-011', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '2024-12-15', '2025-01-14', 60000, 4800, 64800, 'draft', NULL, NOW() - INTERVAL '1 day'),
    ('invCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC', 'INV-2024-012', 'e1111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '2024-12-15', '2025-01-14', 55000, 4400, 59400, 'draft', NULL, NOW() - INTERVAL '1 day'),
    
    -- Overdue invoice
    ('invDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD', 'INV-2024-013', 'f2222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', '2024-11-01', '2024-12-01', 48000, 3840, 51840, 'overdue', NULL, NOW() - INTERVAL '6 weeks')
ON CONFLICT (id) DO NOTHING;

-- Add sample invoice items
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
VALUES 
    -- INV-2024-001 items
    ('inv11111-1111-1111-1111-111111111111', 'Pre-production planning and storyboarding', 1, 5000, 5000),
    ('inv11111-1111-1111-1111-111111111111', 'Video production (2 days)', 2, 8000, 16000),
    ('inv11111-1111-1111-1111-111111111111', 'Post-production and editing', 1, 15000, 15000),
    ('inv11111-1111-1111-1111-111111111111', 'Color grading and sound design', 1, 6000, 6000),
    ('inv11111-1111-1111-1111-111111111111', 'Revisions and final delivery', 1, 3000, 3000),
    
    -- INV-2024-008 items
    ('inv88888-8888-8888-8888-888888888888', 'Video interviews (5 customers)', 5, 3000, 15000),
    ('inv88888-8888-8888-8888-888888888888', 'Editing and post-production', 1, 20000, 20000),
    ('inv88888-8888-8888-8888-888888888888', 'Motion graphics and titles', 1, 10000, 10000),
    ('inv88888-8888-8888-8888-888888888888', 'Music licensing and sound mixing', 1, 5000, 5000)
ON CONFLICT DO NOTHING;

-- Add sample milestones
INSERT INTO milestones (id, project_id, title, description, due_date, status, completed_at, created_at)
VALUES 
    -- Completed project milestones
    ('m1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Script Approval', 'Final script approved by client', '2024-09-15', 'completed', '2024-09-14', NOW() - INTERVAL '4 months'),
    ('m2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Production Complete', 'All filming completed', '2024-09-30', 'completed', '2024-09-29', NOW() - INTERVAL '4 months'),
    
    -- Active project milestones
    ('m3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', 'Episodes 1-5 Delivered', 'First half of training series completed', '2024-12-20', 'completed', '2024-12-18', NOW() - INTERVAL '2 days'),
    ('m4444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222', 'Episodes 6-10 First Draft', 'Second half initial edit', '2025-01-15', 'in_progress', NULL, NOW() - INTERVAL '1 month'),
    ('m5555555-5555-5555-5555-555555555555', 'a2222222-2222-2222-2222-222222222222', 'Final Delivery', 'All episodes finalized and delivered', '2025-02-15', 'pending', NULL, NOW() - INTERVAL '1 month'),
    
    ('m6666666-6666-6666-6666-666666666666', 'b3333333-3333-3333-3333-333333333333', 'First 3 Testimonials', 'Initial customer interviews completed', '2024-12-15', 'completed', '2024-12-14', NOW() - INTERVAL '3 days'),
    ('m7777777-7777-7777-7777-777777777777', 'b3333333-3333-3333-3333-333333333333', 'Remaining Interviews', 'Complete all customer interviews', '2025-01-10', 'in_progress', NULL, NOW() - INTERVAL '2 weeks'),
    ('m8888888-8888-8888-8888-888888888888', 'b3333333-3333-3333-3333-333333333333', 'Final Edit Approval', 'Client approval of final cuts', '2025-01-31', 'pending', NULL, NOW() - INTERVAL '2 weeks'),
    
    ('m9999999-9999-9999-9999-999999999999', 'b4444444-4444-4444-4444-444444444444', 'Rough Cut Review', 'Initial edit for client review', '2024-12-10', 'completed', '2024-12-09', NOW() - INTERVAL '1 week'),
    ('mAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'b4444444-4444-4444-4444-444444444444', 'Final Delivery', 'Approved final version delivered', '2024-12-30', 'in_progress', NULL, NOW() - INTERVAL '1 month'),
    
    ('mBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', 'c2222222-2222-2222-2222-222222222222', 'Concept Approval', 'Creative concept approved', '2024-12-18', 'completed', '2024-12-17', NOW() - INTERVAL '2 days'),
    ('mCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC', 'c2222222-2222-2222-2222-222222222222', 'Production Day', 'All video footage captured', '2024-12-28', 'pending', NULL, NOW() - INTERVAL '5 days'),
    ('mDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD', 'c2222222-2222-2222-2222-222222222222', 'First Draft', 'Initial edit completed', '2025-01-10', 'pending', NULL, NOW() - INTERVAL '5 days'),
    ('mEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEE', 'c2222222-2222-2222-2222-222222222222', 'Final Delivery', 'Final approved videos delivered', '2025-01-25', 'pending', NULL, NOW() - INTERVAL '5 days'),
    
    ('mFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF', 'd3333333-3333-3333-3333-333333333333', 'Animation Storyboard', 'Storyboard approved by client', '2024-12-05', 'completed', '2024-12-04', NOW() - INTERVAL '2 weeks'),
    ('mGGGGGGG-GGGG-GGGG-GGGG-GGGGGGGGGGGG', 'd3333333-3333-3333-3333-333333333333', 'Animation First Pass', 'Initial animation completed', '2024-12-20', 'completed', '2024-12-19', NOW() - INTERVAL '1 day'),
    ('mHHHHHHH-HHHH-HHHH-HHHH-HHHHHHHHHHHH', 'd3333333-3333-3333-3333-333333333333', 'Final Animation', 'Final animation with revisions', '2025-01-10', 'in_progress', NULL, NOW() - INTERVAL '3 weeks'),
    ('mIIIIIII-IIII-IIII-IIII-IIIIIIIIIIII', 'd3333333-3333-3333-3333-333333333333', 'Sound Design & Delivery', 'Complete sound design and deliver', '2025-01-15', 'pending', NULL, NOW() - INTERVAL '3 weeks'),
    
    ('mJJJJJJJ-JJJJ-JJJJ-JJJJ-JJJJJJJJJJJJ', 'e1111111-1111-1111-1111-111111111111', 'Module 1-3 Complete', 'First three training modules done', '2024-12-20', 'in_progress', NULL, NOW() - INTERVAL '2 weeks'),
    ('mKKKKKKK-KKKK-KKKK-KKKK-KKKKKKKKKKKK', 'e1111111-1111-1111-1111-111111111111', 'Module 4-6 Complete', 'Middle training modules done', '2025-01-20', 'pending', NULL, NOW() - INTERVAL '2 weeks'),
    ('mLLLLLLL-LLLL-LLLL-LLLL-LLLLLLLLLLLL', 'e1111111-1111-1111-1111-111111111111', 'All Modules Delivered', 'Complete training series', '2025-02-28', 'pending', NULL, NOW() - INTERVAL '2 weeks'),
    
    ('mMMMMMMM-MMMM-MMMM-MMMM-MMMMMMMMMMMM', 'f2222222-2222-2222-2222-222222222222', 'First Episode Edit', 'Initial BTS episode completed', '2024-12-01', 'completed', '2024-11-30', NOW() - INTERVAL '2 weeks'),
    ('mNNNNNNN-NNNN-NNNN-NNNN-NNNNNNNNNNNN', 'f2222222-2222-2222-2222-222222222222', 'Episodes 2-4 Draft', 'Middle episodes rough cut', '2024-12-25', 'in_progress', NULL, NOW() - INTERVAL '6 weeks'),
    ('mOOOOOOO-OOOO-OOOO-OOOO-OOOOOOOOOOOO', 'f2222222-2222-2222-2222-222222222222', 'Final Series Delivery', 'All BTS episodes delivered', '2025-01-20', 'pending', NULL, NOW() - INTERVAL '6 weeks')
ON CONFLICT (id) DO NOTHING;

-- Update client total_projects and total_revenue based on actual data
UPDATE clients c
SET 
    total_projects = (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id),
    total_revenue = (SELECT COALESCE(SUM(i.total), 0) FROM invoices i WHERE i.client_id = c.id AND i.status = 'paid');
