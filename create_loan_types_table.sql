-- SQL table for managing loan types and their configurations
-- This table stores loan type templates with default interest rates and requirements

CREATE TABLE IF NOT EXISTS public.loan_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  description text,
  default_interest_rate numeric NOT NULL CHECK (default_interest_rate >= 0 AND default_interest_rate <= 100),
  min_interest_rate numeric NOT NULL CHECK (min_interest_rate >= 0 AND min_interest_rate <= 100),
  max_interest_rate numeric NOT NULL CHECK (max_interest_rate >= 0 AND max_interest_rate <= 100),
  min_term_months integer NOT NULL CHECK (min_term_months > 0),
  max_term_months integer NOT NULL CHECK (max_term_months > 0),
  min_amount numeric NOT NULL CHECK (min_amount >= 0),
  max_amount numeric CHECK (max_amount >= min_amount),
  min_credit_score integer CHECK (min_credit_score >= 300 AND min_credit_score <= 850),
  required_documents text[],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT loan_types_pkey PRIMARY KEY (id),
  CONSTRAINT loan_types_rate_range CHECK (min_interest_rate <= default_interest_rate AND default_interest_rate <= max_interest_rate),
  CONSTRAINT loan_types_term_range CHECK (min_term_months <= max_term_months)
);

-- Insert default loan types
INSERT INTO public.loan_types (name, code, description, default_interest_rate, min_interest_rate, max_interest_rate, min_term_months, max_term_months, min_amount, max_amount, min_credit_score, required_documents, is_active) VALUES
('Personal Loan', 'personal', 'Unsecured personal loan for general purposes', 5.5, 3.5, 12.0, 12, 60, 1000, 50000, 580, ARRAY['ID verification', 'Proof of income'], true),
('Home Mortgage', 'mortgage', 'Secured loan for purchasing or refinancing a home', 3.2, 2.5, 6.5, 180, 360, 50000, 1000000, 620, ARRAY['ID verification', 'Proof of income', 'Property appraisal', 'Home insurance'], true),
('Auto Loan', 'auto', 'Secured loan for purchasing a vehicle', 4.5, 3.0, 9.0, 24, 72, 5000, 100000, 600, ARRAY['ID verification', 'Proof of income', 'Vehicle information'], true),
('Business Loan', 'business', 'Loan for business purposes and operations', 6.5, 4.5, 15.0, 12, 120, 5000, 500000, 650, ARRAY['ID verification', 'Business plan', 'Financial statements', 'Tax returns'], true),
('Student Loan', 'student', 'Educational loan for tuition and related expenses', 4.0, 2.5, 8.0, 60, 240, 1000, 100000, 550, ARRAY['ID verification', 'Enrollment verification', 'School information'], true),
('Home Equity Loan', 'home_equity', 'Secured loan based on home equity', 4.8, 3.5, 9.0, 60, 180, 10000, 250000, 640, ARRAY['ID verification', 'Proof of income', 'Property appraisal', 'Current mortgage statement'], true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_loan_types_code ON public.loan_types(code);
CREATE INDEX IF NOT EXISTS idx_loan_types_active ON public.loan_types(is_active);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_types TO authenticated;

-- Comment
COMMENT ON TABLE public.loan_types IS 'Stores loan type configurations including interest rates, terms, and requirements';
