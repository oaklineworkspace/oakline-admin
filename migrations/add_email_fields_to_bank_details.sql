-- Migration: Add 15 new email fields to bank_details table
-- Date: 2025-11-21
-- Purpose: Add email columns for accounts, alerts, billing, cards, compliance, customer support, disputes, fraud, help, no-reply, payments, transfers, checks, deposits, and transactions

ALTER TABLE public.bank_details
ADD COLUMN IF NOT EXISTS email_accounts text,
ADD COLUMN IF NOT EXISTS email_alerts text,
ADD COLUMN IF NOT EXISTS email_billing text,
ADD COLUMN IF NOT EXISTS email_cards text,
ADD COLUMN IF NOT EXISTS email_compliance text,
ADD COLUMN IF NOT EXISTS email_customersupport text,
ADD COLUMN IF NOT EXISTS email_disputes text,
ADD COLUMN IF NOT EXISTS email_fraud text,
ADD COLUMN IF NOT EXISTS email_help text,
ADD COLUMN IF NOT EXISTS email_noreply text,
ADD COLUMN IF NOT EXISTS email_payments text,
ADD COLUMN IF NOT EXISTS email_transfers text,
ADD COLUMN IF NOT EXISTS email_checks text,
ADD COLUMN IF NOT EXISTS email_deposits text,
ADD COLUMN IF NOT EXISTS email_transactions text;
