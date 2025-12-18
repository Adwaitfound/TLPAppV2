-- Employee Time Tracking & Attendance
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    hours_worked DECIMAL(5,2),
    entry_type VARCHAR(20) DEFAULT 'work' CHECK (entry_type IN ('work', 'break', 'meeting', 'admin')),
    is_billable BOOLEAN DEFAULT true,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave Management
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('vacation', 'sick', 'personal', 'unpaid')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count DECIMAL(3,1) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave Balance
CREATE TABLE IF NOT EXISTS leave_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    vacation_days DECIMAL(4,1) DEFAULT 20,
    sick_days DECIMAL(4,1) DEFAULT 10,
    personal_days DECIMAL(4,1) DEFAULT 5,
    used_vacation DECIMAL(4,1) DEFAULT 0,
    used_sick DECIMAL(4,1) DEFAULT 0,
    used_personal DECIMAL(4,1) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year)
);

-- Employee Tasks
CREATE TABLE IF NOT EXISTS employee_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'completed', 'cancelled')),
    due_date DATE,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salary Records (optional, for future use)
CREATE TABLE IF NOT EXISTS salary_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    base_salary DECIMAL(10,2) NOT NULL,
    bonus DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    net_salary DECIMAL(10,2) NOT NULL,
    payment_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_user_status ON employee_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_due_date ON employee_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_salary_records_user_year_month ON salary_records(user_id, year DESC, month DESC);

-- RLS Policies
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;

-- Time Entries Policies
CREATE POLICY "Users can view own time entries" ON time_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own time entries" ON time_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own draft time entries" ON time_entries
    FOR UPDATE USING (auth.uid() = user_id AND status = 'draft');

CREATE POLICY "Admins can view all time entries" ON time_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all time entries" ON time_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Leave Requests Policies
CREATE POLICY "Users can view own leave requests" ON leave_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leave requests" ON leave_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending leave requests" ON leave_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all leave requests" ON leave_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all leave requests" ON leave_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Leave Balance Policies
CREATE POLICY "Users can view own leave balance" ON leave_balance
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all leave balances" ON leave_balance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Employee Tasks Policies
CREATE POLICY "Users can manage own tasks" ON employee_tasks
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tasks" ON employee_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Salary Records Policies
CREATE POLICY "Users can view own salary records" ON salary_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all salary records" ON salary_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_employee_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_time_entries_updated_at
    BEFORE UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_features_updated_at();

CREATE TRIGGER update_leave_requests_updated_at
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_features_updated_at();

CREATE TRIGGER update_leave_balance_updated_at
    BEFORE UPDATE ON leave_balance
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_features_updated_at();

CREATE TRIGGER update_employee_tasks_updated_at
    BEFORE UPDATE ON employee_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_features_updated_at();

CREATE TRIGGER update_salary_records_updated_at
    BEFORE UPDATE ON salary_records
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_features_updated_at();
