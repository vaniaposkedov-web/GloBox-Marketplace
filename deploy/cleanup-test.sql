DELETE FROM mediator_profiles WHERE user_id IN (SELECT id FROM users WHERE email='testcheck@example.com');
DELETE FROM users WHERE email='testcheck@example.com';
