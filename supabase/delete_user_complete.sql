
-- Function to completely delete a user and all related data
-- Can be called with either email or user_id
CREATE OR REPLACE FUNCTION delete_user_complete(
    target_email TEXT DEFAULT NULL,
    target_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    user_to_delete UUID;
    deleted_count JSON;
BEGIN
    -- Find user by email or ID
    IF target_user_id IS NOT NULL THEN
        user_to_delete := target_user_id;
    ELSIF target_email IS NOT NULL THEN
        SELECT id INTO user_to_delete 
        FROM auth.users 
        WHERE email = target_email;
        
        IF user_to_delete IS NULL THEN
            SELECT id INTO user_to_delete 
            FROM public.profiles 
            WHERE email = target_email;
        END IF;
    ELSE
        RAISE EXCEPTION 'Either target_email or target_user_id must be provided';
    END IF;

    IF user_to_delete IS NULL THEN
        RAISE EXCEPTION 'No user found for the provided email or ID';
    END IF;

    -- Delete in proper order to respect foreign key constraints
    DELETE FROM public.card_transactions
    WHERE card_id IN (SELECT id FROM public.cards WHERE user_id = user_to_delete);
    
    DELETE FROM public.card_activity_log WHERE user_id = user_to_delete;
    DELETE FROM public.cards WHERE user_id = user_to_delete;
    DELETE FROM public.card_applications WHERE user_id = user_to_delete;
    
    DELETE FROM public.zelle_transactions
    WHERE sender_id = user_to_delete OR recipient_user_id = user_to_delete;
    DELETE FROM public.zelle_settings WHERE user_id = user_to_delete;
    DELETE FROM public.zelle_contacts WHERE user_id = user_to_delete;
    
    DELETE FROM public.loan_payments
    WHERE loan_id IN (SELECT id FROM public.loans WHERE user_id = user_to_delete);
    DELETE FROM public.loans WHERE user_id = user_to_delete;
    
    DELETE FROM public.transactions
    WHERE account_id IN (SELECT id FROM public.accounts WHERE user_id = user_to_delete);
    DELETE FROM public.accounts WHERE user_id = user_to_delete;
    
    DELETE FROM public.enrollments
    WHERE application_id IN (SELECT id FROM public.applications WHERE user_id = user_to_delete);
    DELETE FROM public.applications WHERE user_id = user_to_delete;
    
    DELETE FROM public.notifications WHERE user_id = user_to_delete;
    DELETE FROM public.audit_logs WHERE user_id = user_to_delete;
    DELETE FROM public.system_logs WHERE user_id = user_to_delete OR admin_id = user_to_delete;
    DELETE FROM public.beneficiaries WHERE user_id = user_to_delete;
    DELETE FROM public.staff WHERE id = user_to_delete;
    
    DELETE FROM public.plaid_accounts
    WHERE plaid_item_id IN (
        SELECT id FROM public.plaid_items WHERE user_id = user_to_delete
    );
    DELETE FROM public.plaid_items WHERE user_id = user_to_delete;
    
    DELETE FROM public.password_reset_otps 
    WHERE email = (SELECT email FROM auth.users WHERE id = user_to_delete);
    DELETE FROM public.email_queue WHERE user_id = user_to_delete;
    
    DELETE FROM public.profiles WHERE id = user_to_delete;

    RETURN json_build_object(
        'success', true,
        'user_id', user_to_delete,
        'message', 'User and all related data deleted successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
