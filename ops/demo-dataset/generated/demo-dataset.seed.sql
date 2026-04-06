-- Generated demo dataset seed SQL for FaithCounseling

-- Reference date: 2026-04-06T00:00:00.000Z

INSERT INTO tenants (id, name, plan_type)
     VALUES ('system', 'Grace Counseling Center', 'standard')
     ON DUPLICATE KEY UPDATE name = VALUES(name), plan_type = VALUES(plan_type);

INSERT INTO practices (id, tenant_id, name, practice_type, timezone)
     VALUES ('prac-001', 'system', 'Grace Counseling Center', 'solo', 'America/New_York')
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       practice_type = VALUES(practice_type),
       timezone = VALUES(timezone);

INSERT INTO locations (id, tenant_id, practice_id, name, address_enc, capacity, remote_enabled)
     VALUES ('loc-main-office', 'system', 'prac-001', 'Main Office', '5Rr8GEE8y77BzWNF:E6aAoVcNb1HNNH3kDJWTRg==:oj7shCxm0nhApTFTrDI0mi8oHqekKqwKtiwe76iaVdST5X1YhA==', 4, 1)
     ON DUPLICATE KEY UPDATE
       practice_id = VALUES(practice_id),
       name = VALUES(name),
       address_enc = VALUES(address_enc),
       capacity = VALUES(capacity),
       remote_enabled = VALUES(remote_enabled);

INSERT INTO staff_members
         (id, tenant_id, role, first_name_enc, last_name_enc, license_type, license_number_enc, supervision_status, bio_enc)
       VALUES ('staff-001', 'system', 'practice_admin', 'Dcr3qaDsczHxMXv7:uDxgxchhzuwK5RnC8K9kSg==:Y9tFUFA=', 'sp8bByxS5vI3+GLX:O0FR/hDRX0kbmLF0m8Yp3g==:Afz90A==', 'lpc', 'g+gd2OaCqiUlGIlb:lskc4zfyK66Fo1Fz6RpWnw==:zq0QbdHY7Vnu', 'not_required', 'xjNTiR2txgMcOyII:SIeYRmJ72e4FYOH5Q9EDVg==:a/N09iuC730S71ruBz8H6yCmQjbr2tXLQUllmKa0ZcAP8bHP8Xqx0kHQc7usacKjyDfTf8M/wnVjs3rWUwiz03U=');

INSERT INTO staff_accounts
         (id, staff_member_id, tenant_id, email, email_enc, email_lookup_hash, password_hash, failed_attempts, locked_until, mfa_enabled)
       VALUES ('acct-001', 'staff-001', 'system', NULL, 'kVkkX/E/hNz46VES:nFmVG1//ioVSfQXYcDVXfw==:DstoTF/fcbS/eyn71wxC94HI7rK0vYGdgMYB', 'bb44653236d8c2f76880f420e1b80e5e0c7805786c1719610ae7be396f2c3a85', '$argon2id$v=19$m=65536,t=3,p=1$l0s1sDqA9QgHKIBZ/cwnRw$cNuH9D/7kKClHaWLfzBPAYo8pz+kz2SBHjNrbCLAmn8', 0, NULL, 0);

INSERT INTO staff_members
         (id, tenant_id, role, first_name_enc, last_name_enc, license_type, license_number_enc, supervision_status, bio_enc)
       VALUES ('staff-counselor-ricardo', 'system', 'counselor', 'Tw4xShI96YzXAXFn:RbymIPbqo1ptHKzaqcji+w==:ZRO6rWM8Aw==', 'gm3m7N2ykEOcSn+H:9ua6mtsDnPx3k02wZpR3hA==:LkB5yCk=', 'lpc', 'mwlLQ2nPS7koWPsQ:RwPtQJ9rU5nhTweMjZdqVg==:ceYHdS50W7OCrRw=', 'not_required', 'hcMlP2HpgiFUmjSe:5LMLp/05QVE7Q0GL1znz2Q==:7y5+pJabwf7u1mVGao+Qy9ixzgVzGDeTx4cqRk5S+JhnpwkcosR6hmX3LNK+CMjCpCIkaxD2I8Hf7V46/kMKLYy+4SzqffE0Lagj7pmXl/kR');

INSERT INTO staff_accounts
         (id, staff_member_id, tenant_id, email, email_enc, email_lookup_hash, password_hash, failed_attempts, locked_until, mfa_enabled)
       VALUES ('acct-counselor-ricardo', 'staff-counselor-ricardo', 'system', NULL, 'k6pN/ev3Gjy7P9X+:6bWtuLUW4kjxAFNSzNMIuQ==:G5sS/oH0/LSIn58y4Ym1m+zJfq3wt01ONHSDIuRwMXFWFrA=', '98fd869940998a4b269a0d6fb22091d0d123fea8d241e41f2d8b5d9c8a1684e8', '$argon2id$v=19$m=65536,t=3,p=1$XTXUNs7xgsgvXyygn0mQSA$vY+L+/oawa60oLWT0Fbetn8Qmzj9fXhaR/fRFOYRwA4', 0, NULL, 0);

INSERT INTO staff_licenses
         (id, staff_id, tenant_id, license_type, license_number_enc, issuing_state, issuing_body, issue_date, expiry_date, status, is_primary)
       VALUES ('lic-staff-counselor-ricardo', 'staff-counselor-ricardo', 'system', 'lpc', 'G7SalPqOP/etPUlg:ObOJ7eWhCAvDt4Z0lZ6BwQ==:asD+Gt00VCT3FyE=', 'Florida', 'Florida Board', '2019-01-15', '2027-12-31', 'active', 1);

INSERT INTO staff_certifications
         (id, staff_id, tenant_id, cert_name, issuing_body, issue_date, expiry_date, cert_number_enc, ceu_hours, is_ceu, notes_enc)
       VALUES ('cert-staff-counselor-ricardo', 'staff-counselor-ricardo', 'system', 'Trauma-Informed Care Certification', 'Faith Counseling Institute', '2024-03-01', '2027-03-01', 'DclZdS8JEmYLKD54:1jyYsn1rgIn32/x5NIaUEQ==:WhatH6DrK7ibJvOzhehPWS8B0qiPdbvcslC+Hg==', 12, 1, 'HKTsjV4slLDHKUWt:P+VSMIjgd2uDk2NznbdI+g==:s2R8O4+yDGNmZF07JBdd0ISyT6+Pu4czwQANDcxXqa4cf4gzPQgB');

INSERT INTO staff_specialty_profiles
         (id, staff_id, tenant_id, specialties, modalities, age_groups_served, languages, max_caseload, notes_enc)
       VALUES ('spec-staff-counselor-ricardo', 'staff-counselor-ricardo', 'system', '[\"anxiety\",\"depression\",\"marriage_couples\",\"spiritual_formation\",\"family\"]', '[\"cbt\",\"solution_focused\",\"biblical_integration\"]', '[\"young_adults\",\"adults\",\"couples\",\"families\"]', '[\"English\",\"Spanish\"]', 24, 'uUw0hgZqqjlgVxxL:mn7llj64yeCCwH5eYVTO3g==:WM7UGIEZDX+yaZrMCT+EuDuUFb9xQoGhyfRSCUQPcP4iHkGzXX5FX6iH');

INSERT INTO staff_employment
         (id, staff_id, tenant_id, employment_type, employment_status, hire_date, npi_number_enc, malpractice_insurer, malpractice_policy_enc, malpractice_expiry, direct_phone_enc, location_ids)
       VALUES ('emp-staff-counselor-ricardo', 'staff-counselor-ricardo', 'system', 'full_time', 'active', '2021-06-01', 'nKJJVfCgnt5CeNOZ:YkD8Y0sMqwdIibHvGP/HTw==:uzDFBET2EnuY+gI36qo2nrn2YA/RPOaejoYI', 'Shepherd Mutual', 'RyeFk0GEa1IR1Pjc:eGYlKIngYieYyUb9fM2yoQ==:D15WdAW8aOK6NL4XCuiqlYCRbwVDqWH74BD9bQNZ', '2027-06-30', 'TfUBxwKm/+EoqqPg:N+vV4rgEMZZ8QsZSJBFWFA==:bOwLQShVu/iLFk0s', '[\"loc-main-office\"]');

INSERT INTO staff_faith_profiles
         (id, staff_id, tenant_id, faith_tradition, theological_approach_enc, ordained, ordaining_body, aacc_member, acbc_certified, ccca_member, other_faith_credentials_enc, prayer_integration, scripture_integration, spiritual_gifts_enc)
       VALUES ('faith-staff-counselor-ricardo', 'staff-counselor-ricardo', 'system', 'evangelical', 'wQYTOeQUfCJ3Hsn7:xOYUjFYfTu+NCj3oDtJb+A==:xNHfOHBdAY6m2mSWIQRH5GWAmyNB0bZ/oSQhMSPhxnyzrfscB+ZTwh4AF8gs5ZA6fefNcMEk8fbAlQ==', 1, 'Grace Ministry Network', 1, 0, 1, 'mtnkj25UisA7M683:1XfxOO0rjQO8Alm3SgVdAg==:gj60j1yye63B7M3OW0fN5Q0fIct9NE2SUACLiiQuNz2QLcBTuTnq7cZUSaFqAwTdKo2KZiw=', 'on_request', 'always_offered', 'Fv+JzTe9LgcAqyW/:OY+X+4PEPu+KU5xp9d8pAA==:CmDAxVemAjm2/ZMHimdLpszol+cgUwm0RfdsD6ryVfLzP1jl45m9');

INSERT INTO availability_templates
         (id, staff_id, tenant_id, slots)
       VALUES ('avail-staff-counselor-ricardo', 'staff-counselor-ricardo', 'system', '[{\"dayOfWeek\":1,\"startTime\":\"09:00\",\"endTime\":\"17:00\",\"locationId\":\"loc-main-office\",\"remoteAvailable\":true},{\"dayOfWeek\":3,\"startTime\":\"09:00\",\"endTime\":\"17:00\",\"locationId\":\"loc-main-office\",\"remoteAvailable\":true},{\"dayOfWeek\":4,\"startTime\":\"10:00\",\"endTime\":\"18:00\",\"locationId\":\"loc-main-office\",\"remoteAvailable\":true}]');

INSERT INTO staff_members
         (id, tenant_id, role, first_name_enc, last_name_enc, license_type, license_number_enc, supervision_status, bio_enc)
       VALUES ('staff-counselor-mercy', 'system', 'counselor', 'UmK8h6+75LXc1GmZ:JnAIZ+mxRBdv9q7a9s+vkA==:Uuw0onQ=', 'XRyG3hqIsRrPanS4:q+CTlPv9rNorVkebIwOrsA==:brPXcEjt', 'lmft', 'IpGYlinSKbjqu4X4:uphXu/AH4cF2Co0UYf4OQg==:GkdBgG2Bxl4DE9wK', 'not_required', '2wp8ws4vPORu3vNZ:7zaE0OqazqJsRoo01BpbUQ==:MshgQ64b6SZqGQUx3mG+6GjX7US+uZBMuqA9vMll8i+GuVdAXSLSxXUmRI8vZcGRyiiziAVZ3L4E+ZvRh40UqSbvJ//XuCbANALJ3VMoxzp6T5evL8GUCEjtchY=');

INSERT INTO staff_accounts
         (id, staff_member_id, tenant_id, email, email_enc, email_lookup_hash, password_hash, failed_attempts, locked_until, mfa_enabled)
       VALUES ('acct-counselor-mercy', 'staff-counselor-mercy', 'system', NULL, 'T/2LWAoNtPCxwETU:qDnz6Qpw01XVgk425lvM1w==:yA+KeG8H861aocrVGhDvmVzT34ux5a/BneArjdf/4hKBbg==', 'e45e049b1cfb3e020208037e912773255cdf1da2d579ea338f1a9f39adc8704d', '$argon2id$v=19$m=65536,t=3,p=1$XTXUNs7xgsgvXyygn0mQSA$vY+L+/oawa60oLWT0Fbetn8Qmzj9fXhaR/fRFOYRwA4', 0, NULL, 0);

INSERT INTO staff_licenses
         (id, staff_id, tenant_id, license_type, license_number_enc, issuing_state, issuing_body, issue_date, expiry_date, status, is_primary)
       VALUES ('lic-staff-counselor-mercy', 'staff-counselor-mercy', 'system', 'lmft', 'Y/NFR3UO/x3F2/+N:EDUIWNxihLtZkT5RmUkLwg==:7+m1V+6VnC+OnAQn', 'Florida', 'Florida Board', '2019-01-15', '2027-12-31', 'active', 1);

INSERT INTO staff_certifications
         (id, staff_id, tenant_id, cert_name, issuing_body, issue_date, expiry_date, cert_number_enc, ceu_hours, is_ceu, notes_enc)
       VALUES ('cert-staff-counselor-mercy', 'staff-counselor-mercy', 'system', 'Trauma-Informed Care Certification', 'Faith Counseling Institute', '2024-03-01', '2027-03-01', 'HSAGAsrhiyQ0364v:4u3ekP8qrx8RMJNoGFBZsw==:34BiqEz1yUo7V0KpZw+4kqRR7jGLghBjhnk=', 12, 1, 'IZ/UyAG00QuZUKPI:NzT5BCWoCll6tyoJlpd0TA==:rZ8CwuAX46+WQIPI+iog7Z61s6qkenREQ0M/y2TqKZCU0dKeOOXC');

INSERT INTO staff_specialty_profiles
         (id, staff_id, tenant_id, specialties, modalities, age_groups_served, languages, max_caseload, notes_enc)
       VALUES ('spec-staff-counselor-mercy', 'staff-counselor-mercy', 'system', '[\"trauma\",\"grief\",\"family\",\"adolescents\",\"womens_issues\"]', '[\"eft\",\"narrative\",\"mindfulness\",\"biblical_integration\"]', '[\"adolescents\",\"young_adults\",\"adults\",\"families\"]', '[\"English\",\"Spanish\"]', 24, 'itBSR5SRCEPQL8gT:AydMhTKbXpeAY2zXkh7PLw==:wUxJaoXvSij9249+SAgLdRB1DSG4lzut7CIotnqvVkTjDK5+Qej09mR6');

INSERT INTO staff_employment
         (id, staff_id, tenant_id, employment_type, employment_status, hire_date, npi_number_enc, malpractice_insurer, malpractice_policy_enc, malpractice_expiry, direct_phone_enc, location_ids)
       VALUES ('emp-staff-counselor-mercy', 'staff-counselor-mercy', 'system', 'full_time', 'active', '2021-06-01', 'qMg82AWgDXmsr4Xt:l8LS9Nvs9L4rcZ/XOdeoIA==:1PhsK25bNYYV5lSuEkyiMeUCcKOyjdEWaA==', 'Shepherd Mutual', 'BSzg0YxJXEgl3D3U:CWU3dq29+D3kl2uE+sRB0g==:dQyo8EvmnjP6IMVvr4fPeV9G8Sqn/H6//sNoXQ==', '2027-06-30', '4j361PFOTESxHEre:hn1MmfKLFRDZdwpxjY6ofQ==:27a3DzJXJywuWdtk', '[\"loc-main-office\"]');

INSERT INTO staff_faith_profiles
         (id, staff_id, tenant_id, faith_tradition, theological_approach_enc, ordained, ordaining_body, aacc_member, acbc_certified, ccca_member, other_faith_credentials_enc, prayer_integration, scripture_integration, spiritual_gifts_enc)
       VALUES ('faith-staff-counselor-mercy', 'staff-counselor-mercy', 'system', 'non_denominational', 'HJNVO7KW/BLi+Q8T:Gs0YaWE1OdyP0+BNm7xbwg==:gHClSyDzX+A0R7w+tr0kWcEiJ1oJEJkRxA2p/W0j37/uN+Jq0Cw4rd7SGf7APCED2aFtq+akpDHdYnZWpAmtr88AL+d1zhp9lqk=', 1, 'Mercy Fellowship Network', 1, 0, 1, 'CCMk07EiTQvGTKs/:B7u4mVDZ50KI6f8spLWX8Q==:YWPm6smYECX82MvUZIhb/c+QwblatWlf0lHu6LFXhLcHi0tbmDq21dF/Ma5uoLy2uElpulg=', 'on_request', 'on_request', 'YAEATu+pqxHLpMF7:v5kdEfSZ7hxEkspNaHIFJg==:TOV0NsIUegpMk9t+ZNcQaRuMtjf+xCKOr74+jfxkQM7ITABVit6g');

INSERT INTO availability_templates
         (id, staff_id, tenant_id, slots)
       VALUES ('avail-staff-counselor-mercy', 'staff-counselor-mercy', 'system', '[{\"dayOfWeek\":1,\"startTime\":\"09:00\",\"endTime\":\"17:00\",\"locationId\":\"loc-main-office\",\"remoteAvailable\":true},{\"dayOfWeek\":3,\"startTime\":\"09:00\",\"endTime\":\"17:00\",\"locationId\":\"loc-main-office\",\"remoteAvailable\":true},{\"dayOfWeek\":4,\"startTime\":\"10:00\",\"endTime\":\"18:00\",\"locationId\":\"loc-main-office\",\"remoteAvailable\":true}]');

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-001', 'system', 'ShortIntakeForm', 'Short Intake Form', 'intake', 1, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-002', 'system', 'LongIntakeForm', 'Long Intake Form', 'intake', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-003', 'system', 'InformedConsentForm', 'Informed Consent Form', 'administrative', 1, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-004', 'system', 'TelehealthConsentForm', 'Telehealth Consent Form', 'administrative', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-005', 'system', 'ReleaseOfInformationAuthorization', 'Release of Information Authorization', 'administrative', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-006', 'system', 'BiopsychosocialAssessment', 'Biopsychosocial Assessment', 'assessment', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-007', 'system', 'MentalStatusExam', 'Mental Status Exam', 'assessment', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-008', 'system', 'SafetyPlanTemplate', 'Safety Plan Template', 'clinical', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-009', 'system', 'MoodDisorderQuestionnaire', 'Mood Disorder Questionnaire', 'assessment', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-010', 'system', 'EatingDisorderScreening', 'Eating Disorder Screening', 'assessment', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-011', 'system', 'AngerAssessmentScale', 'Anger Assessment Scale', 'assessment', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-012', 'system', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 'anxiety', 1, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-013', 'system', 'SelfHarmAssessment', 'Self-Harm Safety Assessment', 'clinical', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-014', 'system', 'PHQ9', 'PHQ-9 Depression Screener', 'depression', 1, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-015', 'system', 'BeckAnxietyInventory', 'Beck Anxiety Inventory', 'anxiety', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-016', 'system', 'PCL5', 'PCL-5 PTSD Checklist', 'trauma', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-017', 'system', 'RosenbergSelfEsteem', 'Rosenberg Self-Esteem Scale', 'self', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-018', 'system', 'ASRSv1', 'ASRS v1.1 Adult ADHD Screener', 'adhd', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-019', 'system', 'OCIRevised', 'OCI-R OCD Inventory', 'anxiety', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-020', 'system', 'AUDIT', 'AUDIT Alcohol Use Screening', 'substance', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-021', 'system', 'DASS21', 'DASS-21 Distress Scale', 'depression', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-022', 'system', 'ACEQuestionnaire', 'ACE Questionnaire', 'trauma', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-023', 'system', 'InsomniaSeverityIndex', 'Insomnia Severity Index', 'sleep', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-024', 'system', 'CouplesAssessment', 'Couples Assessment', 'relationship', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-025', 'system', 'GriefAssessment', 'Grief Assessment', 'grief', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-026', 'system', 'BurnoutAssessment', 'Burnout Assessment', 'burnout', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-027', 'system', 'IndividualTreatmentPlan', 'Individual Treatment Plan', 'treatment', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-028', 'system', 'SMARTGoalsWorksheet', 'SMART Goals Worksheet', 'treatment', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-029', 'system', 'RelapsePreventionPlan', 'Relapse Prevention Plan', 'treatment', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-030', 'system', 'CBTThoughtRecord', 'CBT Thought Record', 'worksheets', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-031', 'system', 'CognitiveDistortionsWorksheet', 'Cognitive Distortions Worksheet', 'worksheets', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-032', 'system', 'BehavioralActivationSchedule', 'Behavioral Activation Schedule', 'worksheets', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-033', 'system', 'CopingSkillsPlan', 'Coping Skills Plan', 'worksheets', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-034', 'system', 'GroundingTechniquesWorksheet', 'Grounding Techniques Worksheet', 'worksheets', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-035', 'system', 'MindfulnessPracticeLog', 'Mindfulness Practice Log', 'worksheets', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-036', 'system', 'SpiritualWellnessInventory', 'Spiritual Wellness Inventory', 'faith', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-037', 'system', 'FaithHistoryQuestionnaire', 'Faith History Questionnaire', 'faith', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-038', 'system', 'ValuesAndBiblicalIdentityWorksheet', 'Values and Biblical Identity Worksheet', 'faith', 0, 1, 1);

INSERT INTO form_catalog
         (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
       VALUES ('fc-system-039', 'system', 'FamilySystemsAssessment', 'Family Systems Assessment', 'family', 0, 1, 1);

INSERT INTO portal_settings
       (id, tenant_id, practice_name, logo_url, brand_color, accent_color, welcome_headline, welcome_message, help_message,
        support_email_enc, registration_mode, allow_create_account, allow_care_requests, allow_scheduling_requests,
        show_public_counselor_directory, financial_mode, suggested_offering_cents, offering_ministry_note, contact_preference_options, default_signup_form_keys)
     VALUES ('portal-settings-system', 'system', 'Grace Counseling Center', '', '#1f7a8c', '#f0f7f8', 'Welcome back to Grace Counseling', 'This human-testing dataset is reset after every verified fix so the practice stays predictable for walkthroughs.', 'Use the portal to review forms, upcoming care tasks, and offerings history.', 'xugPnFcFXL3AoTl+:uVeKxV103XifM+Q5UgIeKw==:9Ck0/kk6G1mctH5Kwr2ubM1cK9VO2/VSxM0d0bM=', 'review_required', 1, 1, 1, 1, 'offerings', 5000, 'Your gift helps sustain this counseling ministry and expand care for others.', '[\"email\",\"phone\",\"portal_message\"]', '[\"ShortIntakeForm\",\"InformedConsentForm\",\"AnxietyAssessment\",\"PHQ9\"]');

INSERT INTO portal_resources
         (id, tenant_id, title, content, resource_type, audience, published_at)
       VALUES ('portal-resource-001', 'system', 'Breath Prayer Starter Guide', 'A short guided breath prayer routine to practice between sessions.', 'devotional', 'client', '2026-04-06 00:00:00');

INSERT INTO portal_resources
         (id, tenant_id, title, content, resource_type, audience, published_at)
       VALUES ('portal-resource-002', 'system', 'Grounding Steps for Difficult Days', 'A one-page grounding sequence counselors can review with clients during follow-up care.', 'education', 'client', '2026-04-06 00:00:00');

INSERT INTO service_codes
         (id, tenant_id, code, name, category, default_duration_minutes, status)
       VALUES ('svc-001', 'system', '90837', 'Individual Psychotherapy 60 min', 'therapy', 60, 'active');

INSERT INTO service_codes
         (id, tenant_id, code, name, category, default_duration_minutes, status)
       VALUES ('svc-002', 'system', '90847', 'Family Psychotherapy with Client', 'therapy', 60, 'active');

INSERT INTO fee_schedules
         (id, tenant_id, name, status, currency, schedule_lines)
       VALUES ('fee-001', 'system', 'Standard Self-Pay', 'active', 'USD', '[{\"serviceCodeId\":\"svc-001\",\"amount\":150},{\"serviceCodeId\":\"svc-002\",\"amount\":185}]');

INSERT INTO clients
       (id, tenant_id, first_name_enc, last_name_enc, status, faith_background, high_touchpoint, primary_counselor_id)
     VALUES ('client-001', 'system', 'vKu/Nm/ClY3JhDjJ:PflF5K2mtoRecAQEm5UtTw==:GUWVk8w=', '6bbXdLp+SdLg9e2Z:1vk1vhLEwDQXMWvWID4UBw==:Z+Vr9lclxiA=', 'active', 'Evangelical', 1, 'staff-counselor-ricardo');

INSERT INTO client_lifecycles
       (id, client_id, tenant_id, case_status, referral_source, emergency_contact_enc, discharge_record)
     VALUES ('life-client-001', 'client-001', 'system', 'active', 'Pastor referral', 'GGu0ZQB8JXe3azNg:3yy5CkDmYItm4IFRpPQEPg==:z28KiTt3WRcOOKDti8WWo+8w1odz4MeBhPh6S2oBkCS99jmyqiJfXlxqsEclxWBTvNcq/LVs/r/3qzC2Sb86L0+SSYuhIEa0/w==', '{\"readiness\":\"stable\",\"demoDataset\":true}');

INSERT INTO client_addresses
       (id, tenant_id, client_id, addr_type, line1_enc, line2_enc, city_enc, state, postal_enc, country, is_preferred)
     VALUES ('addr-client-001', 'system', 'client-001', 'primary', '1+dmzZb57a3fZJZi:eq9YpXZJ/YF2laH4/tgzwA==:bzr6o8n3IVMy0+t07w==', NULL, 'XTaJQSlqlSa9T+45:5YkbhzyAdijSxMFfcCXyNA==:N/nRbYiKQGw=', 'FL', 'VXkps9tgpu6x1e9Y:39aueP+rQmoKli8Vj/0o3g==:xB9rhCI=', 'US', 1);

INSERT INTO client_phones
       (id, tenant_id, client_id, phone_type, number_enc, extension, is_preferred, ok_to_text, ok_to_leave_msg)
     VALUES ('phone-client-001', 'system', 'client-001', 'cell', 'D9uyEs9JZYu+GqNX:xcEMvXwIHpto10y6GO24wA==:2lBcP2IK8lZtSCi5', NULL, 1, 1, 1);

INSERT INTO client_contacts
       (id, tenant_id, client_id, contact_type, name_enc, relationship, phone_enc, email_enc, is_primary, has_legal_auth, notes_enc)
     VALUES ('contact-client-001', 'system', 'client-001', 'emergency', 'kVbAELgDEXSGmmp/:8ykabk7EU2OYtx7MC5ULVg==:UPXroUqUGPSuZYqQcRL8', 'spouse', 'oUx67OK66lw0DQcT:O6ml0SlGMavPIyMmnIAiSw==:dcSRa7lysvTvDPlx', 'O7yVmxc07XrXKiZA:789NcgcK94Yi8mJ6FLFcqw==:CrY6MhSPmG1zHKHZnM0X1c9IyhI0VrgccFI=', 1, 0, 'o7M3kp/9VQEwE7qs:j+T7l+d7cGW+jzpu0nFLNQ==:ZaV00VN2m+n0mysRzwor54IklJLkvBYlTBXPSUZ/h92QCIKWGlgg4VK5bVaxVdLD');

INSERT INTO client_insurance
       (id, tenant_id, client_id, coverage_order, carrier_name_enc, plan_name, member_id_enc, group_number_enc,
        subscriber_name_enc, subscriber_dob_enc, subscriber_rel, auth_number_enc, auth_visits_approved, auth_expires_on,
        referral_number_enc, copay_cents, effective_from, effective_to, is_active, verified_on, verified_by)
     VALUES ('ins-client-001', 'system', 'client-001', 'primary', 'Aa68FLwqRwh0t0Uu:EUB9zVvZpxnnalHiP2SYrQ==:YZ0wLL0ZsuCGvGrtsimBcElhikY=', 'Silver Choice', 'PEGKE9xw2iVdb74H:9x5pg7E55STRDvCsa7Qq7w==:mk7qdsZS1PRVK1cM7mPSaLk=', 'SONCzreoPpWESIHS:UvW71r2k40qcLoMrdnsOBA==:dwEVpdeVgSezONmwbQNnJg==', 'Se8emtnjjfD1tmsx:VxrBsNK21mhkBMP82+A9hw==:Kwzhe4aQRS8hG4mRhdM=', 'g2DxiDJh0p4PYGcK:nZ+gm6R7uO4lwivNpHMFpg==:bLZS8V3RX46lvQ==', 'self', 'USAo0KkhCAD4TAh/:qNa5Fr5YS9gkFGDtwdXxnw==:LvRH+x7q7isFhm5+LSaj', 12, '2026-12-31', 'x8b/LBdCQkJhqZuT:Rd9oRMS4YWliBrznBetsYw==:3AOJpNalZppyDb58sR0=', 2500, '2026-01-01', '2026-12-31', 1, '2026-03-07', 'demo-finalizer');

INSERT INTO client_referring_providers
       (id, tenant_id, client_id, provider_name_enc, practice_name, npi, phone_enc, fax_enc, address_enc, referral_date, referral_notes_enc)
     VALUES ('refprov-client-001', 'system', 'client-001', 'WUvcgl6UjE27XrBz:Si5dpzQZzMcpZkUTpCBy6w==:OfC69BECaJzYUSgWMvg9', 'Grace Family Medicine', 'NPI0000000', 'qoa+sZHNBjmUWPjG:3nSklXzlFuqQzTpgwameWw==:lRzVwl0AayBY+M7o', 'nfqYLYwd+7vUpNDH:IIycnjm81r2dTcHYK3H/KQ==:GiSQepAKoEY3UFEW', 'jICwYaDVeCZa3nsI:tpXiFhfzgvwzuNBo2wHhIg==:PsdTcEC4wnffNEOm04k1Ut9KMD738JVG2qUC6GZU029KP0QZYrx4Tg/zOdXi6ethyLKpPlUjYkXF6PJy6RSMSyVJ4ohVsB93t+VpKakT/C+bZIZIMKQ7Nw==', '2026-03-07', 'z3h1d3Mb1uZ35aHJ:7b5wT8BeIJWmef3teLDsGg==:SGrdpnDcEs/HxTzpMvIWTJGbqIKl+tqveMFgkfU2uD3i41Fmh7Dq30rP8bX6u5j+hzTezUefJVPX70rkNQf+8w==');

INSERT INTO client_diagnoses
       (id, tenant_id, client_id, code_system, code, description_enc, onset_date, status, is_primary, notes_enc, diagnosed_by)
     VALUES ('diag-client-001', 'system', 'client-001', 'DSM-5', 'F41.1', '+s7Gy2BzKPJTkMDR:0aYuzJqQQ+BOfJOQLQ+nLw==:H3PmJw5j3cF+WvKCjv3ZSf8uddND1cIq0ql3dQ==', '2026-03-07', 'active', 1, 'TEYCEr6wP8zKg4ve:nWCVL4XCLThL1aLvZditOQ==:GAPI4lAcsEeEZ9kFPhOHqW0djr8qEQzg76D17KElYWe14uZmWSeK8cIF2NicJlNBkZddCCMv', 'staff-counselor-ricardo');

INSERT INTO client_medications
       (id, tenant_id, client_id, med_name_enc, dose_enc, frequency_enc, route, prescriber_enc, start_date, end_date, is_active, reason_enc, notes_enc)
     VALUES ('med-client-001', 'system', 'client-001', 'Lzryn3XEqlIHeBxO:X3v5B5wNM89D0x+N8Awg6A==:7Z51Fl/0zAQj3w==', 'VCvwLEDRjm3qeI96:6iYexH4JdHhtZEHB2ajDyg==:MVLvvbc=', '8MPNgAviNEOvlaEw:OxRwdZ7cAFfpRNsup0b8bg==:P18sacU=', 'oral', 'XL3eNHnwleQM3Flc:PjyFm6oq63zbJffkHoGwVQ==:HLyAsnex1zN/ZEkb/gAh', '2026-03-07', NULL, 1, 'Nenlbkz5vOzhEZkW:s/cJZryQW5sHXU34M1dt7g==:Rn2feGb8AnHPWv+VN0f9', 'rm1W/EGeRXDRLOG1:2F37NH/t8131O0AHA9T+Bg==:GBy3bWr4VUUprobEKKHTO6YICN6OzCOqxLZChrPho6wuHvlQbWlM4VAWhjE5XC434l8=');

INSERT INTO client_allergies
       (id, tenant_id, client_id, substance_enc, reaction_enc, severity, allergy_type, onset_date, is_active)
     VALUES ('allergy-client-001', 'system', 'client-001', 'pSPvssI/1jzGVYiE:tIiTBnna4qJ8xlYc4Oyw2A==:bkB2OnuHRzoaZw==', 'WGIJWngSItkpbj2+:sC1apGcSzbOt0OLGZM3u7g==:I2Q1m8aEQsCmKytJnMNz7Eeu', 'moderate', 'drug', '2026-03-07', 1);

INSERT INTO client_clinical_history
       (id, tenant_id, client_id, past_hospitalizations, hospitalizations_enc, past_surgeries, surgeries_enc,
        chronic_conditions_enc, pcp_name_enc, pcp_practice_enc, pcp_phone_enc, preferred_pharmacy_enc,
        substance_use_screen_enc, mh_prior_treatment, mh_prior_treatment_enc, mh_prior_hospitalizations,
        mh_hospitalizations_enc, mh_prior_diagnoses_enc, si_current, si_history, si_plan, si_means_access,
        si_intent, hi_current, hi_history, self_harm_history, risk_notes_enc, last_risk_assessment_at, risk_assessed_by)
     VALUES ('hist-client-001', 'system', 'client-001', 0, NULL, 0, NULL, 'ghlRlXUmkFJGFkHY:uFMmv12YDOZ+TH3W0C7Lmg==:82xV8KwxC5roQkuedRhm/ZgebuFx35+RW84MkbBn4VRnQF4KsHhez9IY', 'WREpI4jQvAV9elzs:ic2Ugeko6/RiPyxwMT+F5Q==:agveqrdbohTo4ZNsd2Fy', 'zkgALqdysh0p1FS5:iQuq8UChiCctVSeXo4YmNw==:XU1IJU7mEMuZ6MV24lGwZL75TCcO', 'D+ZsX/d3Ju36TVoU:QoLsAmo0MqJSmNEKKmjiWg==:+ihHwPlEcqF+YTWS', 'PV8rFu6TarMuZ0I/:zxYTzxcDJBUG2Anlvz1kTQ==:Ovm97YAGPREKqUh+FxN2e3qWCO6GkmIwb/hZiUvo24T0MOugm9SRaiY+7yegxEGMgq06', 'yZ/gsy2LETKQo7LE:Qq+TA/euw7ptw8lGoyUI7w==:6Fc91D9tpIZZDg1Capz0gSLiJBDgL+spkO0FSxlR4x3L5pHpNjxgEkAOTRM3e7faI7FFi4sYuYf2CLrLlfA=', 1, 'Tn0eu3BgU27PzxW2:xYvGLggTzCYT8mVc4kieRg==:+93bBpi6fe3ihCNq475Gfj7uLIMyQHk10z76/2UdPMeK2fAy6E9F9debbU/9dA==', 0, NULL, 'kdSJmX0s4fW3fF14:2LthGcD0pQ1ZJqRs2mGffQ==:Fm6bVHRFII7HBeXbNmie6sGZ3lSg1WDTptqVtA==', 0, 0, 0, 0, 0, 0, 0, 0, 'ryVGrqOMd07XkB6V:BhrGb5aM+G4kc+6T/uOrlQ==:VuWL8OBepIFj5d+ESDZ4z/Kbg9lAr6Vcxsqig2X3AO2UhZHmkAMoJnmZDrTqeNZzOiYuNC8IUKCoF/I7nBlGerZ/LvFMz8ev9pcBiZtIVrtXcn5T8TNc/g==', '2026-03-31 16:50:00', 'staff-counselor-ricardo');

INSERT INTO client_faith_profiles
       (id, tenant_id, client_id, denomination, church_name_enc, pastor_name_enc, spiritual_director_enc,
        faith_integration_level, spiritual_concerns_enc, religious_restrictions_enc, faith_strengths_enc)
     VALUES ('cfaith-client-001', 'system', 'client-001', 'Evangelical', 'IB15IGw2ZlytaT9O:irYUXU8mILqs2mqSSdLYrQ==:luxyl6xMe3UDfoTTeBgEDQ==', 'citbtUdKDqx7XB7O:p3xKWWNTt4phLBDGvLn9iA==:8QAIUsGxca9RbTbn6d/XspFF', 'HHgy8bKwKbnQsPo0:LhWE0wkdE4J1q6tOSw8jpA==:BP5Tgjaxbcm+RIzqJg==', 'actively_integrated', 'Hndsa1LWBJSXtit4:rqQnaAMjii96Pyl67InubA==:8vpDR3daMPcpPNfkWEZi3XnERw8szzLkXajXDsHhu8CH6eC15h48g/TwYospH8UahKDQiknrXWaNbmPD8UJG', 'lPacFZz1aEMUkF2B:yiTfGWarPmFwv/1ADB5BkA==:a63oRQKEeLJqLpw8pw==', 'C7iP1Hrdc7BGhUgu:7STj2elZyyD8FOOksHuzPA==:DKu1eqxptpucL+nz4nKg/QVcKVspRJhx2z0tExBTOdPcIHm96OE5V+QPDUsA9TmOmDwdnXruXkiVhUy3D3J90UcgFY39ypPf');

INSERT INTO client_legal
       (id, tenant_id, client_id, guardian_name_enc, guardian_relationship, guardian_phone_enc, guardian_email_enc, guardian_address_enc,
        court_ordered, court_case_number_enc, court_contact_enc, court_order_expires, custody_notes_enc)
     VALUES ('legal-client-001', 'system', 'client-001', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL);

INSERT INTO consent_records
       (id, tenant_id, client_id, consent_type, signature_state, version, effective_from, effective_to, signed_at)
     VALUES ('consent-client-001', 'system', 'client-001', 'informed_consent', 'signed', 'v1', '2026-03-23 16:20:00', '2026-03-31 16:50:00', '2026-03-23 16:20:00');

INSERT INTO intake_packets
       (id, tenant_id, client_id, status, assigned_forms, submitted_at)
     VALUES ('intake-client-001', 'system', 'client-001', 'completed', '[\"ShortIntakeForm\",\"InformedConsentForm\",\"AnxietyAssessment\",\"PHQ9\"]', '2026-03-31 16:50:00');

INSERT INTO treatment_plans
       (id, tenant_id, client_id, status, goals_enc, interventions_enc, review_cadence, reviewed_at)
     VALUES ('plan-client-001', 'system', 'client-001', 'active', 'DBbTFfs5/L806kJK:ZMh/zkbyvdBslBawCtF8Gg==:P4+j7KahRGm5He9ExfHQU8mw2OkKAyva/PDzWCAnlXC6yHVUSt+zDDIBn+QsVY/51rQivowBqb63vCt9FIgsOEuWH2vbd6rwmQ+vIPPsJMvmoMgD4GZbtjx26q4Ar0E4Gxk2p1HA5NkmCi8Ej5CNvZBw+H29liYdS10Pp5+99XXTwggF8oYRex75Drb888mrSd2RrL1DeFND5yDFLR02ASrLy7SnKDenztkknHCMB7oYA1RQHwlpOgG76fpIEeyiCPICM6Cv11obFkUf8JhJG8nqBWY0U7oIpIEu2HIpmVq8aRcNnJ21TrwK3yCQksVkWrup', '18DbtfQailCDr9Ls:HJrmKpHGfQE+yPfDhcGfxg==:D7Ik+ZbBbgMObHRabEMq9ifhW6ZHv0QraAz0jxhK0SUik2Rvr4GbQupIh+s+Oi5FBmPoZ2WGxOdA/5QPZAZ5ZoJXix7W+NMsaYdRxMO9gf7E/AMEG3Zp9hOUhOW6O7LhdV5gVMyGg7FI6qVKwb6dI945m+hQPt77', 'monthly', '2026-03-29 00:00:00');

INSERT INTO portal_accounts
       (id, tenant_id, client_id, email_enc, email_lookup_hash, password_hash, failed_attempts, locked_until, status, mfa_enabled)
     VALUES ('portal-client-001', 'system', 'client-001', 'WnS0DaCbn//3nspn:G31/Q/nlqIYjN/jK7XYemg==:YhQVeEsriZG8p/bi9WB+tje20esWfKowhmJm', '256488171b1108e9e3510db4e1997e38884646e8da09061a0d1265424873e762', '$argon2id$v=19$m=65536,t=3,p=1$RIMtuIoYp95Ji77HbqJxxQ$gFx4zOuAa+uWbiRWuAGL2BRmHIw1Z+suw16YbdduAsc', 0, NULL, 'active', 0);

INSERT INTO portal_client_profiles
       (id, tenant_id, client_id, preferred_name_enc, contact_email_enc, contact_phone_enc, contact_preferences_enc, profile_details_enc)
     VALUES ('profile-client-001', 'system', 'client-001', 'uZ/+XYgCtCqMiBad:ZtEoGrpQRwQdf+tMc4GVhA==:TxVyAoM=', 'dLrgTdMMzcsp0Yc6:oO6386VTFY8ON74rnQ4Gxw==:6pRtFBXFdFlqehOvVY8hgG0jkqkFDPpoaSIp', 'tMpu2/XUOwfbhWDH:v/rzPVa17TWMAB+ScUmoqw==:n64Aexwr0a5RrwbD', 'WOygOAfAru4ASPqt:NQz02+A8y0Y7pwKbkdQbNg==:KiLm6M6rCJmJt54tMwpBneX6pdTyjsKokxxm+xRQVw==', '0vDRXDfQM9spS7aO:vzDUfvz993mlQpGmxaL0Gg==:4oyhKE7xBN/RAuNAY24rm6VQomMk7TYHFIdF0LTawtQz2K2xK8YtiGVZp3dO9idHKTMg98wTtAHz0hD9xrrcO2iv+uccMvuZtb5gW5s7u+qwQWtB5wlPgQsPLtwcSh3zhrif');

INSERT INTO faith_church_referrals
       (id, tenant_id, client_id, church_name, contact_name, contact_method, status, consent_to_coordinate, notes)
     VALUES ('church-client-001', 'system', 'client-001', 'New Mercy Church', 'Pastor Daniel Hart', 'email', 'active', 1, 'Elena approved collaboration with church support for practical care follow-up.');

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-001-scheduled', 'system', 'client-001', 'staff-counselor-ricardo', '2e0c1yGf8d1i++ji:ycgz45GKL+/sPWzTuZ+BxA==:DzZ5FF2ofIywAcxU6TI=', 'hBa2bSz7I+U9xGrI:j9fE9W1KSgpYDKzW0QfMdQ==:uSILznReABTYtWfNfA==', 'intake_assessment', 'scheduled', '2026-03-16 14:00:00', '2026-03-16 14:50:00', '2026-03-16 14:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-001-completed', 'system', 'client-001', 'staff-counselor-ricardo', 'EpBD5zW3W5HqjuK8:oPZ1kik25Tq/Nz5r1ZMT9Q==:eljGwq8XouOXDTUHGcg=', '+5JOsRs/0a/2hNIA:g1m/koXxUiztS0QnBcvg5w==:2kNmDSmVAAn2QEbOlg==', 'individual_therapy', 'completed', '2026-03-23 15:30:00', '2026-03-23 16:20:00', '2026-03-23 15:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-001-note', 'system', 'client-001', 'staff-counselor-ricardo', 'jKG6keaXCzOptaSw:j+njsilgE0QJx7bhwZzK4A==:J1rtm7t2ijx/yZMX4Go=', 'Q4SUn1HKulM3KF8q:ejCxfAR5i/O3Joyq4Ex8gg==:sozlzZVacXcrvyDewQ==', 'individual_therapy', 'completed', '2026-03-31 16:00:00', '2026-03-31 16:50:00', '2026-03-31 16:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 1);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-001-future-1', 'system', 'client-001', 'staff-counselor-ricardo', 'jw8ocFiSzKIloy1o:Sh8r19DC0AYmj6WpbOVu2g==:3nO3OHnoGvc93HtVntI=', 'vGacD00OzSrsyji6:/BF70jG8NA3goASiBHk20w==:qr+vRq6qRKcWmNywyQ==', 'individual_therapy', 'scheduled', '2026-04-13 10:00:00', '2026-04-13 10:50:00', '2026-04-13 10:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-001-future-2', 'system', 'client-001', 'staff-counselor-ricardo', 'vtGxc0TlVfZb7WZr:QKLk4R2ODClQ0EkMAHL/wg==:nhYJR13VkmzQFg9Zzxw=', 'T+Z3ZX6lN/PA6iHw:PqA8QtecK+QZp1LngqpsDg==:LSueH3M3ifTdKeoHBg==', 'family_therapy', 'scheduled', '2026-04-27 13:30:00', '2026-04-27 14:20:00', '2026-04-27 13:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-001-noshow-1', 'system', 'client-001', 'staff-counselor-ricardo', 'x8pdcJWv+AKzyYXV:jeNGpt99dV0di88lRj08dw==:WYAqwTtwh8bK7g6SFSo=', 'ajF9hxl7hz3B0o/O:+r05EmSu2YB8eeePhRqy2A==:7dRXidNy7V0Aa9zmag==', 'individual_therapy', 'no_show', '2026-04-05 10:00:00', '2026-04-05 10:50:00', '2026-04-05 10:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-001-noshow-2', 'system', 'client-001', 'staff-counselor-ricardo', 'PupM1HI0pEDgDE1U:JE26jEukKWG4/Fx1ZKAGQg==:sTbac4zAZDhsyrFjYz8=', 'v/bq7yIoqxYRFIsI:T+LwTvyeBuq0on80ovoWQQ==:jQZtGiFafErrd2Q+JA==', 'individual_therapy', 'no_show', '2026-04-04 11:00:00', '2026-04-04 11:50:00', '2026-04-04 11:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO progress_notes
       (id, tenant_id, client_id, appointment_id, note_type, summary_enc, interventions_enc, locked, signed_by, signed_at)
     VALUES ('note-client-001', 'system', 'client-001', 'appt-client-001-note', 'progress_note', 'hiUzfuKCaWJ28nt7:fGco1K6PoFdZJrOnk8RkaA==:OoS5yMD2rKmdtezxbEtPW4u9bpI1EU8vrqvK8+sCmKKx1m8Vf+wC1EBSw5EaJW9BNOF89RJe847cegttlxOeqV8P/+LtJD5lqTMJLLngfoxyAGrf3rfIXzW8dxD0WAHOJaalMEcfZNW8tvWzJ1iQAeSl+X7XBiwKyBTnDDZrssjrC4PhwZQPcSAI8VSDmTX8ciP1xPKZucxt/fe5ULQ4HZHaU68=', 'xdQIZXsySEz4c5oL:4mMuBqW9PQAVwn/SdLFpEA==:Bq6cT1OSvIODMHP5PgfRkDdvOLe7DWCa9MUjXn4fajV91WPa0kfoM3JJXZIcvqrXE6fleXm0wmbPx9fqZzxjiB1wmVEGX6GO72RZQEd8AYjSUTT9jfEy+GXAc7DANttNtscFb43sAPjjZSgluW1SpnH1Lmdi/QojzzYLSwOpe0jOh7MHKLRsT807+hdEFMq2GQ==', 1, 'staff-counselor-ricardo', '2026-03-31 17:00:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-001-ShortIntakeForm', 'system', 'client-001', 'ShortIntakeForm', 'Short Intake Form', 'account_signup', '2026-03-23 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-31 16:50:00', '2026-03-31 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-001-ShortIntakeForm', 'system', 'form-client-001-ShortIntakeForm', 'client-001', 'ShortIntakeForm', 'Short Intake Form', 1, 'client', 'PgeiRjr+gYpD2Jqp:mu5ZDCrYCNoV8mUbnDXkjw==:fhy5u9QmgNTUa8l0M+xcShHEW3/4oaURHKbnuQjnXwROk47utP+U4H/8CDs+8Fjqkq+VoEMBIGA8/FANSgRW9TSjc652wfiIyuwV2uK4po+pAMS3yb2hzYbaNZRa0keo5FTrcplu38JoU0sJMQGrIuimtoNfzZOeT2/gRruMeZxxjll8ZQ9BLAmX9AYn5IPrajnogzQXzkWx3mucdCNxXQJgbot8ImoUdo2FebL9Y7hUuVS46nhztYwYD2/+IYJb0dfsiwh+ZNOXtkj8dnQZkym9Mmhfs17ybP+ONa+pFNpASQtR3PMaulbK3Xrfirp3j0OCqDUEIIHNQaiQNcSMNnC656uczHB6ke5ZyFqtLKwgIxrLwbv2FhQEYWrY8lYoCuhOBJhstGNSpXtxAljszruFcz25yyDpFcTPauaihKJAKPNGI18kG5eQBYkwVWv0WhV9eQ8lk5XezQi7M/7olb8y2iZGrBLD8o46N0OP4m1CVSdc/k7i4cT3YXc=', NULL, NULL, NULL, '2026-03-31 16:50:00', '2026-03-31 16:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-001-InformedConsentForm', 'system', 'client-001', 'InformedConsentForm', 'Informed Consent Form', 'account_signup', '2026-03-23 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-31 16:50:00', '2026-03-31 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-001-InformedConsentForm', 'system', 'form-client-001-InformedConsentForm', 'client-001', 'InformedConsentForm', 'Informed Consent Form', 1, 'client', 'AqhfJmEV8hbGKQI+:nH+/mZMn5JNLyeiGlbXFWg==:fZW7Nmx5L7D4V1nfOKuBILSMBZdHuBxHiD8mERHOkmwOJp2453yyigq4sCIJWVAxw34ip5paI8A+4v3PmVRUHhhtGE1t2fayTj4iW+2Nq5IUcFNmkSSQxtmFpPl6Npk+y3c8iBnWYBjs8iXUl4KOqhlNTxnyHEw95zL5jC7o3kOWaY1QK60PXh+mCgGLIdOvpYwTzYk8P9Fe9jBuQZ1KPGEX6eVQCKXSw7dn9k5BwEeiWqtt6xEalAM2OwfztMihh9E/FVk+uOS7OwT4HiWN', NULL, NULL, NULL, '2026-03-31 16:50:00', '2026-03-31 16:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-001-AnxietyAssessment', 'system', 'client-001', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 'account_signup', '2026-03-23 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-31 16:50:00', '2026-03-31 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-001-AnxietyAssessment', 'system', 'form-client-001-AnxietyAssessment', 'client-001', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 1, 'client', 'hfvEj1UEQxB5F+nT:SokpXlt5hT839Pj7pCxjVg==:chuvaSCl7mjSrynSymfaGLWM94qQHuY/AliGkZ0YUKKTHyIig3F7/Ebv/iaU/ipox46ahcwF6e2nohj+OhflK2SNAzpT+3jKe6TU8TkzLzHvuxK7RVfaJyrwkZGM8hHcY4Hs2ZS/ieb+w2WkoxjRcBLSS5BTlyKs6XA0fUNljmEo7sjmjM4FxN7CMtaufNm6QpE5l5zGuli+l/xlxB2LXkT5u/u21jDZTFaCkoZvIMkMAcyrGJd1+Axq+srVWw==', 'Moderate anxiety', 11, 'Monitor weekly and reinforce grounding work.', '2026-03-31 16:50:00', '2026-03-31 16:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-001-PHQ9', 'system', 'client-001', 'PHQ9', 'PHQ-9 Depression Screener', 'account_signup', '2026-03-23 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-31 16:50:00', '2026-03-31 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-001-PHQ9', 'system', 'form-client-001-PHQ9', 'client-001', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', 'Upac5Q7y7/5d02Qt:DKbKJj+BijmA7FPEJ9FSmA==:EpKDf1RwwG0jVI/VsRwzWq6lJgstbjsro54WbLoFCtKobaXmHdi4xBk6EFXYHg1D5TmdPwV3e5enLaT39A2EJwfjEhKKSCLBLWsCCKSV+wNGVW/PD8JEoGCOx/poj8dk1h0erelVpcOHTkr9X9/YtIHhbn0hpbg2xKEMdP8FKLK2B21ZpkYzUWj7ej18IUqC6iFbcaM93WL23r8GSrbGL5kIm0sgQEnfhwSaQyNiFjjgPTeRhTfTZg==', 'Mild depression', 8, 'Continue behavioral activation and sleep supports.', '2026-03-31 16:50:00', '2026-03-31 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-001-PHQ9-history-0', 'system', NULL, 'client-001', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', 'piV5flMa/gVZchSE:cxWfGmKhw2tic26+FYdHbA==:xhjN4mG/5GKQWNQSnAzpNiDtc2NKucwUauxQ+4yBelSfoMkHKEwQVf1MzcrUEQCCoCj6bMvJoDcLDzBtIiR9XfwAn3I8SQ6fkn9kUEneN376W1isgN8=', 'Mild depression', 14, 'Monitor weekly.', '2026-01-06 00:00:00', '2026-01-06 00:00:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-001-PHQ9-history-1', 'system', NULL, 'client-001', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', 'gr0hRRzZ27pZDSo0:sDxWCorg5VsJnOwpSXHIDg==:ihQ0GlSVcOnDQ8J2Bovn8zztNeDLWeCqqKzz7XaXH2ck+lYV7nlYe/Ch5kTuwIzXgqwtBJpsd+dBJCM+LVHWFGMNmX+oiz18jn2mNnDz8v9NRnaTTpI=', 'Moderately severe depression', 18, 'Increase session frequency.', '2026-02-20 00:00:00', '2026-02-20 00:00:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-001-PHQ9-history-2', 'system', NULL, 'client-001', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', '1H5r5q/MhS3kvDr3:HThYqADexYoanjmAtH1dlw==:wim41p40q78ix9aqY40soCUokEzw6NLNka0e6M4MgGbmR7Vvn9VYd4iT6HisBUla00GuAMYtMtAiQBCEov4QLj4ypO67jiYAfBWiwM4yR1WcqCljGSU=', 'Severe depression', 22, 'Immediate safety review required.', '2026-03-29 00:00:00', '2026-03-29 00:00:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-001-AnxietyAssessment-history-3', 'system', NULL, 'client-001', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 1, 'client', 'B7iZFdrTR5FVvig/:KH0S61uTXujnGh4Jtjqgfg==:x32bI0doBH59HsdYVUo7E0yZzyYYh3rOD8Iw8EOXcAiae3R5U6fFfziZG3Z2bJ7oETYMNm9aZ7HjZg==', 'Moderate anxiety', 13, 'Continue grounding protocol.', '2026-03-29 00:00:00', '2026-03-29 00:00:00');

INSERT INTO offerings
         (id, tenant_id, client_id, counselor_id, amount_cents, received_on, note, created_by)
       VALUES ('off-client-001-01', 'system', 'client-001', 'staff-counselor-ricardo', 5000, '2026-03-02', 'Elena shared a ministry offering after session 1.', 'acct-001');

INSERT INTO offerings
         (id, tenant_id, client_id, counselor_id, amount_cents, received_on, note, created_by)
       VALUES ('off-client-001-02', 'system', 'client-001', 'staff-counselor-ricardo', 6500, '2026-03-03', 'Elena shared a ministry offering after session 2.', 'acct-001');

INSERT INTO invoices
         (id, tenant_id, client_id, appointment_id, issued_at, due_at, status, line_items, insurance_enc, claim_status, subtotal, adjustments, total, amount_paid, balance)
       VALUES ('inv-client-001', 'system', 'client-001', 'appt-client-001-completed', '2026-03-23 16:20:00', '2026-04-02 16:20:00', 'paid', '[{\"serviceCodeId\":\"svc-001\",\"code\":\"90837\",\"description\":\"Individual Psychotherapy 60 min\",\"quantity\":1,\"unitAmount\":150,\"serviceDate\":\"2026-03-23T15:30:00.000Z\"}]', 'vHgdOKzeiAhne4D1:mvt2oL9HUFCifOT4BBWYdQ==:CnciKiPMT1tEnDfZm7TdtAHXqy5kYfmHagqAn2sTwxCVB2rTgXxbpoRY9BkvaMmvs0Fci+JholN+qT4E/1FowYr0Csyrl3Ofg5//fR5cQpTjESj1z3R/NC+LPA==', 'paid', 150, 0, 150, 150, 0);

INSERT INTO payments
         (id, tenant_id, invoice_id, client_id, amount, method, received_at, reference, notes)
       VALUES ('pay-client-001', 'system', 'inv-client-001', 'client-001', 150, 'card', '2026-03-25 16:20:00', 'CARD-CLIENT-001', 'Demo payment captured during post-session reconciliation.');

INSERT INTO clients
       (id, tenant_id, first_name_enc, last_name_enc, status, faith_background, high_touchpoint, primary_counselor_id)
     VALUES ('client-002', 'system', 'PcpamTGB+m2YYAuQ:HAqFXsB3oixTuQu3ZkCRUA==:OaJWPex5', 'QuzoUwJv9FDmRLjZ:tSXZOw9gw6o7z9Ae3Srl5w==:VwLgT8Duyg==', 'active', 'Non-denominational', 0, 'staff-counselor-ricardo');

INSERT INTO client_lifecycles
       (id, client_id, tenant_id, case_status, referral_source, emergency_contact_enc, discharge_record)
     VALUES ('life-client-002', 'client-002', 'system', 'active', 'Friend recommendation', 'ZhPNnu3j9utcA8gg:ULYlgTFUSv3SbcBQvUx/MA==:ymtpj4rHYSBL7ciLPOZ5E5FjYR4pdAU9HvConbcEJ+al7f5693bVYhxn4ZcTqMI82kZmB1TrVjmawODtw1xpwfyPuqaPKUyPvg==', '{\"readiness\":\"stable\",\"demoDataset\":true}');

INSERT INTO client_addresses
       (id, tenant_id, client_id, addr_type, line1_enc, line2_enc, city_enc, state, postal_enc, country, is_preferred)
     VALUES ('addr-client-002', 'system', 'client-002', 'primary', 'ClmWCc/o/cHuDCv9:7QXMsGgGA3BFoU2jS+QGug==:K9NkbQ7sl5naieVwvA4C', NULL, '7sLp/p0yiDRYtuRP:ipwXQYYlH6uuz85DY040Uw==:tYkfn2JvoXlHW4Do', 'FL', '0rjqGHFe1CCaUuGk:nm0L8rFoV4yPEsGenrkVjA==:S90omMk=', 'US', 1);

INSERT INTO client_phones
       (id, tenant_id, client_id, phone_type, number_enc, extension, is_preferred, ok_to_text, ok_to_leave_msg)
     VALUES ('phone-client-002', 'system', 'client-002', 'cell', 'QDP6pzvw82ZXnkUW:IuRX3EXLtqJvGBjkpo3gpw==:Ff+zvSSkTTAaDuLG', NULL, 1, 1, 1);

INSERT INTO client_contacts
       (id, tenant_id, client_id, contact_type, name_enc, relationship, phone_enc, email_enc, is_primary, has_legal_auth, notes_enc)
     VALUES ('contact-client-002', 'system', 'client-002', 'emergency', '1m7eMaQxggLQ1Az/:8JQqf5UKqrm3lty2qB243A==:kgKOuy5yCxUFLf+BAtgy', 'spouse', 'xdEx7EgOvekr7SAI:NeLHi2+xDNM3ML4alq3KLw==:ZV1CwIg0TlDNzLwc', 'NK5pKsC0JR2k5wQL:C5KHu/HVy8EQVOHSyAkd4Q==:hzsd7D8VKnnFlOIDW8wWrfI5cnDe9zMlnQ0I', 1, 0, 'FOKxiEy2L17nX4yA:IZGtooIY8CccMYbOxHwRaQ==:0qhfwx4simdjEpZU5l6RATVNIwQ6M54F9gKxBCzQbNt85kKTd4aUQhFPsaw+VuFD');

INSERT INTO client_insurance
       (id, tenant_id, client_id, coverage_order, carrier_name_enc, plan_name, member_id_enc, group_number_enc,
        subscriber_name_enc, subscriber_dob_enc, subscriber_rel, auth_number_enc, auth_visits_approved, auth_expires_on,
        referral_number_enc, copay_cents, effective_from, effective_to, is_active, verified_on, verified_by)
     VALUES ('ins-client-002', 'system', 'client-002', 'primary', 'lAF2axjWZNJu1WLA:ijJyHirhr8oNQOrSRbOfRQ==:LUKi6do=', 'Open Choice PPO', 'Zm7DXRB+xZnKC12K:HwTru3W5+3UOQSadjHvtPA==:NeO+gyrPVdMwCWjtsZwBIRA=', '+i5xlwp9ADE4FKb1:IdyO34fkwR2z88qSLwN31w==:FlKvcaCVSgqJFtiFbBIozA==', 'FrDKgXKV7T7rn8yH:+4eUiEWZKXVDU40BOnBoNA==:oEGzHjZRRESOLewfLFs=', 'nlpKnd2dML48hxA6:s4dxq26UTcYmoWAsVAVkzQ==:92GVeVceIKRmSw==', 'self', 'CS6C78TN/0jU8i1q:s9Y8HIfxDMcyq9UAOqe0KA==:em9Ot893kEOhsKGcvUds', 12, '2026-12-31', 'SPdGWRSLCtHQvA3a:dHkSRq2ZAsNW3Fx/4US2nw==:Jazv2xOdGczhF2lWAIg=', 2500, '2026-01-01', '2026-12-31', 1, '2026-03-08', 'demo-finalizer');

INSERT INTO client_referring_providers
       (id, tenant_id, client_id, provider_name_enc, practice_name, npi, phone_enc, fax_enc, address_enc, referral_date, referral_notes_enc)
     VALUES ('refprov-client-002', 'system', 'client-002', 'afKtddyi8DYNrZZx:sycLMEcwhLrKx4f7tXoYDA==:o+LYNsgcrRdU+QWOqIeNWg==', 'Grace Family Medicine', 'NPI0000000', 'vAdZZ+8378omJxP0:mj8u2F3Gz9PgYEQyQwOONw==:chr58s0sHUOoxQkJ', '574CxeQS5dQGSGxj:OXbR2W8OZ7sit+Nu2WTLOw==:zAU4T86PWBiPvWy1', '8hQYOBb4nbjNfafh:H/SMUrvTsmRRabU1njeq6g==:QbHT/sTRLDilRH75f8pF3Eml5FyBZ/JyxKde+DrjiD7ueyaE+66Tx5YvZRIYWJ2QcQlvIx6m+G8Qz4LoQcViolnOPpUByVidKo7VuRKTbAeWTxeIY7TE/PuaDmXLpQ==', '2026-03-08', '8Q5fH0PKkxESBhrq:ru1H633j98cW3BCBQmfUtw==:ew3auIaemIqILP0HXwsNBx795oROCbNws16kM+TfzxcZ35/Z03lrN7sh1Cmj1HIk/g1SwBmbAR0BOXlGnzTg+A==');

INSERT INTO client_diagnoses
       (id, tenant_id, client_id, code_system, code, description_enc, onset_date, status, is_primary, notes_enc, diagnosed_by)
     VALUES ('diag-client-002', 'system', 'client-002', 'DSM-5', 'F32.1', 'E6bkdTJfos0IBgMv:2Ri1D/NR2uQdF5k80ybE6A==:3MNtqlVs+HBuiWG+OpU5J0z3CJEKnyb4maoxgx6Q1SmQ8vQ=', '2026-03-08', 'active', 1, 'W9ErkcVY4nNMQVvn:gNzZszNTm6PeQA9SnAcm8g==:l8VdlnZ6MR6spkj5Eq3Ukw/VEhjdAX4gYt3jpGtp/uEh+nLMUsdJTJwCPjvdJ3lKXgj9rTxx', 'staff-counselor-ricardo');

INSERT INTO client_medications
       (id, tenant_id, client_id, med_name_enc, dose_enc, frequency_enc, route, prescriber_enc, start_date, end_date, is_active, reason_enc, notes_enc)
     VALUES ('med-client-002', 'system', 'client-002', 'P9SNyMoO37vI9Y96:gtFnTLvd//34y6WCLzCnNA==:N8m6rvznO6Lp', 'kPOOUD4GtVRy9mU5:Lt533C5AmEHoztIFPg6O4A==:2WNj8yI=', 'JUZ4fp8K23mJS/cL:IheEkqFoR47c2bpKcVHlPQ==:Y26go9o=', 'oral', 'c3Ix4AfFR7p+MoXP:grUhKk2fOGmPvJhQ+rItBA==:kkjOq7gSkFxbRe8KWgzawg==', '2026-03-08', NULL, 1, 'cwFUQOblsoAy+R/2:o3772X8B4Y0TwATOppvY6A==:fpotj8wS21ur4v4SlpGC', 'au/6tcs4iMXzblCo:qU5a/4Ajw9DpM54il+Xhpw==:Wkxt/T2ekidW51RJYhZbEeKc2jCStTuH0CZ+M7xxTMIotc/eOXb9p/WCK1ZTRso1Qqc=');

INSERT INTO client_allergies
       (id, tenant_id, client_id, substance_enc, reaction_enc, severity, allergy_type, onset_date, is_active)
     VALUES ('allergy-client-002', 'system', 'client-002', 'UrH0VqmO8w6qlaTy:sr0jiDX2PdAOGAEY04bVzg==:zkvsWGLwvEvu', 'zhrLY6Ah6egrvuon:zjZ9DSdwaZeD+QAXpwp6vQ==:uJ5xkMcJwca9YkQSyWp7bE0f', 'moderate', 'drug', '2026-03-08', 1);

INSERT INTO client_clinical_history
       (id, tenant_id, client_id, past_hospitalizations, hospitalizations_enc, past_surgeries, surgeries_enc,
        chronic_conditions_enc, pcp_name_enc, pcp_practice_enc, pcp_phone_enc, preferred_pharmacy_enc,
        substance_use_screen_enc, mh_prior_treatment, mh_prior_treatment_enc, mh_prior_hospitalizations,
        mh_hospitalizations_enc, mh_prior_diagnoses_enc, si_current, si_history, si_plan, si_means_access,
        si_intent, hi_current, hi_history, self_harm_history, risk_notes_enc, last_risk_assessment_at, risk_assessed_by)
     VALUES ('hist-client-002', 'system', 'client-002', 0, NULL, 0, NULL, 'bc8Y1ORtsJnKxGMf:KK5qjHIdBNwSXGAQqSLhGw==:Csv8jK+DzQ3aDbyn2nyFcKjVu5zMPJPYJetjkdL65uOOQDCjPMxn65WU', 'xTGMcO5sEAXgyNyQ:iz58EnetbkaHAAFjf0Bcow==:+wmYLGLW0YkPGz5C5xiO5g==', '4rylIQ0JO9tuzjn5:CEaz8H3tA6HWx3AtIWjsPw==:accnuaR+Cyia6pU2a48rE3ZUwa8q', '6uPbBKdRCeha7UG7:psZ31Y2Z38I2npiDqtkuZw==:7J3dYURz1N4sEUxw', '/vOsEEFOcxioUgV5:7lqj9m07HjR5UKR3jEXoIQ==:ScqPr/4EqWOMymB7e0yK18fmoSAYYS7mr5u6Cnj8IE2acBMqk46kSI1v6w3s3ISS93d/', 'o6CbxhL0ieUDxMZ0:VlYUr1odSOWMuN90hYSOmA==:w7IDBUGavwzdQi6MeuLgA9wNFP+5t3u0KALbQPCQW+Hf6nd0Kp3AqiuuC7wsaM7fTO1ZEDhcefbJmNSYSrY=', 1, 'DwPL9Y3JsMbmohoM:9WHz31O0bkoOqjz74Yy7eQ==:dzvlf/WBGVz17m74REz9TuWaR0XRfsNOkhQLmgk+L0b8/GalgJ97Q3Shum7/ig==', 0, NULL, '8h+chPaUKwmfnsCD:9AeuAgFCZAaA1thkgOMiJA==:vNwp4m3J5JQQAV+SlePVNuRgxtral0fvDmCF10uhFmAEDzM=', 0, 0, 0, 0, 0, 0, 0, 0, '3FezF5ajvXUEflPi:3mzN+vT6Gm3cbZ17fIOfDA==:hAUIzj+AKHiAlxL+kKOd5Ck7993vfiORJLjh06ExCT1KSF2bce+RIZzk0y/8Q7HcB6eV10zdqB4QC31AbUdWiMN6+ibLtAvgDg08csjz963ijQhsHFjUUw==', '2026-03-31 17:50:00', 'staff-counselor-ricardo');

INSERT INTO client_faith_profiles
       (id, tenant_id, client_id, denomination, church_name_enc, pastor_name_enc, spiritual_director_enc,
        faith_integration_level, spiritual_concerns_enc, religious_restrictions_enc, faith_strengths_enc)
     VALUES ('cfaith-client-002', 'system', 'client-002', 'Non-denominational', 'P8uuMlD+1t8bL2b6:thmF3pighLPBRQZxDM9csg==:5Nel96wfvTAnEt5N37MmPOQxikmlvA==', 'rY7RF8MZ71XlNZlg:Rwih+aXA3sneIgJOEmvMOQ==:vPbiZvczFpExflCfFekd48n/', '78kgUKfOFN9jg56e:Wa/78ziD5nwV0mxjW70fIQ==:IvExvPs3hA8X/4jeNA==', 'open', 'pgFYFmYK99603FhM:IHVpfk/2tawnaODYtAuwIw==:U3p/fCANXCvYgED+Tn3scrpHbLb8yvVls1P+WtOSzJKDBOrB/7elOI8/KLegk+vXkkMTzM0Isey2tAF2I43T', 'BVImEFcwb/ULQT2O:K7V2Za98qs/e4Qw1ATIKeg==:vkZI1TmU+B1hK7TGRA==', 'qr1Ga+Y55CYcAfbE:1SkAmZCrztpAjddxSfd8qQ==:+LtW24nKQmJH/SAC/Hc5soN/ZFMzVDMBPnawXSPjU4iGoAY+xWUO2d6Kc13EqbDMSjfd1/LLqFXOkuJswlzMfY8CjQ84Qh8d');

INSERT INTO client_legal
       (id, tenant_id, client_id, guardian_name_enc, guardian_relationship, guardian_phone_enc, guardian_email_enc, guardian_address_enc,
        court_ordered, court_case_number_enc, court_contact_enc, court_order_expires, custody_notes_enc)
     VALUES ('legal-client-002', 'system', 'client-002', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL);

INSERT INTO consent_records
       (id, tenant_id, client_id, consent_type, signature_state, version, effective_from, effective_to, signed_at)
     VALUES ('consent-client-002', 'system', 'client-002', 'informed_consent', 'signed', 'v1', '2026-03-24 17:20:00', '2026-03-31 17:50:00', '2026-03-24 17:20:00');

INSERT INTO intake_packets
       (id, tenant_id, client_id, status, assigned_forms, submitted_at)
     VALUES ('intake-client-002', 'system', 'client-002', 'completed', '[\"ShortIntakeForm\",\"InformedConsentForm\",\"AnxietyAssessment\",\"PHQ9\"]', '2026-03-31 17:50:00');

INSERT INTO treatment_plans
       (id, tenant_id, client_id, status, goals_enc, interventions_enc, review_cadence, reviewed_at)
     VALUES ('plan-client-002', 'system', 'client-002', 'active', 'jSU+LqIzP/dwhg06:vdgRWjLyzkQVMNA2pLXamw==:Edf4n4o5zDzgU6Yw6JaA4gam48cZ2v5W4WTOlxAT7ZzjEz2xh52LlWYNgUMbsKOGwbIZ6DHDjHCfAwitLehZKxUMzMFMF0o14bMVxjXD/8kjCJBb0mygJtJwnWw5h7FROg25o8cUtDd+haYM+rV5cX7xHCp7YaFWa34yyYHyoE7ntYGVl79Q1zqFoolatC6ytlTCvCCiSt2e8U9qwE1GVQLHQU2q1WKoW1gnMOX1f2EqQ/W75tDv+AvUjwFZIB9Xz2pqcrrWgt/Xcojl7Xucx/MKNp4jGMHwqASQIXHeXrFwGzn4gvOzCOT0', 'uv6ip/x/wPYMsNG2:G1SBauTGks2FSP1PyXURNA==:WlHpebRIZlnjJ21koAxUUxLFGqTVu87Qk3+VZLnaKn+WsRu9QbjOfEFdMnXMYQvQPKQv/nxQqCn2yLu8Nd/oMAzJ4cAbo+4FJyhxEgv5v23p9+J8XptuKVRL+FgSy1WAqlbHXLzCgwZGI6f/Dil/hd0drvwubaPK', 'monthly', '2025-12-17 00:00:00');

INSERT INTO portal_accounts
       (id, tenant_id, client_id, email_enc, email_lookup_hash, password_hash, failed_attempts, locked_until, status, mfa_enabled)
     VALUES ('portal-client-002', 'system', 'client-002', 'P7gvVUNn8hFC3QJP:m0m4E1YwiIwr+9hHY/rwng==:R5CuxXjEl2XCWYEfxCs4pqGWbPTDIYw9iy4P', '305bb2f162ff0befd5d36aca73c593d2c71302ce011460d1c89c421a61562d3f', '$argon2id$v=19$m=65536,t=3,p=1$RIMtuIoYp95Ji77HbqJxxQ$gFx4zOuAa+uWbiRWuAGL2BRmHIw1Z+suw16YbdduAsc', 0, NULL, 'active', 0);

INSERT INTO portal_client_profiles
       (id, tenant_id, client_id, preferred_name_enc, contact_email_enc, contact_phone_enc, contact_preferences_enc, profile_details_enc)
     VALUES ('profile-client-002', 'system', 'client-002', 'MW0kXxlrOHRLt62s:s6hZZfrXlR15n4hprptrHA==:1IlJlKkI', 'J4I7PKgJn8uYbfOt:mNLTOzaO6p67vvo+frCP7Q==:Hu0mZBmq85PMBdaEYXtpvUBB94947EUNcCkl', 'twtoTooF+25PNRnS:YB7M2yqpJdMGugryyUxfJw==:1Sl0du1w1LQmTRmI', '5XUZ8BPc90kTIRQ+:OcKrjXthrJq7Y1hPrFx+NA==:X13CHkCVPInbrnD0PRTwDhypYykcBG3mt/uBP1FDXw==', '5suqV3f9rx1ZDN27:/mNn5a6w0L9nL62rB+BKig==:/hIGeLpZVpWCstnOz5cIRi/+bRYDBINH2TXC+fhLZJnd1GwUe3VBIU5Gz5xpKBQFAdrT+Qa2wHl7hQELCMLJp/CkoiQ0yxrM3mUL/saS3bryM06oZnR9OWLz9tQYixzNLsgIa9T2VI2LKQ==');

INSERT INTO faith_church_referrals
       (id, tenant_id, client_id, church_name, contact_name, contact_method, status, consent_to_coordinate, notes)
     VALUES ('church-client-002', 'system', 'client-002', 'Cornerstone Fellowship', 'Pastor Daniel Hart', 'email', 'active', 1, 'Jordan approved collaboration with church support for practical care follow-up.');

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-002-scheduled', 'system', 'client-002', 'staff-counselor-ricardo', 'b4obrQS4DBYDEW0K:IJivXdRS5KEA8y8AxelVyg==:hsXm4bWqWUB7LMDkeBM=', 'Lhso2mZhJr8hyPpK:y3kMZqkxa462GjLqpNl1gg==:f55r0xELqrZiAMoztA==', 'individual_therapy', 'scheduled', '2026-03-17 15:00:00', '2026-03-17 15:50:00', '2026-03-17 15:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-002-completed', 'system', 'client-002', 'staff-counselor-ricardo', 'WUcYSlxZwAAKTfjm:uOKy7YwCSjkSEGF5A5zCAA==:wlhV37nbMIFz8MMyvuY=', 'ScQpVhI9vEboyPqr:SAxtGaMd8V+Lc1UutWo1uA==:dr3MuXOPV5hIUQkx0g==', 'individual_therapy', 'completed', '2026-03-24 16:30:00', '2026-03-24 17:20:00', '2026-03-24 16:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-002-note', 'system', 'client-002', 'staff-counselor-ricardo', 'Jzj9r2nXZrlAD9wC:b55/IA++kKpZQL6ZHwXa5g==:F7O+3MrYpzAghtj36P0=', 'b3PpHXeSH1sDggZk:bhJWLSQEa/8vsn9K5ggQzQ==:Vp8xc6MVGIiC0dFzRQ==', 'individual_therapy', 'completed', '2026-03-31 17:00:00', '2026-03-31 17:50:00', '2026-03-31 17:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 1);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-002-future-1', 'system', 'client-002', 'staff-counselor-ricardo', 'P6yonIBEsShShU9d:wJBNxIJIkxQY4JBm0VOvDw==:iIvNtZcQvBIdeAEABdA=', 'ayVQ2OwrF9azGkvM:eJFK4UXcSif7X6Cqs7pENA==:8C+xwb/Nh4FNiy9RhQ==', 'individual_therapy', 'scheduled', '2026-04-14 11:00:00', '2026-04-14 11:50:00', '2026-04-14 11:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-002-future-2', 'system', 'client-002', 'staff-counselor-ricardo', 'ATWV44aWtfuP9qk3:GruRTjuTneyNGzhDbKlPMg==:XFRKy8zFF+6auH10pz0=', 'PLm6q8YPLlIRhFQ6:way0BoXx90VKBd0kra1ArQ==:Bny6ZRYKIsYkKRnvtw==', 'individual_therapy', 'scheduled', '2026-04-28 14:30:00', '2026-04-28 15:20:00', '2026-04-28 14:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO progress_notes
       (id, tenant_id, client_id, appointment_id, note_type, summary_enc, interventions_enc, locked, signed_by, signed_at)
     VALUES ('note-client-002', 'system', 'client-002', 'appt-client-002-note', 'progress_note', 'vxnWME9BX4MV8aka:8kt9trK8ZcNQOBM+90Guyw==:6h+OUJomNGRcR77yGS1jm1ilTfXqf11DeuSWVJ5pWSW3Ram1WzDngi/RGoGVLGYPbnOIyYR6h/zH7PdT0hF/VLFeweZG80XoWAGt4rsBf5mwrb0Qu+KAM00vLef9elWOUELUYWqG0tXqY48lLqeMwzLUbjQTWJCANxXEv5ng7YTAbFAqeZCls/83MJTYrkVP0eL0KyAc3TIRhLmbJvm79ubCU6QijS/VLs8=', '8s5Ii2i6exMTaeQD:N/6g7u0cwv9YxkKb3jUi9A==:y/VCNHtf5qVnnHcE/h1p/pMAE8HUwIYRGdWV6B/tcQyxr/m9WGz4KpLrP/Xu6rqLZICaAmt0QBykngVjXC48lDvwthCkGI3uXItdLV6YxDv8fZiCYDO5fFC5nLHG/FaHbDFDMxOvY7SaI107wNo65B5NnA/35a0Jc2QGbGmFPgAhoHuavQJKr2PKdLCmQrAp/w==', 1, 'staff-counselor-ricardo', '2026-03-31 18:00:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-002-ShortIntakeForm', 'system', 'client-002', 'ShortIntakeForm', 'Short Intake Form', 'account_signup', '2026-03-24 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-31 17:50:00', '2026-03-31 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-002-ShortIntakeForm', 'system', 'form-client-002-ShortIntakeForm', 'client-002', 'ShortIntakeForm', 'Short Intake Form', 1, 'client', 'RftPOJcHredzu9Bi:xz8ZCnYSsZZD0jZ5XG7RsA==:NG8rpez2tCXnJ1JP3NvN7r/z6Y1MTtLXuLMnnUPvRwwZ+cSIDZw+U4FO2wvj2L+rHkC0a6jh+zIiDvRuNnjZNY5K2yEht+RC3QIX0Pj3wBWoa4eFS2+QmdgvHcMpowCk7T4DefYT3C5nMvod8aB0vT7BUtEgDBgDPMN05DwLf7yXx2ie6B3e+mosJryFg5CpWBQdAHMK5iVs++sKfLUmScDQGjYqG0NK9rcQypYgUOIHfCJ17jbeelQtaxcyM2BHESz9KXZVx1EJ5HzxGYSVqWa5b505h7tHfQ9pLEQ702PqZRqbwpQpJE1C3SWBHU32KqzRybCROV65ORqq5DWQ77LwutAJtcQYlwrINqlUXc+rbHilGSUa+ATlpxAVigMLMgTdQvdy09MNMnydb7P/W5EAQ54rqaXMVDWQB3+rB6ADHDsPDmhOiDEEQld6PjTrcW8RD2UmN3AxSMJ0Q6jo1shM5UWt1ycbS6gH85P+RT33KiAjQ8jyLSEwJ44nghZUug==', NULL, NULL, NULL, '2026-03-31 17:50:00', '2026-03-31 17:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-002-InformedConsentForm', 'system', 'client-002', 'InformedConsentForm', 'Informed Consent Form', 'account_signup', '2026-03-24 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-31 17:50:00', '2026-03-31 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-002-InformedConsentForm', 'system', 'form-client-002-InformedConsentForm', 'client-002', 'InformedConsentForm', 'Informed Consent Form', 1, 'client', 'Aw7P55oCj0J3Xn98:Qxp2HhL7IlgIfwH3mCwFbg==:zxPIH+oqqM4/5lONtVd1zXKLz4r/SE6ZRWYn6CaflhmqwA7xGJMjb1VM69+HuykIxBBg1BABbujKm9zIz73E06lo/gz3Z11hByS9D0Oc3WUAfGjBPwC3nFdRSP9rBc10Lr8mEnUueV3WvKfVsyo0QWX4wA6jotIDFhx0Q1oGqjfOdqoPzcfintqikvoq5SbRrQbO10la2tJRNaQOW035lIXElK4ve6ubHIyGsKHfqFWNesi5vfZjy+k/9rEKhFpu197vuboTrnc3rahytBpM', NULL, NULL, NULL, '2026-03-31 17:50:00', '2026-03-31 17:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-002-AnxietyAssessment', 'system', 'client-002', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 'account_signup', '2026-03-24 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-31 17:50:00', '2026-03-31 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-002-AnxietyAssessment', 'system', 'form-client-002-AnxietyAssessment', 'client-002', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 1, 'client', 'BJK6iDdJuirkCcDx:Hvt+K9YPFnArcavYtQmGhA==:S2ZGiMQNqIbD6uTBnmDYw3G3xtD9cE2/GiXgsHIINPkqWxIBr7T6dv0GrdUzeJqeWCJJkA/pfF8QjQE/7Ya89eugDMnHlsuu5dFLm9u/rN281CLZHgilcre7Xjszj8dW1QpeZJavQ8kv3AidT1VOGN2qZrASeiO9V+icHV3K6hsrIrgJegC0EWwz3Q5faaOYxQbnNGxRRoGUSyvSVcngwqaICajpz6VkcZJBjTyklIU4y8k2KhI3Y5dKZQF3Nw==', 'Moderate anxiety', 11, 'Monitor weekly and reinforce grounding work.', '2026-03-31 17:50:00', '2026-03-31 17:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-002-PHQ9', 'system', 'client-002', 'PHQ9', 'PHQ-9 Depression Screener', 'account_signup', '2026-03-24 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-31 17:50:00', '2026-03-31 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-002-PHQ9', 'system', 'form-client-002-PHQ9', 'client-002', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', '6BKYhAN+9YvMQFUV:U5Jc9zPX0uUmZTUCJaE+jQ==:FpOa4Qc3vvprSQct5dU1HyK6vmt1hLSWGhUsCHTTk5LikbmDpsQ8lO+/LF0knHWHCoVlxMxkSxyUQTdug2qhjPXoEAEZeytjl1Z4U8QBaFFSHxaldQ4e8ZPN9obfbtZpgyy61kL3ZeEEPAJmOOdLm+e0OrTPA7cp78Zvg71VRa+pz+x2FkUJkQUWesPA48k+qVvZFHKJqcD2ERFL1wbCsiY6FVdviBVM4I81V5VqOKXIC4jwTt24tQ==', 'Mild depression', 8, 'Continue behavioral activation and sleep supports.', '2026-03-31 17:50:00', '2026-03-31 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-002-PHQ9-history-0', 'system', NULL, 'client-002', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', 'WpJcDZGdZqidDr3V:PD25gwYyuFbddkeXNvD1rQ==:ZM/6rfunc2sZthXOoznwXWNLPYotW7CWuH45ld8Q6c8Bx6hbh/p+JTRfoPh8pDmp326lZyimvcsWtAIlltOvqkFiAeYNQSxsk4GJxnpeKUt63rhbQM8=', 'Mild depression', 12, 'Continue behavioral activation.', '2025-12-07 00:00:00', '2025-12-07 00:00:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-002-PHQ9-history-1', 'system', NULL, 'client-002', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', 'P/nQvb4HupMhIQit:4+pFsr7LcG91ZyODyrbmSw==:1OnkBfsxFawusGWUuHucaVxgiTyg95wq3fPVHDCnATQrBM/NA8JWBvtX7iBNtTVGerPjKElHQ6cB2xQjwpymFTLrXmC8xYM3EzcV3NZFagqwHcwuIEg=', 'Moderately severe depression', 16, 'Review treatment approach.', '2026-02-05 00:00:00', '2026-02-05 00:00:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-002-PHQ9-history-2', 'system', NULL, 'client-002', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', 'ybW5Tl2+MBQX9mew:XcIlOdHq6IDuas9hPT1d8g==:M21LBrNEp5jKyyO694f/wAei2T8gIiB4iQJmlXGFtSsx44r0NXxZFSTgWuqcTVYEHAEmDwTqDvk1JsHZ7W1eGf2HUqvpvJLwcka5L126VNqoeI+XOWI=', 'Moderately severe depression', 18, 'Consider adjunctive supports.', '2026-03-23 00:00:00', '2026-03-23 00:00:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-002-AnxietyAssessment-history-3', 'system', NULL, 'client-002', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 1, 'client', '6YWry9W55N03BrLL:VzhFQr0g33ciS06Y78NrCA==:lRXkzGM2V0vFCjJtfHx9FZUdSRXswfHtzxjvQhi/ihLzOCl1RFv+U8swhRUqtb9lKlhDXyXHNshi9w==', 'Severe anxiety', 15, 'Coordinate with prescribing physician.', '2026-03-23 00:00:00', '2026-03-23 00:00:00');

INSERT INTO invoices
         (id, tenant_id, client_id, appointment_id, issued_at, due_at, status, line_items, insurance_enc, claim_status, subtotal, adjustments, total, amount_paid, balance)
       VALUES ('inv-client-002', 'system', 'client-002', 'appt-client-002-completed', '2026-03-24 17:20:00', '2026-04-03 17:20:00', 'paid', '[{\"serviceCodeId\":\"svc-001\",\"code\":\"90837\",\"description\":\"Individual Psychotherapy 60 min\",\"quantity\":1,\"unitAmount\":150,\"serviceDate\":\"2026-03-24T16:30:00.000Z\"}]', '7ZcktIenUPWe+wLi:uHe+cEcjuwnYxj4FJP0R6A==:H6nnoTUakoH8BmX1lcbXI0amfg/iN/9Q14dSkyi8dSGK7twcp6fNILbIP3/lROICaPF/G0FeHe0zed9Io7daBntpv5OMp8EPmST7pgim', 'paid', 150, 0, 150, 150, 0);

INSERT INTO payments
         (id, tenant_id, invoice_id, client_id, amount, method, received_at, reference, notes)
       VALUES ('pay-client-002', 'system', 'inv-client-002', 'client-002', 150, 'card', '2026-03-26 17:20:00', 'CARD-CLIENT-002', 'Demo payment captured during post-session reconciliation.');

INSERT INTO clients
       (id, tenant_id, first_name_enc, last_name_enc, status, faith_background, high_touchpoint, primary_counselor_id)
     VALUES ('client-003', 'system', '/61xfIMuBafwXFZW:1OP/ayTPXTuVC/OEVshtYg==:X4Mwu1Y=', 'fUWmTXe7DexozOV9:8DI5IWxuBuMNTHUby3kV1Q==:s7IZ18Xx', 'active', 'Pentecostal', 1, 'staff-counselor-ricardo');

INSERT INTO client_lifecycles
       (id, client_id, tenant_id, case_status, referral_source, emergency_contact_enc, discharge_record)
     VALUES ('life-client-003', 'client-003', 'system', 'active', 'Campus ministry referral', 'FV0L22tDAkwa3q48:/Vyqaq4uMvvhM0IqoxmeNg==:kT3foQdW1+tN/7ysanjmLrid7DWm6NqYDs4nhr4jsKPFFWhv8sJhU/Qgu2FswTFTjTta0wpPzcTMRLx37YSz31Ek+/cr4gkAuw==', '{\"readiness\":\"stable\",\"demoDataset\":true}');

INSERT INTO client_addresses
       (id, tenant_id, client_id, addr_type, line1_enc, line2_enc, city_enc, state, postal_enc, country, is_preferred)
     VALUES ('addr-client-003', 'system', 'client-003', 'primary', 'yTprP8Eob8lwMh5V:AJ19z5F2Brwk7cHkTXmqxw==:X7MhzWsEfn4xvbwntuqo', NULL, 'iWdXg+cTyekiqElX:4zKElB8so/Qn9zc/Qcp9sg==:7S/wcb2+PQ==', 'FL', 'eAlY3jLdgB/VW2w+:cEG2Kjzk+C2zmkIESXtc/g==:qk7URws=', 'US', 1);

INSERT INTO client_phones
       (id, tenant_id, client_id, phone_type, number_enc, extension, is_preferred, ok_to_text, ok_to_leave_msg)
     VALUES ('phone-client-003', 'system', 'client-003', 'cell', 'ntOpsswA83uvkQ/O:xfw4+ELDY03iW8Fk1x2Kzg==:7ph0pozjp6i4GnTz', NULL, 1, 1, 1);

INSERT INTO client_contacts
       (id, tenant_id, client_id, contact_type, name_enc, relationship, phone_enc, email_enc, is_primary, has_legal_auth, notes_enc)
     VALUES ('contact-client-003', 'system', 'client-003', 'emergency', 'XW7ohyILuhdYnJ55:STEaNgDd1BjFDlTgLewmKA==:XurXl1JKSKvA1kxITRsZ', 'spouse', '20gfE61V9pz+z6Wk:XF7ezjMY2KvtS0MV52gKkQ==:fH4kOSaiAZci2+/I', 'sFzbaOQv42jzxx45:LaLSdROd9HNrS1ICw8xXVw==:wHVswqnB17gEC3qGCG1dXPeXCzo/93F9COs=', 1, 0, 'Ws+eIXdFdWXlgdao:yN1PcybuCNjzoo4rqEgJvA==:mf1qcojO/j+akF9q17t+y8eIgCxv0dhVRDh6ThahRHAGlXRUWhaSVHCWy6IaltbS');

INSERT INTO client_insurance
       (id, tenant_id, client_id, coverage_order, carrier_name_enc, plan_name, member_id_enc, group_number_enc,
        subscriber_name_enc, subscriber_dob_enc, subscriber_rel, auth_number_enc, auth_visits_approved, auth_expires_on,
        referral_number_enc, copay_cents, effective_from, effective_to, is_active, verified_on, verified_by)
     VALUES ('ins-client-003', 'system', 'client-003', 'primary', 'fncMz9+myxGACEqQ:1W2qxumc3nFdG6esfRE7Gg==:Bc697ec=', 'SureFit Gold', 'kPJWYK/CGRvR9NVT:gOV6GPOnozGBpgZ8hVLkWQ==:0tbsj1ljaOg9iQPI9zCEJwc=', 'ur2/G3RD9wh5KEFm:BmcYgIkkpv6kONDlrNHhfg==:xlezZEJDIwyrLlJOBRlW5A==', 'RoVnlj33W8bC+r3k:G33PBjs8F84v1850Z6aYoQ==:z9fIdvrXagqBfpgq', 't6LNQaWuY12GD4wD:iCL+D73zyMj+au+kzLF8lg==:L9O+nKAWngVbvA==', 'self', 'ADHYMXjivW35EbyN:rC5TevOFzCXEdDKeWTfvTg==:jRO+mTRZV3OB+X9v811M', 12, '2026-12-31', '0IAGpdZbBeOEOz6X:oXQVQv67CIvXqKqknhRxqw==:WcGrvZ3WwGRwtDoxxFs=', 2500, '2026-01-01', '2026-12-31', 1, '2026-03-09', 'demo-finalizer');

INSERT INTO client_referring_providers
       (id, tenant_id, client_id, provider_name_enc, practice_name, npi, phone_enc, fax_enc, address_enc, referral_date, referral_notes_enc)
     VALUES ('refprov-client-003', 'system', 'client-003', 'eT3uv5J8HZVRX9zd:Bk7jitrzdqotyzOm1Hl9QQ==:BJQTg/TvPDsbijc4EpGqWQ==', 'Grace Family Medicine', 'NPI0000000', 'HPhrQtL0BjoFMF8K:nGFg3rKhcOn/uYizmMLnSQ==:AeNPpVUjkQzeFrFU', '2w2luQOOypwSmC04:0alDEAn8o+iAQPzgDvBHmg==:XXDhXHSm8+YTKpRH', 'snNnDdXcp9vYBDRQ:sCs0vynDP2cd2w9in2qokA==:R4tl3pzK9squsUj5GHdhwyznx+XVSyJMd0dRdmC90FB4gEt7sZbqNDNy9cuhl/2SvGc6wXsvAVaOH5CTEM4SNd3owqxns19F3Sms/sVnHd2S5EW4HcnnBoE=', '2026-03-09', '+WsOfi9wZJ/PP0BT:uMePK+GZSkpc3tasZ7FX/w==:HOfycChBxsujBSnGS3RcvUdA5pS2+jGVzSL80jG/oBn7bHlz6pPwYe7v4M6ZWNDlBWezj7mxuWTAgk6Qctf9EQ==');

INSERT INTO client_diagnoses
       (id, tenant_id, client_id, code_system, code, description_enc, onset_date, status, is_primary, notes_enc, diagnosed_by)
     VALUES ('diag-client-003', 'system', 'client-003', 'DSM-5', 'F43.10', 'S/nqZb6tVh+mFkHR:9l3l1yPrM7ZAiqaS2O1/Ug==:rZ0Pl8f9DU+HKd9OqkbADfXTLohM9q5NsJalOow3', '2026-03-09', 'active', 1, '83cUAt83+ofwCs80:FSxNNM1XSJRgbQUDuZljGQ==:r6tpt01ZRxzFyy41t+HhiILp1X/Ux4S/pSBIlnctnBA0YMtLYUuYiAjsjD/Qh0twtEUM03Yq', 'staff-counselor-ricardo');

INSERT INTO client_medications
       (id, tenant_id, client_id, med_name_enc, dose_enc, frequency_enc, route, prescriber_enc, start_date, end_date, is_active, reason_enc, notes_enc)
     VALUES ('med-client-003', 'system', 'client-003', 'nU+zEOtMga3G9ZGS:n/bFIWD92Ec4ULqRz4laLg==:TWMiRLCeHNM=', '+MrJT6IsXm+2OqF+:EKzgLi1Po43HC+P750i/5w==:r3tSMv0=', 'MlyB/t0Mbalj3vDf:ibBhu6NdvhHGfuTXIS+7QQ==:vtbI2iM=', 'oral', '41C8Y36BxGN96PgW:LCcApEDwSNarSMnCS0pTfA==:/VDrzO6RCMXJr/PJ75wbjA==', '2026-03-09', NULL, 1, 'j9nS6zQ9t0RcD++9:E2I+ceI/xMHZPOYGbs6wGw==:y7Xkg07XpoXX1S7T9Kr8', 'ZWXNPVEYOMDfoRi1:WBHWQhhCGrXsnG8honNo3w==:YxH3K3JIadC4IWjEO+v2U0VJ0rXWk17PGF6AizXBLGmPvUODhqcq1x6x2n8yMHTiBJU=');

INSERT INTO client_allergies
       (id, tenant_id, client_id, substance_enc, reaction_enc, severity, allergy_type, onset_date, is_active)
     VALUES ('allergy-client-003', 'system', 'client-003', 'N6CgCE3LIMuGP61d:mBYafXT022CsUBIbYIhpAw==:eWr2oFQ=', 'oo58oZiSBHP9OV0Q:YpeDmh5oD9IT61Tr21tSvA==:CXXa8xGsShYm6bpc5LQcU3ok', 'moderate', 'drug', '2026-03-09', 1);

INSERT INTO client_clinical_history
       (id, tenant_id, client_id, past_hospitalizations, hospitalizations_enc, past_surgeries, surgeries_enc,
        chronic_conditions_enc, pcp_name_enc, pcp_practice_enc, pcp_phone_enc, preferred_pharmacy_enc,
        substance_use_screen_enc, mh_prior_treatment, mh_prior_treatment_enc, mh_prior_hospitalizations,
        mh_hospitalizations_enc, mh_prior_diagnoses_enc, si_current, si_history, si_plan, si_means_access,
        si_intent, hi_current, hi_history, self_harm_history, risk_notes_enc, last_risk_assessment_at, risk_assessed_by)
     VALUES ('hist-client-003', 'system', 'client-003', 0, NULL, 0, NULL, 'GmKKmNZ+TeQC1f6g:xcY/XFqPYVlL+bcORS2DXQ==:K+CEKyNf7aew8NJosV/PyxiYeFCAxlvwXdXHc/G1F7H8veF/6c5mSuEF', 'UZSSskd+lS40CFwo:jWCRGh+YCwL6U2wPCvz+Ig==:itJt92eLirYriAk3NTgU1Q==', 'o7ufcoOTzaVx9Zwq:C+K/KAnk6xWqD0EHXDFgtw==:7H9aNOoNh2tMreE3mmp2rlmi4d1M', 'jk2MuEGXdqZ4GKk7:441ZuM3PhfMgbGw5zoC8Eg==:xDulBHYQugLOEGYh', 'pRJqLwig91uG3PfR:yacOk+ANmVmD5VJqlvut3Q==:CdhIUnmIOxlR/dKGpdsZaC3xy8UEwNOiVfmmEgf1tbmClMOzUs+ljFQT2U3Mm3+y1qfv', 'qm2FCHXzfOzkXXsW:51keDuaAX9TwQeMjrerPDQ==:r0zQY7faDsDjJQILkWBztqJRTr5d2ecMrM4WhQBeK3OnZACLPv/sRVJjFjbmJIh68npyRecmCOL3YLR8xk8=', 1, 'BA+aK0UPT39aZGAb:0Ca7GOwIYY7v2sI1+xEb7Q==:Lc3L4S15JNjBa/V5h4qae3Tr8LIPmSQYIB5KQDD+nsuDhANfSsKJjkZhPL8nWg==', 0, NULL, 'zQODxHTokb3SD6aU:tdyVe4RHUszUrMN4t5e5zA==:bNaKk+Mcw4U5zKhrdrOpLBqOGBnH/LP3GIyy7ZD1', 0, 0, 0, 0, 0, 0, 0, 0, 'oTmGKOofiHYJpLqL:ViFdE7tbDp9fnQhnD/dfeA==:vB9Ts8rCAcc+FdlR0z1fEuOVYkw+GDva3Vao6XDzxlmoU5PCdO1UJkWcsXlJ9KpWadDCym9B1ODUmN6LCvKLbhU4nyEOA6NwRaLNYlEVRY6q3Ppjxc+vFw==', '2026-03-01 16:50:00', 'staff-counselor-ricardo');

INSERT INTO client_faith_profiles
       (id, tenant_id, client_id, denomination, church_name_enc, pastor_name_enc, spiritual_director_enc,
        faith_integration_level, spiritual_concerns_enc, religious_restrictions_enc, faith_strengths_enc)
     VALUES ('cfaith-client-003', 'system', 'client-003', 'Pentecostal', 'UzQqXM6c5tIhQI4O:4MsyYl1WmeUKxYxIsD8mGg==:o4FmQ+hH4CfCu3ZlkCydIyKT', 'PqUMKc/MLc15JljJ:q5ZWDa+BLYKFuxELqw1Kag==:HOalC6SfNADgfrknzGYu3Ozi', 'xUS9tq7eFynTORzg:k+aiNA9ODXGMpF3wqpjfAA==:5p7PAOmH0/LnX7fV1A==', 'open', 'Bl3BJTJHRZH5G93b:DQxuLmsqaJQpuXiqKOlzWA==:iAvPhdjj3neilS8Hx2wnf0j8IduP6gLhN9S4h9u4+aTVwllpC8Zqa3GvgKBWNXt0bO3MW38CjfJAgDGOCYqb', '9HEVuDUmJX3mXJQO:r5pc3POp76LqrwkGDYReuA==:0O5EKChVv2sgBHSdeQ==', 'H3OQ9IeeLMkRStPu:nM97AvzcPgzry81KczS5qA==:05x5sW+zYJDAtgz86FoTi5Q0lM0BWurKB4dBSkVgbu7EspnEQFtcUyMbKZrsKxtBpmUB87AKQUQmHtbpWJWGWYJiuU7/jh3Z');

INSERT INTO client_legal
       (id, tenant_id, client_id, guardian_name_enc, guardian_relationship, guardian_phone_enc, guardian_email_enc, guardian_address_enc,
        court_ordered, court_case_number_enc, court_contact_enc, court_order_expires, custody_notes_enc)
     VALUES ('legal-client-003', 'system', 'client-003', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL);

INSERT INTO consent_records
       (id, tenant_id, client_id, consent_type, signature_state, version, effective_from, effective_to, signed_at)
     VALUES ('consent-client-003', 'system', 'client-003', 'informed_consent', 'signed', 'v1', '2026-03-25 16:20:00', '2026-03-01 16:50:00', '2026-03-25 16:20:00');

INSERT INTO intake_packets
       (id, tenant_id, client_id, status, assigned_forms, submitted_at)
     VALUES ('intake-client-003', 'system', 'client-003', 'completed', '[\"ShortIntakeForm\",\"InformedConsentForm\",\"AnxietyAssessment\",\"PHQ9\"]', '2026-03-01 16:50:00');

INSERT INTO treatment_plans
       (id, tenant_id, client_id, status, goals_enc, interventions_enc, review_cadence, reviewed_at)
     VALUES ('plan-client-003', 'system', 'client-003', 'active', 'IgLIGfWbbTImSqE6:Ol30az+OPsYPvEBZbci5fA==:cQObkQJVyAvvZUtr5RTXvfT46jhao3eeX6UHPjVolc4mt3zuwaF2Kl8YAZAD0UV7J23AHVii2Q3FdkRFgOAfYGgEWLGR7dOQ14J4sGnUq9GrYKcaq+RX/4GhRQlZsOfJquRAEJDCiTgAJwqX2dNCOriD6WU+u61SKTiz3NEgZ72MocK/9e2E9zxjZLTBPaxpp+7rlJidfz3aXR6Icxu5hHpjGEi/3uG0+BGESvc5HT8aRjyTKvOzCcpuqtzXcW3wQo5ZpeBRCNXvxNwGSDeK8YLmMMwbrANAEkLgqYIbiAjlT3OuuHyGBpk3AT970yi3sr08g6OCUSt8LRNXYdATlq4=', 'YAWti6fx11ri3Q1k:odS3xdZdAPg/eZ9Tpu/OiA==:P9RZbMDgE1ptk5gtAqPyztKZw0MFxtVc8aFJJIDVoN/NhEe0Lz6VrGBhAGBOEStoIxD/ZZRuyu0VPi9qnAuBxXHxDOysynQCaGeKG+jx/DXpt6O++RG8tn3tiEXIdjYvySeVelqQk/JoAaCcMkhnCLbAM5DeaGkk', 'monthly', '2026-03-01 00:00:00');

INSERT INTO portal_accounts
       (id, tenant_id, client_id, email_enc, email_lookup_hash, password_hash, failed_attempts, locked_until, status, mfa_enabled)
     VALUES ('portal-client-003', 'system', 'client-003', 'FCTXzI2qo1bRc+XF:6nWnx2VqVdnOZ0QaU+oYzg==:axHicJsO9vgTwoXcyEIwYuCNnvn4iOC3kQ==', '839bfedc65aadc36d5e88e0a1e3659490eca03412ac145297926069d77c1bbd1', '$argon2id$v=19$m=65536,t=3,p=1$RIMtuIoYp95Ji77HbqJxxQ$gFx4zOuAa+uWbiRWuAGL2BRmHIw1Z+suw16YbdduAsc', 0, NULL, 'active', 0);

INSERT INTO portal_client_profiles
       (id, tenant_id, client_id, preferred_name_enc, contact_email_enc, contact_phone_enc, contact_preferences_enc, profile_details_enc)
     VALUES ('profile-client-003', 'system', 'client-003', 'Di6b3aTaXzaNknZn:AJASw8+o8h7wb5slpijjRg==:nZ70OKE=', 'tSQdS2k93tumU1/n:LGF/xqm8BCjrSjNwLYMw7A==:z8/y4Pwk/B+8ZLi4NEKiMh9GdCFZvnYaLg==', 'zolhFJj+NgT4Px6a:N3+ScvnXteamYQrg1CcI/Q==:heu36npMRxb0zXt0', 'R9xOPg9VsLn53xge:m17pfVN8RxzdjNteSvIF6g==:5esV/r+9jbbQKRkUhMf5w24Wk7PlW1h91poUrvWu+g==', 'p/60F5eh+EaR2nqb:RvTmirOksUs3HDMF76EIeA==:rGBKtqJK9McLkGxw/dDvy/sWXTww9/KoxkbYZofhpgHuuP/ufc6TvCEbOvuc9OYB0e2XfDNfa2ZC4vhUeA7QsWnUeE8M8UbMs9WQSLHS74mjrkUbW6WEdOLUSoE1WG5LDbb1');

INSERT INTO faith_church_referrals
       (id, tenant_id, client_id, church_name, contact_name, contact_method, status, consent_to_coordinate, notes)
     VALUES ('church-client-003', 'system', 'client-003', 'Iglesia Vida Nueva', 'Pastor Daniel Hart', 'email', 'active', 1, 'Naomi approved collaboration with church support for practical care follow-up.');

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-003-scheduled', 'system', 'client-003', 'staff-counselor-ricardo', 'fHbej00k+Cx4Alkv:XPZ35XKjbwlOXbnmcAJaSA==:FcTC2Ne0ARTI7Jq1', 'eAg4JCIvJPkuwiIx:GTOBiNzW/dunCnOjoBTXvw==:p1Qar0k4TAJ2fj0dZA==', 'individual_therapy', 'scheduled', '2026-03-18 16:00:00', '2026-03-18 16:50:00', '2026-03-18 16:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-003-completed', 'system', 'client-003', 'staff-counselor-ricardo', 'H7A7VYvwBeupNQv/:LxEmuRl5dNQhbw9NfDwtAQ==:JPW3P4yVb4VqPhUJ', '8s1zDsLCoWREYANh:e8dv31Ym6FR9dlHSLX/TNQ==:l0es//ZsM8teIfY2Ww==', 'individual_therapy', 'completed', '2026-03-25 15:30:00', '2026-03-25 16:20:00', '2026-03-25 15:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-003-note', 'system', 'client-003', 'staff-counselor-ricardo', 'Wxwz9pTzIeD8w1C6:t92SIOpeSRHAEJgycL9uNQ==:2Q0aa+yD0C0hNLjs', '0iFXHwa3QnBcQ5ku:TROeYmT24wWpj0BnNg63Ag==:1wNo/KCn4X4JgyzCtw==', 'individual_therapy', 'completed', '2026-03-01 16:00:00', '2026-03-01 16:50:00', '2026-03-01 16:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 1);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-003-future-1', 'system', 'client-003', 'staff-counselor-ricardo', '6rRwT7bJcAFIFRcQ:vRu0lZ0SYsVNHhf5ES2zEA==:ltw1gAZi6+1FLhfk', 'M7jeqKUSefHMyR92:abN7rROVc6lTF/Nvb5v2BQ==:smZ8pAL6FkmW8a4f2Q==', 'individual_therapy', 'scheduled', '2026-04-15 12:00:00', '2026-04-15 12:50:00', '2026-04-15 12:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-003-future-2', 'system', 'client-003', 'staff-counselor-ricardo', 'XI4gD/66vOefGHQV:r5wEFgrMyZ6poLmFU70q7g==:sMYLAq7vUc+eIrLN', 'abu6fiCxutvQXyl0:k+Cy1oD+mqgcFEwYLdOnGw==:cukJVi1Q8A3+hIgmgg==', 'individual_therapy', 'scheduled', '2026-04-29 13:30:00', '2026-04-29 14:20:00', '2026-04-29 13:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO progress_notes
       (id, tenant_id, client_id, appointment_id, note_type, summary_enc, interventions_enc, locked, signed_by, signed_at)
     VALUES ('note-client-003', 'system', 'client-003', 'appt-client-003-note', 'progress_note', 'wl/NHgcWaDyl41em:AowYopehr0XCXzFJnt1abQ==:uCZROP9QlrYKv8SnhCsBfYz5fdNGjrkJzRjO3Rjmx4PZkNbwhEqg34A3DawNjjgGfBWQ/JgA+x4JfUbx1pq/60gdcR1qtssUAAjUJDxl9B023H3bJlnnTZ+Syrt81LTuNdenl4snFbg+tuuwPaEeax3nKgzFJb898WdksxR7QWfoVuC/RlZlmMq3f+2zPqeE7PKq0vWjArCrWnfcmdUYw8oAZId7TFKI', 'QXqZdZqQrTUXTZNj:ZRHdxOMztPHaj8ITR+QBbA==:RgOvweipZNQXBi09cfvuMC3m3DgzXXoZJ4mUBxqLqUi5ZbRwbmcNX1io40jHnn7ICa3cKlHB+5eJNfArS6vRXXyOOAFz7d47qdSI+h8MHNaRt445mHoM74OMc3MMd/W7/SMmX0xjsSZ+XMD+rRbzTZ2LoLH2ajyDXEsHorgzk2I8wM2VtAf6/sCa8quwhqiQVQ==', 1, 'staff-counselor-ricardo', '2026-03-01 17:00:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-003-ShortIntakeForm', 'system', 'client-003', 'ShortIntakeForm', 'Short Intake Form', 'account_signup', '2026-03-25 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-01 16:50:00', '2026-03-01 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-003-ShortIntakeForm', 'system', 'form-client-003-ShortIntakeForm', 'client-003', 'ShortIntakeForm', 'Short Intake Form', 1, 'client', 'IkQ36HZJqMrWrAVz:p3oeiq9pjWESOBDYn3EO5A==:baKHeZrj395Yesu50h4TxI18Gc4G2U7prNwshwFlLlGSxLXxgS38PvqHaSfSe0z8t9fkoVanrzK9a2MkuYLmFvgIAideIGRP+QhPx/nBy6Kx6Qyyg5bzk6c595jC2+jY5Os5AOKv7bqndANkMHsMxK943CUju5Wm53Twn9wBZzRLsLUkzsSuln5xAGdrYzGP64o6FbXLKKMQ5xxcW/U+8pBSonu9XIhBN+CwQe6Iu4iX0zZ8uK4V8wi/YjW4BCP6n4nZ/sK03SyV1IjRm6ctAR58K/2qLdml8Xmshh50KfdI+xs5MbRlUEXJKivsIc02I1esFZJCqX1Acxuh+kYPVLgOcjVKm4LbQs6LicPXxtpD6A86aA9PaQEwupgtzNEnHnJrQFcbuxw5o4Op+WSDw15Aa2lvWacqepr+duegMcUiEKc6qbv9EjCWlowkvIkWKhzGn+P1Z4fps9S4F/634YwG7ukeQc8zf2YBDTf0UoKAdjkLDS7GmhO4yI+qqzTL', NULL, NULL, NULL, '2026-03-01 16:50:00', '2026-03-01 16:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-003-InformedConsentForm', 'system', 'client-003', 'InformedConsentForm', 'Informed Consent Form', 'account_signup', '2026-03-25 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-01 16:50:00', '2026-03-01 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-003-InformedConsentForm', 'system', 'form-client-003-InformedConsentForm', 'client-003', 'InformedConsentForm', 'Informed Consent Form', 1, 'client', 'cUGpwXaN7u2YosnO:nkaDbKmJ422nlKuv2lpGaQ==:nVB8iF1JBRqLVzJutq3BpwrBf6Aogc4QKK04IXcUf3K8RX/AbH5XIUB10P8+gYhWKZQC+utPY8z8y3mEscMRVZAaSernIebLX9KNdhblzGG5/7kmUkFfPZMjwxhDxd89h2No1cjq4T+rTJeG4DKzcNqsuVl6G7n8wwbSFAikQySNuOx3/lynNatykOaUghbzDmFRgIh7VOc0ApeQX67y+JhNNhAzQs0I+KiplQWmHG9YrZNkRHePfzfKMOktaKLiPnoA1XcbMVmTaZnYAA==', NULL, NULL, NULL, '2026-03-01 16:50:00', '2026-03-01 16:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-003-AnxietyAssessment', 'system', 'client-003', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 'account_signup', '2026-03-25 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-01 16:50:00', '2026-03-01 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-003-AnxietyAssessment', 'system', 'form-client-003-AnxietyAssessment', 'client-003', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 1, 'client', '9URBuJFlGnn2VQJ6:RdYZ3elcKgVQ/QQW/XI8bg==:uYQdyYSRSJojJqLRqk66gdXu/ZPlTpQch1N+RntTO8it6SsqQxMqqzbhZZE3ghmdGDy0dzgWcuZUPlmBzN9uX3QVe8MC6gmTY6Of31O4FKnzDbmQGak4hyezcwi7RZLvCYT6kFbcVHw5ThXTjay4QDOv3EGmhpCxW8/U+aPVceL/5OsjjTgEv9U3EVwbSmQ1TWj5/fEmkkJa1T7/sRTgUm9GLYp1cNrLviLf4O+nPmVmSGYrsClkzkSEVjjzdA==', 'Moderate anxiety', 11, 'Monitor weekly and reinforce grounding work.', '2026-03-01 16:50:00', '2026-03-01 16:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-003-PHQ9', 'system', 'client-003', 'PHQ9', 'PHQ-9 Depression Screener', 'account_signup', '2026-03-25 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-01 16:50:00', '2026-03-01 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-003-PHQ9', 'system', 'form-client-003-PHQ9', 'client-003', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', '32zw2MHKvseqoe1t:o1NfFY2r9LTJlZy1VFZ28Q==:56gDMU0HMSiqAzhjtFKsrtNZjbhTdvq/KTKCgkK42zuUn5eJOugtVcA7l080QD90K4jTc5UzG3C9YdZ20hSh/s7Kylt1EbDfqwmeTcS4JGjKtG/dWvQ2LS63zyNUgZaSQl0qWtDlv0uycfyGcU4R8aut28Rjju/YVatPsmBLvGoK/gjqYV7VA5WvYmg2vJyPJunIPesk0BOMCiyxwOD8yvQEX/9p6PaJUcDM/kTc0HJCpypMEr6tMQ==', 'Mild depression', 8, 'Continue behavioral activation and sleep supports.', '2026-03-01 16:50:00', '2026-03-01 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-003-PHQ9-history-0', 'system', NULL, 'client-003', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', 'pPeloMNm32cdkQ7a:Pjk2NpI/FKAloPdKKUnkow==:MuZpAHTAZ5O4PbQhzjCnWUsc6Tyof7mrOYOB05cJKRsGAyIllj0EnWC7qK/pTxZszzOBCbSSqXNfMOQFeXCTVmIm9nWSfm+m/Zpe0YfAd/ko+J9RrUE=', 'Mild depression', 12, 'Continue grounding work.', '2025-12-30 00:00:00', '2025-12-30 00:00:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-003-PCL5-history-1', 'system', NULL, 'client-003', 'PCL5', 'PCL-5 PTSD Checklist', 1, 'client', 'b6KV5h1He2YxD93C:12NfCtsUSd2kn84sWXg3yA==:QY077lyQX7C2cpRGXaClgPLWhjOhfBwjfMaukKo7KcMv/RnaNp9Y+jOerJpEFLTMWQ0hH8kgVIBM9Q==', 'Moderate PTSD symptoms', 38, 'Continue trauma-informed care.', '2025-12-30 00:00:00', '2025-12-30 00:00:00');

INSERT INTO offerings
         (id, tenant_id, client_id, counselor_id, amount_cents, received_on, note, created_by)
       VALUES ('off-client-003-01', 'system', 'client-003', 'staff-counselor-ricardo', 3000, '2026-03-06', 'Naomi shared a ministry offering after session 1.', 'acct-001');

INSERT INTO clients
       (id, tenant_id, first_name_enc, last_name_enc, status, faith_background, high_touchpoint, primary_counselor_id)
     VALUES ('client-004', 'system', 'ggWXrDMflCColI5m:qztM+EkkbC2g/9KWXxZFKA==:ARiiXzw=', 'cQCX1BhIwTrAeIet:cOBdKiQuXtsKtAj4x7KSeQ==:D21MlIhH', 'active', 'Evangelical', 0, 'staff-counselor-ricardo');

INSERT INTO client_lifecycles
       (id, client_id, tenant_id, case_status, referral_source, emergency_contact_enc, discharge_record)
     VALUES ('life-client-004', 'client-004', 'system', 'active', 'Parent self-referral', 'Xn7ngbfBxz4bPFjP:hCI+gqxHCGOOB9DJ56ecHQ==:RN9HmDifh0nl2BfN7ZqP9dummKchSKkWGT8EtbE6xnMtMnV3QHIS9DkuX6Ya0EjDWKbgqU4JleCfrEkNI6vyLXN1YyxShXGGRw==', '{\"readiness\":\"stable\",\"demoDataset\":true}');

INSERT INTO client_addresses
       (id, tenant_id, client_id, addr_type, line1_enc, line2_enc, city_enc, state, postal_enc, country, is_preferred)
     VALUES ('addr-client-004', 'system', 'client-004', 'primary', 'RQaUPbPce+r9jxqU:dldeOddjgx9QjpQxACe4WQ==:/lE2Ly9XYMLv93r3lyU=', NULL, 'lWzK+Ied0itZ0w+I:g2Qcq26bc6quO30gTsEosQ==:hCELq40vTIuL', 'FL', 'UhoTh2cJKDHIvyNR:NvCJ8AU+nx2zlqgTQRENAA==:fsNY0G4=', 'US', 1);

INSERT INTO client_phones
       (id, tenant_id, client_id, phone_type, number_enc, extension, is_preferred, ok_to_text, ok_to_leave_msg)
     VALUES ('phone-client-004', 'system', 'client-004', 'cell', 'cD6nCY4LNTouiIiy:dPHw8JuLS6Dv04I95/HFAA==:GGxouYnD1YLhONET', NULL, 1, 1, 1);

INSERT INTO client_contacts
       (id, tenant_id, client_id, contact_type, name_enc, relationship, phone_enc, email_enc, is_primary, has_legal_auth, notes_enc)
     VALUES ('contact-client-004', 'system', 'client-004', 'guardian', 'mcChk23WD+ZPe82y:AVrst7c8skdXJ/FiJMLspw==:I8C0UgGjTPJ6c/AYbA==', 'guardian', 'UcsRhJS5ZAZWMr5b:h+rZolbFx8mAf5YPNVOpbw==:K18ajNn8Ptz7XcBs', 'V/x5X9/pUmtD/TOK:9BBAzfrqMDyMQBeSKvRmzg==:LaQVWGsP7X+VDDVfRJSSOwZgauE+REks8Ya9', 1, 1, 'FcRC48JsyuKjyRfE:7l3nV0UibYBejzXsxreN1Q==:cSFBliw1qf0FL5aKusOZl3jMHlFh9rj5iNtstF0mfEQJIepgiKbnORTGkgRFQepM');

INSERT INTO client_insurance
       (id, tenant_id, client_id, coverage_order, carrier_name_enc, plan_name, member_id_enc, group_number_enc,
        subscriber_name_enc, subscriber_dob_enc, subscriber_rel, auth_number_enc, auth_visits_approved, auth_expires_on,
        referral_number_enc, copay_cents, effective_from, effective_to, is_active, verified_on, verified_by)
     VALUES ('ins-client-004', 'system', 'client-004', 'primary', 'npWj0NYCuFP9yuyt:BpE6Udn2HeqAO8m5mDOD/A==:PMqh+Osl4a1Ezn+D', 'BlueOptions', 'DPF09wQQ0lle1HUf:RbhlTpnFRr6xmLMauYNyuQ==:/LnMv/54gNaec0py5B2/Gu0=', 'h7Nc96kCqiRwHDHe:sR5rT112q7s8UPEhB+4hJw==:5USYtKO9kAg7TW87WMvMvw==', 'qFj3GpzCwfPkix53:cJ0aty71oMzeu8aJbOSGOQ==:x1QQPCMlQeGdaDf0', '6aKyPOVRph4rRVQ0:bKJuao7aIwV+QeBqm2sllA==:q/MjaMlghgIZbg==', 'self', 'myKY57EFe8p4Ui3m:QZd3iThBKMrVEwPeHl7qvg==:HsPcoE2w0FsGrwzyD73x', 12, '2026-12-31', 'xQOgCXkY6JxhT/IZ:Tm4ui81dS8lQBqDEiFaIPg==:ThZ1UizyzJgB+1Y5laI=', 2500, '2026-01-01', '2026-12-31', 1, '2026-03-10', 'demo-finalizer');

INSERT INTO client_referring_providers
       (id, tenant_id, client_id, provider_name_enc, practice_name, npi, phone_enc, fax_enc, address_enc, referral_date, referral_notes_enc)
     VALUES ('refprov-client-004', 'system', 'client-004', 'OTZQIzxFyy3Qb3Fu:LP6O+p2L2fWvkmN0r6CjsA==:/w1ljh/of3erU7mCH/XsrA==', 'Grace Family Medicine', 'NPI0000000', '6gbsndpBADA3WzqM:0TK0JmB1bjx4pIXc+PLPOw==:dQBddWcSkY2M6gNS', 'IMBkO97zXHf63jvV:GlG1yJkjBo4tEG+8H69/+A==:jnAijdr0RL5rNOAP', 'DkaqBfdtU1A0+7JF:Ci87YxDjmlDZzpRwhB6YmQ==:L4rCscOV04zMgfQMLpBfas5CwZrJJJ2lxCoL3FzeVf1nnn4EJuXrgqcU0Oz8H3RR1cfLrWqWqZKfkC2GCMbdCM2DoHqPEd9vJaqrn/sIvhZANgYee8Mi7Bcj', '2026-03-10', '3cnIViqJ4PwQMQBd:KhG9To3Y4E2TawVEQphBfQ==:mujEzv87JIhVEH8iBv0X+5Y+UjUcN1P2HU3byyQK45YLtef0TqDrHMnz5HhS3QBwygu6EzLaR10IwczvBl8aJw==');

INSERT INTO client_diagnoses
       (id, tenant_id, client_id, code_system, code, description_enc, onset_date, status, is_primary, notes_enc, diagnosed_by)
     VALUES ('diag-client-004', 'system', 'client-004', 'DSM-5', 'F90.0', 'ImzxP2a3PkHG5pAz:IuoQduT8FedHnz0MOKLIZw==:CcC9yDSA0iuxZtjGxaEGanfAS9JUvAK8BVtklUrWE0XTqyVukyekXQ==', '2026-03-10', 'active', 1, 'h7ngqqbwrhLXVjrK:mKj/oubMhZZwo5xrMe4m+g==:iICmUimFgvMgNh3HJ8uxRk9paxSQiXTi2R2NINwHfsWKLEPXKX4dLKIUvP80eO86i+/qoVzK', 'staff-counselor-ricardo');

INSERT INTO client_medications
       (id, tenant_id, client_id, med_name_enc, dose_enc, frequency_enc, route, prescriber_enc, start_date, end_date, is_active, reason_enc, notes_enc)
     VALUES ('med-client-004', 'system', 'client-004', '0rOPElcE4mCDoM4T:6sSy9IQLyhuhJb2ffoClIQ==:sJCJXaKgHds+O0H9y49d', 'bW+h2LsUWqCNAhCk:hb1mvNp1g/Kp7E+E2Ju2pw==:mzLO0fs=', 'a5GnEPr+SXZFl/CE:MnyYKRVC/MqYymdOQ+qx5Q==:JLAylQg=', 'oral', 'YqjPEosGU9Fg7Zo/:CQjWLLbyUAaKHyTmTNrxfg==:HayBF5c/VV7h67Frnf8dzA==', '2026-03-10', NULL, 1, 'OW7uZlArGlfT0YCf:9ji82FqaIBzSzlqdueBSnw==:QC/KEbIMb1weV7EKgDxb', 'BvwDj9v4ISHUoITV:GlMZ7wGxk3FcYgHgR+3PRw==:01v/s7Y3J4ljR7hWROGmKG2zhoo7ZYq1q3bTpY+WBu4Ed9Lu2iqv7zZXa5Ugai9KBmU=');

INSERT INTO client_allergies
       (id, tenant_id, client_id, substance_enc, reaction_enc, severity, allergy_type, onset_date, is_active)
     VALUES ('allergy-client-004', 'system', 'client-004', 'pxh4xIWp1sm9uHfI:0MaZGm22BULbzaFg9fC5VQ==:22ZKYb9JqA==', 'RSMm9n55zwFaONox:k0NnWHbFkD4n3x9o7W9Cpg==:wGHOZ6gHG+e7lllCQraz3FJ0', 'moderate', 'drug', '2026-03-10', 1);

INSERT INTO client_clinical_history
       (id, tenant_id, client_id, past_hospitalizations, hospitalizations_enc, past_surgeries, surgeries_enc,
        chronic_conditions_enc, pcp_name_enc, pcp_practice_enc, pcp_phone_enc, preferred_pharmacy_enc,
        substance_use_screen_enc, mh_prior_treatment, mh_prior_treatment_enc, mh_prior_hospitalizations,
        mh_hospitalizations_enc, mh_prior_diagnoses_enc, si_current, si_history, si_plan, si_means_access,
        si_intent, hi_current, hi_history, self_harm_history, risk_notes_enc, last_risk_assessment_at, risk_assessed_by)
     VALUES ('hist-client-004', 'system', 'client-004', 0, NULL, 0, NULL, 'Xf31dSozbLrX8Msn:cMvRzGdCs+vgpwokg0T4cQ==:Ra+bdSv6o+mPy7HlBbC28uDfYSX1oXVPFJ79bK1UBV5AISCwiU3OyagC', '2s1BVmzxP11r5giN:m0HREYTBkpZs3O2l3uF1Vw==:6NEuGHvXbejRDPB1cy2tZQ==', 'ZzIb7hrz4boYQ6T+:9bhNpBFvENAt6Jx35+jVKw==:n2DSLUiw0SsECA1JWu+XkyAJhK/r', 'nfYlKiHTE3sgLeLY:ag/Iq3LeGFFuZ1YQ/1KmKg==:UPicI7IZDUV4Wdqe', 'eq/wjf5JDpoaiFHW:AdsuS7TDxXjFxjzkoJ6iug==:E4dwFBkeKGSCodHGoAnOGhWBBRbaCrHqV7BalrhLzN/rOT/f4lKngZYe24ediZSMzLJL', 'WOda06NeEeonN6AY:j0ndC9Yc/hQ0Dgf9vIMHHw==:K3l6uYxnYt2+Yx+IxA+c78ZadDs7VdwDeDiyY+pAPYWvqJs74X0JJVKK6RWT0KrlpVnPuGuTSSnZwl/oVOc=', 1, 'aqSG0pb27qWRb4rO:DWrqNOAOYK0hMemIEDAEAw==:GxajmAL1yDB4Pm0v9f7Mq86ktXs8rqJkPuLvnxI8XzGlirYQCPKfctoUWLZl5g==', 0, NULL, 'tnhOWWquVovTdGHe:xKbbqwSWZE0H4556zIwdfA==:rXdyLdcBWITZoJblAOUqmyVEyMwKcVCNVo8Auwciu6bG7aHj0Gse/g==', 0, 0, 0, 0, 0, 0, 0, 0, 'jvFTjg/Y6epHqDdx:lnr+efkJmQsdqHaX+nFwiA==:pZlH6KoOkaskWWPZxhY3mWq/P+N/gDWTbnrXXUKwN3gSPO8YljOOMDN2+xBEMJKMKZ6hXAJFWww0mebR6b2m91TgJ0OelV/p1g93uedXLl6+smobarDzhw==', '2026-04-02 17:50:00', 'staff-counselor-ricardo');

INSERT INTO client_faith_profiles
       (id, tenant_id, client_id, denomination, church_name_enc, pastor_name_enc, spiritual_director_enc,
        faith_integration_level, spiritual_concerns_enc, religious_restrictions_enc, faith_strengths_enc)
     VALUES ('cfaith-client-004', 'system', 'client-004', 'Evangelical', 'NmQ0HXbNgKC+3K/M:j7MfphFRFpOAAmj09ZJDfw==:/79bWGCnSHD9ERcqtRo+TyCHDskqqEG6Cw==', 'mJYqsBryKb7/sACG:MuEC6ljNbdIYZ+Ixa3eQjg==:Opo0ty6g46QrpTMa+MrJ5pKV', '7ImM2V6jwXdvm5dt:2GXcOkK5qOnAbCQVVEq3iA==:QVRgSVAytzPmY3St5g==', 'open', 'vudWL/zOXlTbbZbM:5wdvSkwGlnQs6EpZxyocsA==:7N2Wt0BueQgONl/y7dFswxWS6JiMC2PYVa1mxR3zUC7Q+GEi++9laS1f7MK+aALxAy5Lo/MXy6SMexwfCu7j', 'dOGLPUfGpnud8vW4:L5rF9cE1Ndjkim7Z+rCCDA==:S8bJWeTqKHQP7LB2Bg==', 'vGay5FVskDP6lmGm:asPnqiGz6lfuTNakpZDnRQ==:fJNFhJUX3hsaTid8ff1g6i6UO+DeCXPmsbIEIcc8M3OYhjsv1c+H8qvuDqNF3CI6tbv3glOU/tP+d4WWiRdXh8Qxqfq7XJhU');

INSERT INTO client_legal
       (id, tenant_id, client_id, guardian_name_enc, guardian_relationship, guardian_phone_enc, guardian_email_enc, guardian_address_enc,
        court_ordered, court_case_number_enc, court_contact_enc, court_order_expires, custody_notes_enc)
     VALUES ('legal-client-004', 'system', 'client-004', 'D0At0fpoN2O55Ia8:LkZVDfbPCc0iQet+Pk0g3A==:l1WdLYZlNEOFAYuZXg==', 'parent', '3ClNzk81GQX7w8jh:qRwoQfEz4DyucqLSzAB+LQ==:qOg/4ADZBCCCw0Qw', 's8HJGJZuSVQpSjLn:OETAWu0DQUEba1l3EFv6Dg==:7n1YNwBQK+y0N8AQAN8zC/ESmdr6do9UHiOu', 'vEsFILtD9VPDtR17:IMA9DEmV48lCSd4zNh6KjQ==:OfIl0GMW5OnmoHtN2o1M2NkeRNv4KnHFju44eqBf2U4J4Sxx9wNX1z4+DUTCaxaHSYn9jgeB4zgoODv3bvn/64eKv74FFvzjAyMvyZdl2amnCQz3katBqE2X', 1, 'BkRja4l/0xZQjDJf:lMqPKgbu2VyE26QevmbOAw==:OBjzxCgxHmu5dFEC4eklfg==', 'rN1kiTFfMryFsICw:4jboVSOA61o6B4rBe/HmjA==:prj2C+tvkAqN3IgojloVUE9kCJweMRd1ERUN+e9PxDwZyP7nJvmWcmNMyokcItSlu3S9ey6Xivk=', '2026-12-31', 'ARucOHXr7U2srFuU:Ex6D9kKLCZIlSYhfGlmVSQ==:6ByuPEH8ualDB/M28Ar40HZChtkhAn7ntOJ3xwbgrtU6i5y/wCQZMgnT71jLwu7HySjtIpPgB8rH8iqlMZ9fUWm240DFgw==');

INSERT INTO consent_records
       (id, tenant_id, client_id, consent_type, signature_state, version, effective_from, effective_to, signed_at)
     VALUES ('consent-client-004', 'system', 'client-004', 'informed_consent', 'signed', 'v1', '2026-03-26 17:20:00', '2026-04-02 17:50:00', '2026-03-26 17:20:00');

INSERT INTO intake_packets
       (id, tenant_id, client_id, status, assigned_forms, submitted_at)
     VALUES ('intake-client-004', 'system', 'client-004', 'completed', '[\"ShortIntakeForm\",\"InformedConsentForm\",\"AnxietyAssessment\",\"PHQ9\"]', '2026-04-02 17:50:00');

INSERT INTO treatment_plans
       (id, tenant_id, client_id, status, goals_enc, interventions_enc, review_cadence, reviewed_at)
     VALUES ('plan-client-004', 'system', 'client-004', 'active', 'pco/6U0R/ybwb2y9:W393L8NyKtu+Kb9ZKNshVQ==:tx4FMuqaOZBDNmLyHVXYPdrDXPuL+qLvs2oq9RZ71P6Ie+w8J1Yx/wAvpMAbYTwqad4Rhq5nKtCqKRy1bx6Rdn7gIpyVv9H+fm8JeiwMJZrOpugduPK3HmXRzgbeOlhg5tnOvJdA/J3foz2LehL65neONGIid6vc6pLkVdvoge3Hlq4x9SM+5Af4rhTxrAeYvRZs+q7yh1BUYUGJLXGCKeUJ6YtVFC8DC0WdqsRBmUQD7HizMboVVMeNjlA9iHtj8Bw07O0OZTkkxJ8biWCz8yEgbS2IVTmAXDlJgCNF5xekENzMUtqy5TL769neR9NCs6WOPfgirHYpBL1uyi3Z0RkcXKHVC9VAloboqeH9k+IcfjBkG2bAZTSMx7gcLZxErksLTp6AdqZ4jvV63qBIKwGePgpw6o81v7pJIxiKiNaWgx5gHKU8ocspIb6ggVQAMy0QY7S8FRc18VrRVYG5ghFze6S/2Q==', '5H4lA8oUOPGeIr0o:feQ9QJeMvXUl0RqP8gC8Eg==:kxWUNii3uflPsVzIR6gO5HWwwRLrYqwUMJGtahbwtGL5mHx/yY7J1vjDK9Ylj5lXO7e2ZTYP70za6XqwRslsHXdtLG6fujUn4ythf9hvwizXvbSsoPzqCgpxnS9MyT1YmlY9zWd4azqAazZejF6300u3hHq5vMOy', 'monthly', '2026-05-06 00:00:00');

INSERT INTO portal_accounts
       (id, tenant_id, client_id, email_enc, email_lookup_hash, password_hash, failed_attempts, locked_until, status, mfa_enabled)
     VALUES ('portal-client-004', 'system', 'client-004', 'hzIpZF1MN4OoNERc:QvTwBMcURhobFagBqY/w9w==:5Ee7H9YL2oc600ypHqGQ0d/ZNGdO3MNpSA==', '45812da7430db7c1f030ce3a7a948e7d2ecd66051f1e76ab61a6fb3c63a374e7', '$argon2id$v=19$m=65536,t=3,p=1$RIMtuIoYp95Ji77HbqJxxQ$gFx4zOuAa+uWbiRWuAGL2BRmHIw1Z+suw16YbdduAsc', 0, NULL, 'active', 0);

INSERT INTO portal_client_profiles
       (id, tenant_id, client_id, preferred_name_enc, contact_email_enc, contact_phone_enc, contact_preferences_enc, profile_details_enc)
     VALUES ('profile-client-004', 'system', 'client-004', 'siLV0k4j53n9rfwe:AC8QXxiE1pet5I9LUHWazw==:7P6nxIM=', 'i4Hm4Bq68L/A0cXG:V85NWZJKhtS9lXsiBQGOKA==:GG2NZp5Vf3a8VSfQC54BJwASqJ7qe1DrvQ==', '3hOUzH8CXvzvLxB5:LaJFoz5x0H6ujg5lEbYkpQ==:IyEuZcHFnNmZfZI5', '+UaIVSmk5l1/hPN4:vKqeTUQxDiU2ds8fP1nY/g==:gzgHwcZpNOxf0u1mVnYAgfbe0CxOiBDxQc35X3KIvg==', 'gwB013+/hZV1gAQv:QGMfSotHMQei6naH8kuI/w==:f+Gm/hMa1I/fWLsSk9d8zIhrn2n8FoLEgLjcWDTnUayGDOXMUfG28O0pCCoO039FFtDfPSrVP6OmnYr7XyJnL/PhndZBcoJwv9pLBwGQWyGdEm1MG6XkioNMYR1reX4ik0N5');

INSERT INTO faith_church_referrals
       (id, tenant_id, client_id, church_name, contact_name, contact_method, status, consent_to_coordinate, notes)
     VALUES ('church-client-004', 'system', 'client-004', 'Redeemer Community Church', 'Pastor Daniel Hart', 'email', 'active', 1, 'Caleb approved collaboration with church support for practical care follow-up.');

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-004-scheduled', 'system', 'client-004', 'staff-counselor-ricardo', 'AlRv3Ea/kHJcYjs1:w0Xv36rIo+bdu5oLjTI9xg==:tLjdGHMNKmf4St/W', 'mRK1termFLbdh03J:b+av8XBL/dppxjw+IQdAog==:EfEff2ADL+4hSylfJw==', 'individual_therapy', 'scheduled', '2026-03-16 14:00:00', '2026-03-16 14:50:00', '2026-03-16 14:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-004-completed', 'system', 'client-004', 'staff-counselor-ricardo', 'cIKkGgmsu/FZN9zt:SyDBnt7exo81Z/xLvHdBJg==:C5kBubVqaOJIKWc8', 'EhlNVDEAA2u+MxTt:4/Y1I8kvO01ul4suLj2g8w==:zp7RPsQccs+LtBYoBw==', 'individual_therapy', 'completed', '2026-03-26 16:30:00', '2026-03-26 17:20:00', '2026-03-26 16:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-004-note', 'system', 'client-004', 'staff-counselor-ricardo', 'ZXNt/ZIao8zsY2i0:5QlW5KrG6O+Rhh6KgV5Vlw==:egv/NUDPK+QNm2UB', 'DdqLfLAReTMmPWfq:3YrYputjqW0g5vpJKQ3HcA==:+80bLsqk627V8ENXqw==', 'individual_therapy', 'completed', '2026-04-02 17:00:00', '2026-04-02 17:50:00', '2026-04-02 17:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 1);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-004-future-1', 'system', 'client-004', 'staff-counselor-ricardo', 'YpU9w6AKm5VJ8yIA:/MhLfq6x8oApyY6tkUEwaQ==:grntqUPXcsC9PTHf', 'urvzfKOxEaFgTEki:ogjszET+1t46KRuGIc6gvg==:uVIUHglcQN/LiW5PGA==', 'individual_therapy', 'scheduled', '2026-04-16 10:00:00', '2026-04-16 10:50:00', '2026-04-16 10:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-004-future-2', 'system', 'client-004', 'staff-counselor-ricardo', 'UvFfVB2GAxeerui8:FCINyNkP31ngn+W+NRLyHQ==:6W8SNtzSBGjotV4v', '80kpPMh/FuBNq85w:qPgAynzVgp+I96j+ysN4CA==:VS7q1nmzOzfYvDyKMg==', 'family_therapy', 'scheduled', '2026-04-30 14:30:00', '2026-04-30 15:20:00', '2026-04-30 14:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO progress_notes
       (id, tenant_id, client_id, appointment_id, note_type, summary_enc, interventions_enc, locked, signed_by, signed_at)
     VALUES ('note-client-004', 'system', 'client-004', 'appt-client-004-note', 'progress_note', 'zGFR1AkFP3rji+cL:5+axeDxVecbpJPRm4lVQ7Q==:V0R8bBTU7gK59M0MfONFTPyLcWSL5uZUkXdNbuZW176ZHGonKaMSQ9d4dgX1SLkAPPDhxnrRqk6nV9r8KR1YfWHJTHYbuBWMuCuxPE7xmck1vAb3zX+t71qHZV4rCpB1CUiDx2pOv/lbsLWRwyZ702/4RhOxz0I6Zgb+vSFxCImrcSyXwiekS0nkZoTWmr4nqfKlfAxKujIJTscts2GzDerlpKZqyjyGUrOi3RcY7QDbaPPk16dR6Xptbg==', 'aU+ihm8dbLf9jrSx:6E5YE40K/1cgOiPE2rvELg==:v409Rn12F4gwCaGYupSy892ZSbWViMMZ3scLloWry+QcYNNrXEcjo0PJq87m0eel6K1ckjDtg5mrbB3Uk0NNYkJ9sCZyyV68JVagRVy9/BFS3nRbStXFybdxpEFo63UvLd0lba9X52F+cbccAn1vYlsoZApmFLRw0Bipx8IQFTCG/+J10mMD3+Zl67kqzrgv4g==', 1, 'staff-counselor-ricardo', '2026-04-02 18:00:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-004-ShortIntakeForm', 'system', 'client-004', 'ShortIntakeForm', 'Short Intake Form', 'account_signup', '2026-03-26 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-02 17:50:00', '2026-04-02 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-004-ShortIntakeForm', 'system', 'form-client-004-ShortIntakeForm', 'client-004', 'ShortIntakeForm', 'Short Intake Form', 1, 'client', 'EEGC3ADqQYHfDCkn:a+pOmk3BaZxuWr91HTbMuw==:fTUlOjwo8WBTI3SyY/7NNeaZpktGZk2jHcsSNu/+D4vEJEZrRCopynNpvWp50p08lAM/LvAo0kxgzceU68uPaWaMRztOttdiX3a0/67AKu/uv1vr9BXWogw8ZO8/4t8Or7xWkqFnSt6jLLQ+sCqEEDQzLKsu5MMf9GYZIdxClZBcA8fDgqfE/ik8I4rzh9Xo9c25PzehPlz2wSZXyCYM7fR6qQ1xZBT5BC/twH3Eoc9R3qezLad0/Uq+1NcWWxliVW+lHaMe/tJkVG/CMaDN+c11d7yeiN1NJIpy9ZFPfXc5bIJUJj7c275QGc4zw0YTw2PFB+629Kv53Wr7Y3xy2HsCCu1HoENv3akXOX2Na0vhyNH8Ixu5caZwwbny8YcxLtLOZJWoR+7tQDt+4rnIJXiHfx0SgJqnwVEAY1x/ewPlBLD1O1rzpdoZOSchOfgfa4AuJFH3EaxjAnqog5eS7MrWyNSsd3WKCpVVwaVmGi18ehCquWEVtydwJGiO16gIc68oK/iCJpV3AHcdo4K2cvvO4Q==', NULL, NULL, NULL, '2026-04-02 17:50:00', '2026-04-02 17:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-004-InformedConsentForm', 'system', 'client-004', 'InformedConsentForm', 'Informed Consent Form', 'account_signup', '2026-03-26 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-02 17:50:00', '2026-04-02 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-004-InformedConsentForm', 'system', 'form-client-004-InformedConsentForm', 'client-004', 'InformedConsentForm', 'Informed Consent Form', 1, 'client', 'V/x56eXEHsbySdV1:kxpAk4kliYzAIa/lnWqJVw==:nTKJ6JblXj7m0XhL44esw7DJOW067rK6sGvlQ1TBFBCD3Em3Z07g+4NPQUH+/N8htrPYeQsKzybaD73uNqxbZyn0LlsXIB4fNqYy3gFqbDYRZCBxmAJxtcKnkoOnterDMwhKtnDzd4TKwELpd+aU4LQ5vyJ3aSfBHG/j00LKpy1ShU/C6PLY2RkpLwJoBcEsPK/Slc2pTgDBdvrmkWseabNwnDX+ERgB8PYPG6MeWNHsMqljoINLy2wNubZ5hQpyU8pRekxVfnHIffZ6Wg==', NULL, NULL, NULL, '2026-04-02 17:50:00', '2026-04-02 17:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-004-AnxietyAssessment', 'system', 'client-004', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 'account_signup', '2026-03-26 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-02 17:50:00', '2026-04-02 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-004-AnxietyAssessment', 'system', 'form-client-004-AnxietyAssessment', 'client-004', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 1, 'client', '5iApGxzgm+Mnyy8q:F1DJ2JPdX3Zew35NUUbe1g==:emAGfSJfE72tjOQq6aqr02d/NV5JI0RyTqQFC7Tmik4f5RCJ3u4rt5qNkWwMXACh6BiEsFjfVl/E4RSaTzz0BgI/5NybH2WKb6O/Ua3vXIoVaHlnFopyafUyImVytDlM19C7W/CA2lWzjhJjmLoaxD9jrjml4uB6YyNqa7ztfDU4lwH3RuIqVVlPHKoPwLmFGCQVM+p9ELudRsArXUjvdbtiLmj/VRQo7BiNO/UY8T78V1JmaiHlyYOqdqyqGA==', 'Moderate anxiety', 11, 'Monitor weekly and reinforce grounding work.', '2026-04-02 17:50:00', '2026-04-02 17:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-004-PHQ9', 'system', 'client-004', 'PHQ9', 'PHQ-9 Depression Screener', 'account_signup', '2026-03-26 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-02 17:50:00', '2026-04-02 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-004-PHQ9', 'system', 'form-client-004-PHQ9', 'client-004', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', 'YaffuLxtecs/ylOp:ISqo8OnbJnrUaY+0IKh/ig==:d5ylzAdmrsd1P3ktL6IjNosgFntfEVQYGfGYJNgi8UiGII5RdfV0XaOc0r4qkPSURK5bgcRJRnsZ/Ztgh2/BVKASzr5YQSobL7Wd90mWOztlRe19ktZuXCkIdPlpdRLnVjUWEcNHdPcktX6+DyFToxV6RgYk8B5X5nx3IEQYDZeIIyFxUn+kF2tnHFHDkxReD+2R2yFv/sWNm8EG5WFC58teiss3biKPcBI3fJmAHBJTds7C8HOAzg==', 'Mild depression', 8, 'Continue behavioral activation and sleep supports.', '2026-04-02 17:50:00', '2026-04-02 17:50:00');

INSERT INTO clients
       (id, tenant_id, first_name_enc, last_name_enc, status, faith_background, high_touchpoint, primary_counselor_id)
     VALUES ('client-005', 'system', 'mjdjjx3M4oT474/z:SVXlHJ8WnLCrj3aVurfi8Q==:GP20Z/g=', '+Br43FXY1MVEGrJS:kPqFPDpsMx6LhaKpDoBQFw==:dWg2vWPE8V8Y', 'active', 'Catholic', 0, 'staff-counselor-ricardo');

INSERT INTO client_lifecycles
       (id, client_id, tenant_id, case_status, referral_source, emergency_contact_enc, discharge_record)
     VALUES ('life-client-005', 'client-005', 'system', 'active', 'OB/GYN referral', '/HEPlPk25PUYOC3x:QlWbGPdRSgrOTyiWym8/TA==:rlU/JUThON9oAw/7ihyT3DV0ZXYL6YakkERkV60p1D3ay3TzmhrA5ILBCm3RbK3LHAO0dTKnQ6cPXdhjs31A/V/6JduhjcQiIg==', '{\"readiness\":\"stable\",\"demoDataset\":true}');

INSERT INTO client_addresses
       (id, tenant_id, client_id, addr_type, line1_enc, line2_enc, city_enc, state, postal_enc, country, is_preferred)
     VALUES ('addr-client-005', 'system', 'client-005', 'primary', 'AJK+B2MqEapvlXl6:54Kv54TBraScTdzz9FaEag==:uMH94G8zFvdRxQWM7TuaPQ==', NULL, 'cD5bbegJ+vpf+64J:UiT/3txSJN8OvZAiWaYQ0w==:eJlYWo8=', 'FL', '2Ej07JZ36fGtUUdQ:nD0KB7iKLvq2B2L8Xkv+bg==:0B6cJB0=', 'US', 1);

INSERT INTO client_phones
       (id, tenant_id, client_id, phone_type, number_enc, extension, is_preferred, ok_to_text, ok_to_leave_msg)
     VALUES ('phone-client-005', 'system', 'client-005', 'cell', 'L7lqyW8l6KK5+mfy:v8Gienn+gqSmS4xS3LNB2g==:7YyYOI8OuhWBFIIH', NULL, 1, 1, 1);

INSERT INTO client_contacts
       (id, tenant_id, client_id, contact_type, name_enc, relationship, phone_enc, email_enc, is_primary, has_legal_auth, notes_enc)
     VALUES ('contact-client-005', 'system', 'client-005', 'emergency', 'A68idufswERuB9Ru:/qn7t8B79gqGzq3d84765w==:VUZQjc5qus6+OaBzb+qn', 'spouse', 'cdXjmP69fWYr5nsM:YcGavUxX2xEm5joNQaGNOQ==:tSo2k3/si2MQd7k2', 'M6Cb3ZhckO3V5XYS:a7hIL+l9NTDSK4WRtc2c4A==:tF0/5BG2gmeWrJDeoL8Ng+IhxJHYC4P0rSg=', 1, 0, 'sF1KOfqOz/jCOttZ:8KCdFQMWuvdAKT/uIOKHqw==:/YBmqSkudxNpSPYK2burj1L9QzAhgkAT2d7MsLvlBxefm7qYErnnom7DyBzgbBzu');

INSERT INTO client_insurance
       (id, tenant_id, client_id, coverage_order, carrier_name_enc, plan_name, member_id_enc, group_number_enc,
        subscriber_name_enc, subscriber_dob_enc, subscriber_rel, auth_number_enc, auth_visits_approved, auth_expires_on,
        referral_number_enc, copay_cents, effective_from, effective_to, is_active, verified_on, verified_by)
     VALUES ('ins-client-005', 'system', 'client-005', 'primary', '9LBx+DtZrW3kFdFH:LTOX/xog3jNGTa16rh38AA==:JFrk+r5pFoPlVpHqd067wA==', 'Choice Plus', 'rU4x1+h1/08TnWKq:DsEF59uD56IOO4tjhBAXdA==:hIBJ/0JfZOBgjeXDKKdk2a8=', '1Q+v0lKLfPaL5Z9Q:v7lWsrIWF20PiBDeeL5H9Q==:+ko8MjkGXdjw6ExcV9DyZw==', 'icxJ2gvFX8xZZ0IB:8EQHErArrF8huQagPbSGNw==:0g8bOMiUugISpLOeMaQk', 'rIa8D0cScYNjDLKr:lplO2NgsjB3lJ8266riPUQ==:Z8PmXzXYaEzQzw==', 'self', 'lfKMhzA8G4/kd2ox:cdzrG1x47I4dWIofD7vrkQ==:a9FjH1kV3BYAIyyJNBJV', 12, '2026-12-31', 'smLybxb3VmEsH5wW:8VqjJBIIzDhvkJ7iMmcGlg==:NwZxGF2sFZTQZ7qtvK0=', 2500, '2026-01-01', '2026-12-31', 1, '2026-03-11', 'demo-finalizer');

INSERT INTO client_referring_providers
       (id, tenant_id, client_id, provider_name_enc, practice_name, npi, phone_enc, fax_enc, address_enc, referral_date, referral_notes_enc)
     VALUES ('refprov-client-005', 'system', 'client-005', 'OtWlArY51VAPJcwg:wbp1qp6o6QvO+hc4dbnxpg==:sMbdYbu39W33vEXIpuoREg==', 'Grace Family Medicine', 'NPI0000000', 'UtkM+7LnJOAMqpir:KghJ9qB4X66eiOJUXBC1NQ==:OmyW4tfOAniVoEAs', 'lwBlIkeelHC19t3L:Hl51RKggjPg50HbIueeOqg==:aL0Sy2Sjq6DlKqHo', 'QuWN+/NZRS+VzIOB:vAekrKclQx1sCby1pDEI7A==:CSjdENdxnhVSF9jwMGifHo6y95uvfRqTe72bZN7e+yNXwkIC7HeXDb9TZ9ViPbbkK856IgRJ/Ub5kHaME1N5RJGGIyY9F/2zG49UelTVp/Kfvv2QsKQ0PA==', '2026-03-11', 'na5PSceCGRoAqgeJ:vxLUK5afpQ/lze4tWEKIWA==:OlAZhtPFBEamaP8b40U9U2AMxdhNBEYuqL8JCshVh5Em59pVCW+kXCz9kApxTxfdrt9U1sgCc85eCNM/euACbA==');

INSERT INTO client_diagnoses
       (id, tenant_id, client_id, code_system, code, description_enc, onset_date, status, is_primary, notes_enc, diagnosed_by)
     VALUES ('diag-client-005', 'system', 'client-005', 'DSM-5', 'F43.23', '40Yl5EgPSG+OzWY2:3ER5d4rsrBmNm9lAhs3Haw==:y8DF3WkuxDfp0KPWUiGO+dkIYW2E85UzHBF6aoMJJG1PcS/zDFSnIt6Q45m/glFtNjbaQuRHrFBt', '2026-03-11', 'active', 1, 'frJICtBr2gHF6EmH:nUfumtqJ6xT04lBl36lDLQ==:L9LHBjzhgnMQXvx2PEHyIzYC497xnNwGDq1pyRK7O6V3jneE7uZ0+NXGclJDKHf0HOzPJ+bL', 'staff-counselor-ricardo');

INSERT INTO client_medications
       (id, tenant_id, client_id, med_name_enc, dose_enc, frequency_enc, route, prescriber_enc, start_date, end_date, is_active, reason_enc, notes_enc)
     VALUES ('med-client-005', 'system', 'client-005', 'ttvZnDogcdRjvZao:iB7kwngO6YKKEEUyzDWHqA==:hQha+6OgNBak9fE=', 'smGqrhFTp7FV6DSJ:nJP1FuFAMrxGJ1BfYZ/Vyg==:F116nH4=', 'ev1qBJZmLvlSaKqY:mzivfyhAJq5AqkIYmqNSGQ==:bDIR5Yg=', 'oral', 'ezZqdc4oxV0hWeUX:OZuAC2UYPlMk3LI5r86U0w==:SpTu5uKnAKeg/0LbUNx9pQ==', '2026-03-11', NULL, 1, 'pbNRQk9fmAMTooI5:CZ9h2D9Mi1GzGYuS93Xb7A==:vOK40TeBHR6wwPdBMJ5y', '18cOj75xMJTJvojB:GYyExsGH9md9Zif5WA9BRA==:+Wli1XJzLajxNPQf7fAOCoBxMCj0mG0Iu9Dv9Qm3OacxE6V1h9+KoHiPZ6mW3cler3M=');

INSERT INTO client_allergies
       (id, tenant_id, client_id, substance_enc, reaction_enc, severity, allergy_type, onset_date, is_active)
     VALUES ('allergy-client-005', 'system', 'client-005', 'zY+YK7WlhltRW0gj:6PXYff5+yOCvMybqshWH7Q==:9HK0SHcmIqb1Sbs=', 'oZblhv2EYGEyDHoc:S6KRmPaVy9YeXAIm6MOmzA==:DTez2JAyiC2ECmcxzBxdn/l3', 'moderate', 'drug', '2026-03-11', 1);

INSERT INTO client_clinical_history
       (id, tenant_id, client_id, past_hospitalizations, hospitalizations_enc, past_surgeries, surgeries_enc,
        chronic_conditions_enc, pcp_name_enc, pcp_practice_enc, pcp_phone_enc, preferred_pharmacy_enc,
        substance_use_screen_enc, mh_prior_treatment, mh_prior_treatment_enc, mh_prior_hospitalizations,
        mh_hospitalizations_enc, mh_prior_diagnoses_enc, si_current, si_history, si_plan, si_means_access,
        si_intent, hi_current, hi_history, self_harm_history, risk_notes_enc, last_risk_assessment_at, risk_assessed_by)
     VALUES ('hist-client-005', 'system', 'client-005', 0, NULL, 0, NULL, 'EFG1dER1/Vgl1zgU:MMdxV9D2fIJkUtJ1riJF+Q==:iPSymBASP7fjZcNGIvbArl4xAULjDeV0qlu7z2NtRXxDnmDIZ5lWYMJ2', 'z/bqb37Q0TahW9f2:JESReVVXUMkRhNRWNCcbeA==:mGyDFzRCROklgdEGu3OUAA==', 'KctYwY8kIEpBALdW:Nyyce9BHywtl7jVzoGVrWQ==:1Pfc2zCSHBJa2SCB/I7aiI3nAD8+', 'to0UGbGMODULpFtW:25co65VEwHY2dLWLnuD1ZA==:jAjIFiIn6Yz61VlW', '4mjHpeRDWfrEa9uc:7aXOS26B3jtWs3PoH42zog==:u3Q05BdghVJ3fgHQ+ktfEe94/NEaz10jUEBQOVufSoAVWFdx+4TxRp1Kiv5y9YGQhg8M', 'Og/ib6whMgGnDH4Z:8EA9uaLWMJvSOA9Qomhc+w==:W6B4PoNpG4Y1aAQiKlLtNYZRwCguX27AF4wU0po+fgwJB/u/YfrmnsOrJMWYmXcpwOzlwFdraXI2w2otI38=', 1, 'rPikMVmgjXtpcoVJ:WcVzYL8CJOUozppl2UPV6A==:fhadf7rPMKML916vl2Px2Z5EOMMqb31yCCQOPsTcMjUVWi9GVmarZb9MO7boFQ==', 0, NULL, '7GUc1Xyp1N2OgoUG:KlQ8GddRqWEG+QQpWf73Zg==:hL9oiIYsDvpro4DcIoziO8twclBm5GqrRDzOqTM5e5oW+rfWLO31Bsh3WpiG2/TdybYVtVn0TcyF', 0, 0, 0, 0, 0, 0, 0, 0, 'TXEqJhKa7D0T8QdD:Lk9DYUluDeHa9SpD6Ynixw==:L130jrZWbaky0acBdtwgIg22jXFNHiRx4ijPVSStUG4Ir+qMr/03AYElSFgNIC9nOBonq1IkmImMF2v8GuURLdyd/2DRxkEonOVWgvssG0PsvbENkNPUTw==', '2026-04-03 16:50:00', 'staff-counselor-ricardo');

INSERT INTO client_faith_profiles
       (id, tenant_id, client_id, denomination, church_name_enc, pastor_name_enc, spiritual_director_enc,
        faith_integration_level, spiritual_concerns_enc, religious_restrictions_enc, faith_strengths_enc)
     VALUES ('cfaith-client-005', 'system', 'client-005', 'Catholic', 'rXZT5jH9nqaNU0hK:KkXD0TbjhdttP0JCZ9uEMQ==:arUDW78fA0maSeDVlwxP28/A', 'mtpNISYjikxt4S0p:piqzeB6RDy9fJdDp+X3Pyw==:i7XL1EqKlLDB7tVlBaMe2jln', 'HFUX735l45Aw/ZFs:lGA+hPRJSce8B2vocUteNw==:PO8LiaBZ9XWYkxz51w==', 'actively_integrated', 'yEl5kGqBTINKMqFc:Kk2VBU5k4A7xJdUE3YjWzg==:nkxvkfwP0TphH3/JxLEezRVB5eSigYF5gxaTZrPVakiEApcogyF7NkcxA/Ic/gQiry03Req/Lyv3bjfqyXLj', 'b/1DDW809oA0TDZ8:mWLBUsSSi2yqshigml/xrg==:oVYixxuNmV29y172zQ==', 'g+/gbKkxZALPqhCc:1gh6bEDm70VYiAF3TvjSGQ==:Kkn3+7On/SSB1NpTI7AkflPl+MoEUB9TSBGkTA8ilQP5Ngo4Ly0b2rqjz5Tie9CLGrC+s5dCjLBpga2fifjZ1GuculiKrvR8');

INSERT INTO client_legal
       (id, tenant_id, client_id, guardian_name_enc, guardian_relationship, guardian_phone_enc, guardian_email_enc, guardian_address_enc,
        court_ordered, court_case_number_enc, court_contact_enc, court_order_expires, custody_notes_enc)
     VALUES ('legal-client-005', 'system', 'client-005', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL);

INSERT INTO consent_records
       (id, tenant_id, client_id, consent_type, signature_state, version, effective_from, effective_to, signed_at)
     VALUES ('consent-client-005', 'system', 'client-005', 'informed_consent', 'signed', 'v1', '2026-03-23 16:20:00', '2026-04-03 16:50:00', '2026-03-23 16:20:00');

INSERT INTO intake_packets
       (id, tenant_id, client_id, status, assigned_forms, submitted_at)
     VALUES ('intake-client-005', 'system', 'client-005', 'completed', '[\"ShortIntakeForm\",\"InformedConsentForm\",\"AnxietyAssessment\",\"PHQ9\"]', '2026-04-03 16:50:00');

INSERT INTO treatment_plans
       (id, tenant_id, client_id, status, goals_enc, interventions_enc, review_cadence, reviewed_at)
     VALUES ('plan-client-005', 'system', 'client-005', 'active', 'X+I5xmhI6ZaJHscZ:pSsoAcgjjCPtI11pGghCUg==:8MAZKFPKJwjLx6QXorfIS4BLYhRyPVqPw2SGa/zoY3C8mp1QTUNFtCHtWFHC4v7CTZbk8k7ft0pCNg5ykI81HzRwmYDjErGjorqIXzc7piQ1CkoX4NC47Nye1ZZA1EHJUAvxM1tZ8X9fvXKbcNf5rqMMS2pvNMzcOw7Vc+Omiz4SvdpV4B5W+hL37UjzWCPmopXthNf5TL6QA1vi1gurUp6f3JK4YGxwJ5EVZzuIhLk3LLfETHQpA7677YXAB1dYEDNXqv/rEFd/LvJxO1Wgrfn0VbqZM39uIkyML9GxZ+ti0H7c28dxNM69YcPiPZx3JKVhsInOXMAIXjsZLjhH6uO9loTn01++Ly/LbAK0xZStVGn1w5EvVrjVvSLACaGur43J+lJH25ioziAOLbKlV4xd7Vm86Lc6dSJ5/VuaevNit723SVcwWeP+vuWKKdWd2+aj5sRov2ZM8BtVuq0/ukQfiaeqY9XV14qX3n5UZpcax7Eax0A=', '8vCySeHrAGUOjLnV:SP7N2Mn9tZwS+DJhwsbJbA==:cdpa0YiMl/aPKZwRppbApEHDPdorSCu+1HN9AvmJSWySGuC+p2fv8JxbIaHL84bW/7PKb3E0yU5xK5w2dnYRwQYEJh7F0bceVj3zgITOx3lA0PF5XjKlan8NbbrcHFSkntaM3lI/BgPd583nrSxeELMryHQGZvDm', 'monthly', '2026-03-30 00:00:00');

INSERT INTO portal_accounts
       (id, tenant_id, client_id, email_enc, email_lookup_hash, password_hash, failed_attempts, locked_until, status, mfa_enabled)
     VALUES ('portal-client-005', 'system', 'client-005', 'yj5n7p+iGw7m1JrK:cq244+jXNjRd+fMT61nadQ==:QOMaUNvE7IsB76+DMcF+fd4MCRZ7aam/wTlbaA==', '27946791d513d989e463a6dad97bf70ba23fa93067fa5f33f45e0d4beddaf068', '$argon2id$v=19$m=65536,t=3,p=1$RIMtuIoYp95Ji77HbqJxxQ$gFx4zOuAa+uWbiRWuAGL2BRmHIw1Z+suw16YbdduAsc', 0, NULL, 'active', 0);

INSERT INTO portal_client_profiles
       (id, tenant_id, client_id, preferred_name_enc, contact_email_enc, contact_phone_enc, contact_preferences_enc, profile_details_enc)
     VALUES ('profile-client-005', 'system', 'client-005', 'J8BVGXy+ouaYCmjz:cU2wwHYJakgb2E5Ydf5UpA==:5XWNUII=', 'tkXDmbXPKF4EbXQd:V/Vla7m5ElmGGB29NoFLqw==:PBWn4qi+goiohtA7fN/k6zxYD19s2Pse6WcT/g==', 'B2d+MV7WhQMFkw1T:9qBIKYohryzQ3pMBTo6BDg==:esrjbSFOwNIFbmy0', 'ucFfdnMZRBd2fY9t:uRWGHSB2PIZXqkdiBnnJPg==:WMfMMMAftqUEqohpU6UhmxLUPNMHknAXP1p3oeTltw==', 'M/DJbEE3vsRqURnW:XB6WJgQD86l8Mnde2TN1Yg==:DYHDtMP7+cb77i4R8v+jnTvRmSJVecvirewSmbayp0o33nJcJUs5y4a/RJrT7/YW14QWTloqEwYFkD5aZrYlLsLE2T+AOBDJo+vnGbi83HzjMV/II9zxiWHGMqATAUMD');

INSERT INTO faith_church_referrals
       (id, tenant_id, client_id, church_name, contact_name, contact_method, status, consent_to_coordinate, notes)
     VALUES ('church-client-005', 'system', 'client-005', 'St. Timothy Parish', 'Pastor Daniel Hart', 'email', 'active', 1, 'Sofia approved collaboration with church support for practical care follow-up.');

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-005-scheduled', 'system', 'client-005', 'staff-counselor-ricardo', 'jZvn9og+oH4LK/U9:kN1jME5J4S7G10Re5G0ZHA==:Qq5Apa6+UDuwopGrancd', 'phSn0yaIj9hqdrRj:BNn0yaT4VGRKnTQwlKWB2Q==:ZUBI+OAjeL12H8im7A==', 'intake_assessment', 'scheduled', '2026-03-17 15:00:00', '2026-03-17 15:50:00', '2026-03-17 15:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-005-completed', 'system', 'client-005', 'staff-counselor-ricardo', 'oQ9hEH+iBbgETG3/:V33v3UYwKcfoLaGJ8CfdwA==:LDKL67heUoUWaHHFgVOv', '1eXWCmvY6hRJHDAJ:+DP70o9/DF1nzYbEefg3PQ==:8ynlGacDII+C9NnqOA==', 'individual_therapy', 'completed', '2026-03-23 15:30:00', '2026-03-23 16:20:00', '2026-03-23 15:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-005-note', 'system', 'client-005', 'staff-counselor-ricardo', '9BTOHZR1l/FgGoH4:9EOr2+x+Cv5G9r8ioLvWqw==:BKkgg+yhf7yN9o8B4s23', '1YgKQahN3rgYgy3M:PHGp+gyzt13OUOAz2VCPJA==:ovl4rp3A3jvA07BX8w==', 'individual_therapy', 'completed', '2026-04-03 16:00:00', '2026-04-03 16:50:00', '2026-04-03 16:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 1);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-005-future-1', 'system', 'client-005', 'staff-counselor-ricardo', '3TJCRV7kyVw5KObJ:ioti9wPSUuy1j8wuFulouA==:s16N+AzCZpOJXekm3ljb', 'bHHa1iaLUwNScEBk:nGtOdw9fhxn7lb9jZqVZZA==:fl6fWlGRnulGjXT8qA==', 'individual_therapy', 'scheduled', '2026-04-13 11:00:00', '2026-04-13 11:50:00', '2026-04-13 11:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-005-future-2', 'system', 'client-005', 'staff-counselor-ricardo', 'nj7FtU/wQFa9SstW:wcFzavjWozp4Bvye13Ndbg==:ckVkw8FasFoBZv7ae16Z', 'PBUNkSAToX5jnYUS:YtGl5OLmMtFoNMTEshGCxg==:sDQorPg8ElDSpWMGug==', 'individual_therapy', 'scheduled', '2026-05-01 13:30:00', '2026-05-01 14:20:00', '2026-05-01 13:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO progress_notes
       (id, tenant_id, client_id, appointment_id, note_type, summary_enc, interventions_enc, locked, signed_by, signed_at)
     VALUES ('note-client-005', 'system', 'client-005', 'appt-client-005-note', 'progress_note', 'v8gt9AQ4Nb0MVPG+:cfD3irNygjb6XZ/jYAb9VA==:KuY3zJIUIPMtUVxzgNMqNdhQ986tSkZIzwK0CoVFBKtHprih4jE4kaD+FjyqIfuL2OUEARaszzkHxvAOfJUsp/UyxnxeKeiYc8fuJZFZz97m5PBe56/Tmf3QydE2KVos40hTa/kUdc+azJV3tUJwnaay4idul/p7TpEnXY+LWQMDnyeQA4QlovYKV1SjDfPOxf/VBJGuYONhoddF2NLzj36aX/wMi8Fq', 'mWbeIbA9j3B94UUn:bWbcC44zZ+ag1qwM0Gy/jw==:7bRU0ks1S2+U6dy52UrwtlvlQXFa9Rwrf49fmXgQeLHWtS6bXdUMi7PC0x18KG8wPhy5vJ8wgK96LNRWDF4VtO/cNdeGzGZhOAlIye+RE8hwJx4SjV+6+2K/h9j0Kams/q1ewQg3LCzafkckdIsoLvsu30CsQZkrfPsBosM+fBm2BUswzBhIqzbUtfedwqTlNg==', 1, 'staff-counselor-ricardo', '2026-04-03 17:00:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-005-ShortIntakeForm', 'system', 'client-005', 'ShortIntakeForm', 'Short Intake Form', 'account_signup', '2026-03-23 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-03 16:50:00', '2026-04-03 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-005-ShortIntakeForm', 'system', 'form-client-005-ShortIntakeForm', 'client-005', 'ShortIntakeForm', 'Short Intake Form', 1, 'client', 'Gvl6Wwtysh8eCBxH:q6q7ILIe9z4kZHQ0ML6qvQ==:+FZsMgxjUYxWFKIeqPxEvqSvvlJC6ObWHQVQf2nRCJ7fX5MXrnaVLi+8uEyjPdbDlq41UXrGWFsR6Ty73dialRbox7xCgWSgZ/HP6vvPWfVxpO3WjN4jS9rbCiJ9X2Bkf/iTwyXmHMHDYqiKcyi4osUHIKeuw3uVUqtxLFn0Ie4rxwDwbrcJcPQZwoNs3xpPWa65oq2W/loUW2CMWabLPvYH9AbmB4LdeEQNrNPF7qh02YdN1MzhRVd6jsj8QJNtOuLW1is4DrYR+2kbKmmkcGNTEVkaezqfkdbObiDQX1soQTSoYAs3QOAk6pdivP9p17oN2+m/dznJp/Pc6rAi99HqG+Z9oxPyd/MPBcAvagvrWfLva+R0as3fU7+PZLVCMeNs+94QeoMc+WGo8pZi4wtTCMrveCtxqG2J6Q3fiSBSsYJMRz0a2iwQ25snEp30ZqjMtYuay1pccDcMf/hWebeCljdxDNqfJfUGbH/OeVjQmMelDQ0ISNbVEIok0+1y', NULL, NULL, NULL, '2026-04-03 16:50:00', '2026-04-03 16:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-005-InformedConsentForm', 'system', 'client-005', 'InformedConsentForm', 'Informed Consent Form', 'account_signup', '2026-03-23 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-03 16:50:00', '2026-04-03 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-005-InformedConsentForm', 'system', 'form-client-005-InformedConsentForm', 'client-005', 'InformedConsentForm', 'Informed Consent Form', 1, 'client', 'JW+lVwm4yEaKNkuk:MNRwfjdvM/7YewmiL7Q/EA==:uR5FAgNTwwI1guWf3OBRkiIYhoEBUwHSy3RZFfaJofytICVvuiDH4X2egXlaaerVtcf4HY9CNYxVUN3QI1UsJ65UEap2/uZEwIRSj+6sWR83ojMFFty+nrXZbyFy2KgnH8Cf5Ymm5EMoW5R3vWFIzkFgzvVjXLuqqdW17K3cLMVNt6NQ8MkMKJgx9flPPwrkQlZACoRgk1wOSDreM0CMUhFX8BqFZJg6Fvms8S54s0AMsUrcVcW7r321r5xpWGDxIPwBUqK3qc6129jGkHe+Zw==', NULL, NULL, NULL, '2026-04-03 16:50:00', '2026-04-03 16:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-005-AnxietyAssessment', 'system', 'client-005', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 'account_signup', '2026-03-23 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-03 16:50:00', '2026-04-03 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-005-AnxietyAssessment', 'system', 'form-client-005-AnxietyAssessment', 'client-005', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 1, 'client', 'w4rC/+bQzXOQMeX4:uu4A98qFosq4O9rUfprJQw==:HyzfXSDy7cgUPZ9Bf0FWR6ofle/zbW3GoumyJUFKv6GIB6/Bh1OVjdX62ckS912ugiHkiARb6AftbvQsunpmbyXOV/Xb4MVHfuBX/h04jsBwORK/hyeG6TPXbaHj0p7RmuaJJ3S4F1DzBgNwOlPQtqkwhbEVrqm/5Tctm9IDZpwjJqegK9TfLUsCVZqRnyTAB1Pm7gQj6lpXnmgX7DGytoTOMMIdDn6tgoqY7Zjvm2yzWDt/a3zL9rCRQL0eEA==', 'Moderate anxiety', 11, 'Monitor weekly and reinforce grounding work.', '2026-04-03 16:50:00', '2026-04-03 16:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-005-PHQ9', 'system', 'client-005', 'PHQ9', 'PHQ-9 Depression Screener', 'account_signup', '2026-03-23 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-03 16:50:00', '2026-04-03 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-005-PHQ9', 'system', 'form-client-005-PHQ9', 'client-005', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', 'LozhnoA3p1YdM8T+:YHm6OBlsApC1JAywvtaZMA==:eLfllTzlsz2Wjsj3X+3+xrwnZNxJ5kFGQqdfFo092Sac31itsr0K+bMOvNOEunm5nvvycQLe0ph1Nll8bF6NfD7Q9OKJbS9SlQVQihdiSnOrQTx8tnflclKZrdfX/tsq5pqprmLs6LGdugivnWkmWjyPRFNoWQHsgKwj22fzYo5mdyFkn/qpkJXDcdYUYDkHQOIZ+JYAa0INiEZ2cRE0GsWfN/cVkJXRVXwnfEDNQjePrp4u9xGeVA==', 'Mild depression', 8, 'Continue behavioral activation and sleep supports.', '2026-04-03 16:50:00', '2026-04-03 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-005-PHQ9-history-0', 'system', NULL, 'client-005', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', 'lZyhzQDjbvIEx4M/:tO5FaXCjMfYZhkKTOwCGRg==:7SvkCdbM5tV1OHl3ZpAIrMTi+Pi1IMmmMecjhDK9oSalCUtb0ETVPaqVNizppy3rYZo3JnCbEMlBSaC2Cb+EMtBUaSIHVEJWUwft3gRGw5t5LehFyn8=', 'Mild depression', 10, 'Positive progress — continue current approach.', '2026-01-06 00:00:00', '2026-01-06 00:00:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-005-PHQ9-history-1', 'system', NULL, 'client-005', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', '3sCneVqoVERd+KPs:qY3o3/I+xxLHWXF3N+Id9g==:rz7bAyrUmjP8VN3x4I1yqitiPZiWNtopLToFZRh/MlMT6rqa06thr6x4uV+D2BOpud6jCBuzXl/Hz8f0cUHCotwuql6pe/m6nmdBxJh2fliduSLZdA==', 'Minimal depression', 6, 'Continued improvement.', '2026-02-20 00:00:00', '2026-02-20 00:00:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-005-PHQ9-history-2', 'system', NULL, 'client-005', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', 'HSEUH6kAFRAP4bnH:tr2CXQjFRpx2IVk+EkJyVg==:m7OUMiPu9hVARKkdxZK64hJ2FnZsrSrAnk1qO9RrsGnwI7/yvcvkCIcfQEh+x0MZhbQmdCYOSPuOXOif5FHebcuCs1g7PBesFb1gt/+wM1H2NaQG4w==', 'Minimal depression', 4, 'Goals met — discuss discharge planning.', '2026-03-30 00:00:00', '2026-03-30 00:00:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-005-AnxietyAssessment-history-3', 'system', NULL, 'client-005', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 1, 'client', 'qUIRUcmVarRfX7PY:9WO8ISKhRX9I4U00yyzeYA==:jDmr4SkUFebqPDGUJd9B4AzQ5Ze6gX1h5JrMayP3Ew16z/TUs0ZnrsPeOvT1uWzj1AlduzXAAnch', 'Mild anxiety', 5, 'Within normal range.', '2026-03-30 00:00:00', '2026-03-30 00:00:00');

INSERT INTO offerings
         (id, tenant_id, client_id, counselor_id, amount_cents, received_on, note, created_by)
       VALUES ('off-client-005-01', 'system', 'client-005', 'staff-counselor-ricardo', 4500, '2026-03-10', 'Sofia shared a ministry offering after session 1.', 'acct-001');

INSERT INTO clients
       (id, tenant_id, first_name_enc, last_name_enc, status, faith_background, high_touchpoint, primary_counselor_id)
     VALUES ('client-006', 'system', 'cvY1428vqD8LJB1Y:ErtTL4XNyReUrCX2ekshZQ==:oLahLhQ=', 'wUbmkFgQ1jNadMQy:Xtk3aa2DRyBtR4DIQ6sEoA==:wE4Iog==', 'active', 'Baptist', 1, 'staff-counselor-mercy');

INSERT INTO client_lifecycles
       (id, client_id, tenant_id, case_status, referral_source, emergency_contact_enc, discharge_record)
     VALUES ('life-client-006', 'client-006', 'system', 'active', 'Church elder referral', 'YOghs5Oir/F2c9B+:RutWHzJ3g6TvYGS2wnk9HQ==:aEOYCCu1Nglv/i5QIPKio18NoTdlyNKnNmHYBAVOPKyp7oM96H4TXiJTDAxI1/fYaJYmjok6se/43JIYaKHIZQgw1+Q6x8Q8Vw==', '{\"readiness\":\"stable\",\"demoDataset\":true}');

INSERT INTO client_addresses
       (id, tenant_id, client_id, addr_type, line1_enc, line2_enc, city_enc, state, postal_enc, country, is_preferred)
     VALUES ('addr-client-006', 'system', 'client-006', 'primary', 'Lz2bi5RlLtT+v4RU:Al4p5SoYRPDHhdrMjOY3OQ==:0u7mYnfRQFNtzECCvzo=', NULL, 'AN6CQkk7ENMfV8ld:9T4h/iRA5RUweqF1CZu+fQ==:RKARte9hFA==', 'FL', 'cHwztMSx91Wfp13D:aLQJdE9mfuxAzpHOpDoZCA==:9kEpFlE=', 'US', 1);

INSERT INTO client_phones
       (id, tenant_id, client_id, phone_type, number_enc, extension, is_preferred, ok_to_text, ok_to_leave_msg)
     VALUES ('phone-client-006', 'system', 'client-006', 'cell', 'CUPNGXXITBrdeXq9:qSubANH6stQWPz4L5h9q7A==:EBQhyutMm0hv5/M2', NULL, 1, 1, 1);

INSERT INTO client_contacts
       (id, tenant_id, client_id, contact_type, name_enc, relationship, phone_enc, email_enc, is_primary, has_legal_auth, notes_enc)
     VALUES ('contact-client-006', 'system', 'client-006', 'emergency', '/dLp5zFoffhg963r:MFGbm4wKqjC+sZGXonHaFg==:Lgg4seJQ9wkvnS/9S5Fd', 'spouse', '1bBbuZQyZ8Hg4J2L:YDrh4FaZi9ieCqV4suCdvg==:Kf9hbdPkRBSkM9YO', 'uVpIF/8whldONeQg:kM29QuY5sZCm83ZOYS8QWw==:UeYHhpKxVkhSLjfOrT+Yg+PQX0gpwIQ0IXo=', 1, 0, 'hNxSgbpvQdVmu+i0:6oqIcAE5g/5O1E0xgYpmxg==:K5giIpvdP/PTXhONYrdvG3wWdoz6FpvcTH3UH/SGzw48DmOaEyfdfz+SEZ7H79GC');

INSERT INTO client_insurance
       (id, tenant_id, client_id, coverage_order, carrier_name_enc, plan_name, member_id_enc, group_number_enc,
        subscriber_name_enc, subscriber_dob_enc, subscriber_rel, auth_number_enc, auth_visits_approved, auth_expires_on,
        referral_number_enc, copay_cents, effective_from, effective_to, is_active, verified_on, verified_by)
     VALUES ('ins-client-006', 'system', 'client-006', 'primary', 'YJv/v40tJUq3I4ER:Zvy13U1XLNmAZCjLGsvWqw==:d4HKXJyp', 'HMO Gold', 'L1/NLJIkSHJYfQc2:Ntu0PMnM1HM7qEIhgMuw8w==:dG3afPdZQsIWMFzuUgPpxLU=', 'tgLA89AP2zhkadGO:Koo61fk9dMhv8UeTs0ap1A==:Ori41Eipd8P3xOqfc3BoBg==', '97bu9P/7SIDOuY2B:mP3CE0BEXq+p8guytMRdqQ==:3XYnEh9czKMMug==', 'NwuYXYABKFW6Hu1D:oTTpcDyiuqKArdDW+oUgZg==:q6sxY0PGgcO8ew==', 'self', 'qpf2K8ki5TBQ0pIy:kixm9LxwU+C6iZ27Wq5zhA==:Byhuq41iXlBZ6vkreFk+', 12, '2026-12-31', 'N8AtUlQaBe/PPhLZ:5Hff/qPK50rd3CmnfTQXfQ==:05dGocuimIophmSAZng=', 2500, '2026-01-01', '2026-12-31', 1, '2026-03-12', 'demo-finalizer');

INSERT INTO client_referring_providers
       (id, tenant_id, client_id, provider_name_enc, practice_name, npi, phone_enc, fax_enc, address_enc, referral_date, referral_notes_enc)
     VALUES ('refprov-client-006', 'system', 'client-006', 'N8e83cTUI/aGOoBa:ypwaP7C0wVlIeUQhGpsd0w==:/XZYEMGOiP8iMfMwHYBTJA==', 'Grace Family Medicine', 'NPI0000000', 'f68zSB6qRE5BMuWn:4g4i1e62AkFLU9410RFtyA==:/ETyyCJobqWV+CLj', 'C37tlV0hP+4Ba5OB:G6QbPv5tVbMLZ+NEawtJnA==:kzzsUZIWdYOZ2RF+', 'lSqzbkLi0dPFkMvl:PfJ5y1c52hbCrXlK5owYxg==:lRGLu0HT2gDe8pur2EVLMbjJW2I5nb91uoboLeidqwRziWjxc6ils75IlaN6uFVQGdKKnWiGEfqQgEuBhOrtzIr/EciWanjl073MiomnqC5lwNpTqeEhOg==', '2026-03-12', '9UF3lNqjjJvk9Crq:P7qRMH978wyEt/+rEGPQsA==:OhyYVmYoKpBg7P4rmZtPIJ7NoQWUhwxHE8LozXxaEwBGWpp3W+HxfvpBdM+59bseCfATAIFdRZ0MEH5sE7wbTw==');

INSERT INTO client_diagnoses
       (id, tenant_id, client_id, code_system, code, description_enc, onset_date, status, is_primary, notes_enc, diagnosed_by)
     VALUES ('diag-client-006', 'system', 'client-006', 'DSM-5', 'F43.21', 'p+dL2gfPnkypJ0Un:OJYtoBsXyZpdQ1511evpfw==:19amJ0zcQv4U3WTM0SerLZCeOh/Biv30e7993OBJWF/WRmODpdHT', '2026-03-12', 'active', 1, 'QI0UKUw3lTNbyUdg:J6IslVJpt4VmxWKJqk9CDw==:mW90eyPP999d/j+ze5/y3VyAbVgEtM+SRQzRfOfR5avX/aIPAyw0CcNJMnoJ63RXJnoEfUyk', 'staff-counselor-mercy');

INSERT INTO client_medications
       (id, tenant_id, client_id, med_name_enc, dose_enc, frequency_enc, route, prescriber_enc, start_date, end_date, is_active, reason_enc, notes_enc)
     VALUES ('med-client-006', 'system', 'client-006', '1+N8lkwXovY5VaNO:OcYV/Vd7XP4domO1EVi89A==:8dVABy0lIZgVEuSq', 'MRvrfw8SkUKqvskl:ykHOjo7u1lG1aWyfysqIiQ==:tJGNS9s=', 'pZ7uXTEvOMmfEcKo:UvhtDpY7xFOh/X3eDpKDWQ==:xSdARm8=', 'oral', '58PSwj9RROrLvbdD:iYBk7mCmz3AGulZSCb19bA==:IQh2QsE557Bq7+leyFFHYw==', '2026-03-12', NULL, 1, 'jCQIn9S+9cGRIiAN:zmR0kj9cIaKi/T6gGmQK0g==:CCmTK12KIwn3y90qzbEH', 'XzKR3bFB1P5KIGfN:o8mBq8cf74+jNi237fZvJw==:ynYisxcPjfhVER8xsNICfhiyf3zv/Ssx7c5loVwnGjEguRIu/AoHzs5+0CHbZ5sc/zI=');

INSERT INTO client_allergies
       (id, tenant_id, client_id, substance_enc, reaction_enc, severity, allergy_type, onset_date, is_active)
     VALUES ('allergy-client-006', 'system', 'client-006', 'rIbFodXRK6HEFjBF:W1oeHQqkKdekI4dvSgMF7Q==:vByaKf9fKWw86g==', 'unLS6bOzo17K8Ppr:gWoqehwX6NZ6Xy6WFcApqw==:cq7TbsqFGkPQN0c3tp1Huh76', 'moderate', 'drug', '2026-03-12', 1);

INSERT INTO client_clinical_history
       (id, tenant_id, client_id, past_hospitalizations, hospitalizations_enc, past_surgeries, surgeries_enc,
        chronic_conditions_enc, pcp_name_enc, pcp_practice_enc, pcp_phone_enc, preferred_pharmacy_enc,
        substance_use_screen_enc, mh_prior_treatment, mh_prior_treatment_enc, mh_prior_hospitalizations,
        mh_hospitalizations_enc, mh_prior_diagnoses_enc, si_current, si_history, si_plan, si_means_access,
        si_intent, hi_current, hi_history, self_harm_history, risk_notes_enc, last_risk_assessment_at, risk_assessed_by)
     VALUES ('hist-client-006', 'system', 'client-006', 0, NULL, 0, NULL, 'o2lo4qgxmGKg+XXT:aVe2U0i00/9UrSz1SEK9aQ==:pCdVhP/Ch03yfQllRk2ZeAHL5W13l8Ln7o170shsK58Ag2wrClA29co/', '4YBYgN+t/7vhvF2q:6DdnNPFKhV/gO1VnmF48rQ==:Hh/hZDhgePZjC9zIKyNprw==', 'H0/VufmlDuwCmyF0:RWhUGUSznFPGC3pg4x9eoQ==:k235goJRzjGRF3a6/PMsPQPcaM+L', 'zlibM5WXdPodtd3/:sQ5dYUX8LO9B6n/WWH9oWw==:pypCnsP/WX7wKqh1', 'jO916o6kxSdO/1SB:jZysOtDo1PgYaHFKZwcZBQ==:bscfhmwnp/YAdlsB6CDBGM4XG1lfmtuHpqBZJIRvzqsCxLuxYst5WXCcTT0s8QKxWkxc', 'RgFjVtdk+mupl1w6:zot7/xSXJ1GbhSRonbxErQ==:vti69uQ+4OKmO4oraY8uUbZUI5FKgx3tRhHSktbdTCv4o5Ca2yLFWSuB2/yMsNjHdznja0/lh9yitXvi7Q0=', 1, 'qMjG6w004YoKXhgs:90HrXIu8+UYCRe00z1MuMA==:Tq0lqDgMusdOGe4NVLjgRz9J1KOZKmgoasi8BSzdfHGpT1V6KKjuYFh1RMuJfA==', 0, NULL, 'vNID01MX4pnPju1i:bNNJ5aaBYVA9+BgvCHmZcw==:qnK0XNI+N4DpWKqpD8S7jRvIOwUP3zwvcFat1NA4xLIh3puxJuYO', 0, 0, 0, 0, 0, 0, 0, 0, '/cJ8ociwMl0WTyk/:QYUszwrfNFcSIdaOS9QWxw==:mej4i/+HpI/NMgzxob+aUvXmUUuloXZ19TcStfWHQ30MANSnP/fsDP+jhYDbrg7kzFLjLDkSUOoG8q917E2QfQq+nUz7nZtRgGC8WtXFPu8BU/HxpIlnlw==', '2026-03-30 17:50:00', 'staff-counselor-mercy');

INSERT INTO client_faith_profiles
       (id, tenant_id, client_id, denomination, church_name_enc, pastor_name_enc, spiritual_director_enc,
        faith_integration_level, spiritual_concerns_enc, religious_restrictions_enc, faith_strengths_enc)
     VALUES ('cfaith-client-006', 'system', 'client-006', 'Baptist', 'cq4VMlfWU/e3c5Pk:7tsmLN3Lq/r8Ulic8CAcaQ==:HoHECLAoFoHBXTSDvbiZ9MQ5JLky', 'mgWVOl3Ip8c+LnMm:YpUNqmqSxlLIUOcl1id7cg==:K1zBC9hBxnR2gg6EF8xCrt7Y', 'AA0OBPaYFahv2rLF:EVU5lCvypEWrgRwp6JfGwA==:xa8Mcg/efFKrSE4JgQ==', 'open', 'NKvrtrOgR1fFQJtY:AJ7uldRCKjSDjYXITqUIBQ==:VYtljbn8qLhsh81gUZyw/unYvjwbNl8X29ExdzhqtOU+lSvf+MrhRKdTv1pgtPrcDK2514ERHByDLAJlZf7a', 'ILjUL0WetsxBKiMk:PJ4P+f33ea7scDomursLag==:QTLa0mHFkRve+oyV9w==', 'rZ9a5JnoJXGuLCGV:EWdbqdA0rK89fOlQgTvVsg==:wwfRsUXHXkyrto7uPmkRMtLRbCTwAqC0u0JtzI+SlIobjcFPc14tbXeR8G1FjKYSoTYsy1pO8WZqH+njd+j/v9n5w+c4lhD2');

INSERT INTO client_legal
       (id, tenant_id, client_id, guardian_name_enc, guardian_relationship, guardian_phone_enc, guardian_email_enc, guardian_address_enc,
        court_ordered, court_case_number_enc, court_contact_enc, court_order_expires, custody_notes_enc)
     VALUES ('legal-client-006', 'system', 'client-006', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL);

INSERT INTO consent_records
       (id, tenant_id, client_id, consent_type, signature_state, version, effective_from, effective_to, signed_at)
     VALUES ('consent-client-006', 'system', 'client-006', 'informed_consent', 'signed', 'v1', '2026-03-24 17:20:00', '2026-03-30 17:50:00', '2026-03-24 17:20:00');

INSERT INTO intake_packets
       (id, tenant_id, client_id, status, assigned_forms, submitted_at)
     VALUES ('intake-client-006', 'system', 'client-006', 'completed', '[\"ShortIntakeForm\",\"InformedConsentForm\",\"AnxietyAssessment\",\"PHQ9\"]', '2026-03-30 17:50:00');

INSERT INTO treatment_plans
       (id, tenant_id, client_id, status, goals_enc, interventions_enc, review_cadence, reviewed_at)
     VALUES ('plan-client-006', 'system', 'client-006', 'active', 'Rhnh8hDGZkWxGOUw:pgeIB98611RLDfSgAvIH4g==:Lny4J+bLZZj7kMHQXwaHDR8wmhjEoeEORAZwc1H2jgbsDHCUcnDkUQxYas+7nEoHKtdtXGZpoxwUdFX+dUPgDLXZhJW/IMC/BzflZjyFbohlhDXEGWXewMAi2klHrfYWFIFUWVLMolVRyhT1Zb8NvWTZZSf+ScX3AyZ0M61M+wc1fvTeCcoGTu0lh3MXej6mg9fA6yaIuvTPvfmms4pBmwKV/ruR6SjfA31tH6eOmtjvEn3U+xoNecA1yt0lmCm6bZxVmH2UfyUT8VYyY8CLaoezLMj56W76+0zThgHyL9VFZDoUy0MqfaENSv1Ohqo7yphJq5AOvkNvHAWLyJeVzMWsAzmiGu4keh/aYaYOTJbqYFJ6zdyL69EL7fEqrd4VDqUdoE3TaeZ93HE9NPv4Y9Mwj4ZQ782n1Z0SnVXbpGbGmB+Ui0csUnx+BuqY4tbOu+HjRkv5Sg+nchwVd/44pWLZDwA4og==', 'nw+Ay78BwhOa4FUi:0RnQ7ykA7cSSYcurb91CRA==:XWC6BnFXa82Zx/sRDZrFNXZTaC+0PI3vZTKlN9QvsbveHvpi+Ltf3RoIrcf4OLQ3FixJEYfi7/bXM+cDJY2OtkfKpWI8ox1MLbW1Hyy/6G5N7VQ8h8nXRBymkci13lll72vMwqnSx7GIyVWXGXohsb+YWyupp5X9', 'monthly', '2026-05-06 00:00:00');

INSERT INTO portal_accounts
       (id, tenant_id, client_id, email_enc, email_lookup_hash, password_hash, failed_attempts, locked_until, status, mfa_enabled)
     VALUES ('portal-client-006', 'system', 'client-006', 'Q/zO+2JxY/bURylb:H10V3/upmAWABQf0y5KIdQ==:Vo4BMLbeMtLsDOZtx3Yd8/VUA12NNqQ=', '5523056f6d43c11b3349586fef75e7a73afde1cf8e9c3453f34ba809be21f4e8', '$argon2id$v=19$m=65536,t=3,p=1$RIMtuIoYp95Ji77HbqJxxQ$gFx4zOuAa+uWbiRWuAGL2BRmHIw1Z+suw16YbdduAsc', 0, NULL, 'active', 0);

INSERT INTO portal_client_profiles
       (id, tenant_id, client_id, preferred_name_enc, contact_email_enc, contact_phone_enc, contact_preferences_enc, profile_details_enc)
     VALUES ('profile-client-006', 'system', 'client-006', 'wu/4FJwuvIGRiTOD:sF6IPe2mApLEJ6vF3o0QBA==:2tgzEzw=', 'o9W+2o+PyoXHOTG/:Rh6lk0vTxEOw+oEvIDfj3Q==:hZXQiFFWpbix4rQyv7kUVtT+yC9l92Y=', 'Tw3cmgO5Iq/Zzstq:siWzGwOMTAWGwrKpwEui2Q==:ty8bxHJAyuTQ0kYj', 'b6pQjwE++34Iyj3r:51IuRCF4haKKb2LKsEHhBg==:rzPCSf3wgm6TXRn4NF/SFO5oab7RgbcFAalAThJmwQ==', '9Q+S7RqUCHvvqhJI:sPpihF+hrIeysLGs7VUSKQ==:hk9yZ4uLDQ8juzKwgcE3bQETKIpBzefORok9O/OjQj0gyFjUoqcVv/CmPE1N36QVyrYMUUWz3uCbYCPoCviGhbEBMTLtwsJvaYp/9bAFOGuuCRnJINbom9qksG1S');

INSERT INTO faith_church_referrals
       (id, tenant_id, client_id, church_name, contact_name, contact_method, status, consent_to_coordinate, notes)
     VALUES ('church-client-006', 'system', 'client-006', 'First Baptist Sanford', 'Pastor Daniel Hart', 'email', 'active', 1, 'Mateo approved collaboration with church support for practical care follow-up.');

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-006-scheduled', 'system', 'client-006', 'staff-counselor-mercy', '2q3qB9C31rSSNtW+:uHUwRvf0SaAteqVGCdvM+g==:E4s1OrasdIjslg==', 'Eh1m3kFLilHqrp6f:MHDmnXshs9ym1ARLiKvG/Q==:FHVFZDhJtVsSw3Vo', 'individual_therapy', 'scheduled', '2026-03-18 16:00:00', '2026-03-18 16:50:00', '2026-03-18 16:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-006-completed', 'system', 'client-006', 'staff-counselor-mercy', 'HEIwoE3IyNu9uNxe:Sq+AYS3iMhzTNebXTEnCDw==:B+tbfCZEX/0m5g==', 'vQEyESUai+nMM7CA:0izyu6bN0nP6W7WHtxk+pw==:zTgC6oTJxpCAxHe6', 'individual_therapy', 'completed', '2026-03-24 16:30:00', '2026-03-24 17:20:00', '2026-03-24 16:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-006-note', 'system', 'client-006', 'staff-counselor-mercy', 'D2EyoW8wM7R3kiOL:TQI2rMIyzMyXNxjS25fuNw==:KMMo6yif6tM7jg==', '5e6S5WqsmUPkYGjS:oAYWhgdAwtzovm2uFoLrEA==:4sDjn2QwdFHxJBSn', 'individual_therapy', 'completed', '2026-03-30 17:00:00', '2026-03-30 17:50:00', '2026-03-30 17:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 1);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-006-future-1', 'system', 'client-006', 'staff-counselor-mercy', 'sYeChjbpMpOeVF6c:Et/TACra60D0CykrVqdvUQ==:T510GKoaaG+vLQ==', 'xK59ztpnrGmLupQr:6AObzuuBz9pp27ZfwlO5xA==:Ug290Es6ySR/kjJq', 'individual_therapy', 'scheduled', '2026-04-14 12:00:00', '2026-04-14 12:50:00', '2026-04-14 12:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-006-future-2', 'system', 'client-006', 'staff-counselor-mercy', 'cvWOU70rkZVwM+4m:5vfoWYSjoYpUK2lylHBWpw==:oUWQBU8+a9h8tA==', 'CjOVr2+HeeW3Usuu:qJSDigAerl9kp4aJaMAnVw==:8m2ojd33iQJjHVMa', 'individual_therapy', 'scheduled', '2026-04-27 14:30:00', '2026-04-27 15:20:00', '2026-04-27 14:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO progress_notes
       (id, tenant_id, client_id, appointment_id, note_type, summary_enc, interventions_enc, locked, signed_by, signed_at)
     VALUES ('note-client-006', 'system', 'client-006', 'appt-client-006-note', 'progress_note', 'AmtBbBYIHm2N30Hc:kOiWV6iU6Pyh6CiQ6NBy9w==:3yx30AtC2oUxNNtgX7WAvJMq+e32ZiybWMV7edd9saJMS7oS/8znLQpR6yrmk0+RXg44VujxGovPOzYh6d2CQ2NMwbUggJDOsPq52opVlBeyKHbXwbOCC4sZtl6N40AFE5xmXROSebZxJIy9tDsHX06N35pHcT6efaWCVc7wZiKJW+Z1in1eqL2WswlzZsLshhSblZXrA90X/juhXET5odj/dpQanBmyKlkWCnibYg==', 'ejnGX731ZGZzl1Ex:AtULvL+7g/YRA+H7sYedbQ==:pviC1zgcup8ZwvTl5dPam5oBr985di5SZcsgFf0wEdIbUPvC0JhiOExxs6Ar1Y7cmBsh/YlhnT89RwhPdqqISPEgiN4JkyL7o5GoeG3jnb4h3trfDQ7PNieqMPUvou7zqhxaxrdYhA7dFvI+bzIwBtXU3N/gLjXqbnc1bXX/JVNCwF6iOoN9+sgJO6d6IpnELg==', 1, 'staff-counselor-mercy', '2026-03-30 18:00:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-006-ShortIntakeForm', 'system', 'client-006', 'ShortIntakeForm', 'Short Intake Form', 'account_signup', '2026-03-24 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-30 17:50:00', '2026-03-30 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-006-ShortIntakeForm', 'system', 'form-client-006-ShortIntakeForm', 'client-006', 'ShortIntakeForm', 'Short Intake Form', 1, 'client', '7u7BjU2+NpJEz5Gp:EINvUnMGBwGu6wp4mLl4+w==:8PnbrjyRXY/fdb/b7Li64R8Z9gwzjzm8JWsj7DXGk+fjiJEE0yFU5LkI2kaYP1XAsRwQgCnoSYc6gHp7hddqEq5VOkQlMq4RUmZN2MlM5uZEAQbom8CC1Id2HnJ0r9DmpC0iOAjTGUQb/+p7qIDY+lAr/k8gjHeCuTJi108TEAg0szYsUb6pgWks6yEBoPIk/rP8xLRS5xR4AS4hgoN4VSHPyZPzb9w32my04rrVaMKCJ/VjKzr8Lk6+V8pYY9kFH1HlDx8H2prera+MrDKONGORoNNYt5zh+6GGmdP8dHypnPxnZzMRn7BtBqZ8jvkD7DnFJq2ToKUN7zO+A9Y7HRPEvXHzx/MlyLwI31pkG35RkuWrXkX/Uwbs4qdI1WbH9+xQE3UGmB2UjCUbu6VV3Gl887ykiUwDvDOzz8YBEgnLvTe8/toSB0Zgs77SWhbBzefxVIYxMPVWnzDbaNR6zBRH+eDhLPyl3zNSPuGQ6lYqILHKZYmAsOjAeg7InREeqeEWMQGW6Q==', NULL, NULL, NULL, '2026-03-30 17:50:00', '2026-03-30 17:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-006-InformedConsentForm', 'system', 'client-006', 'InformedConsentForm', 'Informed Consent Form', 'account_signup', '2026-03-24 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-30 17:50:00', '2026-03-30 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-006-InformedConsentForm', 'system', 'form-client-006-InformedConsentForm', 'client-006', 'InformedConsentForm', 'Informed Consent Form', 1, 'client', 'LMHjZaQnQcYcuEZH:63kZXL4UQwRGscYQ4lDWsg==:3eZ53o1ouIqEY2NdN1d249kTK2j8HQX0zgBYcP0HZxr3VZBKDRk2tPejLc1bVgw7amRJmy7G9+ztDmVAG+NP2HJBkbcLA2WbZbkNjeXmaJGg4D6h/WRVx+vWbG0s04JtCY0Wj/3d0AiI5H6e89tI4/S70suvjDYii0aPTrluB2VYGViG/GZTQdLhuZTXwn/1cCR4pI+8bmMW6BjMi0dURTpbFZVrHaJRbq0V+ajvKyNqKic83Sz2gxLZffy8I0VoCfDTkenVSt0BLtU=', NULL, NULL, NULL, '2026-03-30 17:50:00', '2026-03-30 17:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-006-AnxietyAssessment', 'system', 'client-006', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 'account_signup', '2026-03-24 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-30 17:50:00', '2026-03-30 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-006-AnxietyAssessment', 'system', 'form-client-006-AnxietyAssessment', 'client-006', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 1, 'client', 'MrC1OU2V6TnJqYan:h7QxhE17KJHCaSzbCYlsFw==:1etawBQpMEqJ2pRvH7aLdfijHCbJiRccCE65axJqtzGTU48uyJImXBpeR2n37RhdMk+DeDumFBEIrMvn4aNcrAbWzwBp8sykXSYn9SQZBGwaDhgPkpuMY9cwYWPOKnnKukzhATIm26ymvmMpOH0zk1wBG2cH5Grtz47LLxqMkbVZPGQ6w2kHpwOYj0Fpps/j0EVqIO4dKL92ZUYf1h+va+BQhmea057qGbwRqrECCV3IpG/1rsEGPs3PzL3YPA==', 'Moderate anxiety', 11, 'Monitor weekly and reinforce grounding work.', '2026-03-30 17:50:00', '2026-03-30 17:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-006-PHQ9', 'system', 'client-006', 'PHQ9', 'PHQ-9 Depression Screener', 'account_signup', '2026-03-24 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-30 17:50:00', '2026-03-30 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-006-PHQ9', 'system', 'form-client-006-PHQ9', 'client-006', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', 'ultOy2zknp9qNs37:p5CL6P00o+PfsOGHdRHr6A==:f6+Ihn98Usgrj+P5ZV/EdZ3MqvUhXpg+hdNaCwl8TGVgEfvH/OdTftEUjKP0R29kdg7gAoxiAMJSvdyBpJl6LFb1O0hdxlBNuDgbeIyXzYwk9wgehaOGvLVI8AHI90p94MtNWyBhLiSB6NLptMH/o7z5lWl83WRU74kwCgJ0aBxi3p9wTg24/SjZK1bsjPETKadyDYe1GmLYUrHaFuzpd6rn5zKBtunIQSfEh9NKAgfFsVS5XhOitw==', 'Mild depression', 8, 'Continue behavioral activation and sleep supports.', '2026-03-30 17:50:00', '2026-03-30 17:50:00');

INSERT INTO invoices
         (id, tenant_id, client_id, appointment_id, issued_at, due_at, status, line_items, insurance_enc, claim_status, subtotal, adjustments, total, amount_paid, balance)
       VALUES ('inv-client-006', 'system', 'client-006', 'appt-client-006-completed', '2026-03-24 17:20:00', '2026-04-03 17:20:00', 'paid', '[{\"serviceCodeId\":\"svc-001\",\"code\":\"90837\",\"description\":\"Individual Psychotherapy 60 min\",\"quantity\":1,\"unitAmount\":150,\"serviceDate\":\"2026-03-24T16:30:00.000Z\"}]', 'JxTxMyMASXJ4WoZP:FhDTS6uNm0IHxFEsMxiFSg==:jgnj79Env187+53R9kieMBiFF0j63JYm1GV8vzmljL9AC08bd/AblaQ4FX9m0Rub5WnoFmIqbg8ApEhjIVWvasNxUFgxODGC', 'paid', 150, 0, 150, 150, 0);

INSERT INTO payments
         (id, tenant_id, invoice_id, client_id, amount, method, received_at, reference, notes)
       VALUES ('pay-client-006', 'system', 'inv-client-006', 'client-006', 150, 'card', '2026-03-26 17:20:00', 'CARD-CLIENT-006', 'Demo payment captured during post-session reconciliation.');

INSERT INTO clients
       (id, tenant_id, first_name_enc, last_name_enc, status, faith_background, high_touchpoint, primary_counselor_id)
     VALUES ('client-007', 'system', '5iZXZuxlFwz1cxUZ:UrjtoeFSU/F+PuizjPGagA==:TNNgVpIrKQ==', 'tXezEwgqyXspyBdG:lN3VycnezWiakHv2HB+pcQ==:v4exK1sN', 'active', 'Non-denominational', 0, 'staff-counselor-mercy');

INSERT INTO client_lifecycles
       (id, client_id, tenant_id, case_status, referral_source, emergency_contact_enc, discharge_record)
     VALUES ('life-client-007', 'client-007', 'system', 'active', 'Self-referral from website', 'nUcf8iQOruQhUI6U:F8SI/zLTKvoRe7CyV2BSog==:aB9ztWP4usELJr8+siZ1Dj68dQ+saEkC5ha6YkvN8jGk6fqV/0CQJTHxOfAUvvhNVq83y9BGVTMHC5E1+oNGVhhnXGiDj7EibQ==', '{\"readiness\":\"stable\",\"demoDataset\":true}');

INSERT INTO client_addresses
       (id, tenant_id, client_id, addr_type, line1_enc, line2_enc, city_enc, state, postal_enc, country, is_preferred)
     VALUES ('addr-client-007', 'system', 'client-007', 'primary', 'JO4eAWu0htWVu0jv:cc6oXBZmoz8hNGU+87zaGA==:RP2WhYy9BAcyxiUsjQ==', NULL, 'MbgD6g2Q3viCr2Jr:+2QDX56WGCgkO/izl6Vtlg==:QFrCYAWGvgg=', 'FL', 'jb6fVapRpK/EG3GX:DzSofQLlUY6cZZvRhHe9dw==:XnFu20U=', 'US', 1);

INSERT INTO client_phones
       (id, tenant_id, client_id, phone_type, number_enc, extension, is_preferred, ok_to_text, ok_to_leave_msg)
     VALUES ('phone-client-007', 'system', 'client-007', 'cell', 'oD60cnc8NZwvf3u4:/l7HhMv79hmHAs/bN80/AQ==:E8a3NJ+49Crv3yVe', NULL, 1, 1, 1);

INSERT INTO client_contacts
       (id, tenant_id, client_id, contact_type, name_enc, relationship, phone_enc, email_enc, is_primary, has_legal_auth, notes_enc)
     VALUES ('contact-client-007', 'system', 'client-007', 'emergency', 'T5ctYjvIdlwbXnH0:A7O2GJgTrzXKahARkWa+Gw==:36v2/7l+LupS0shOwDin', 'spouse', 'e15eMjQFgO+nMOBy:/ZKNBm7Io0jj30T6d//+RQ==:sJmaL540eJCRrdxW', 'zqzQBf2dmrfcAQS3:ZrDlB8BBCunfEfqDjgvsmA==:rQnWg2u3D4qZzKXcyd8SeIsfVGnv4TjrZN38qw==', 1, 0, '+fp+mK+srsZKLbha:DaxzhK9itTrkOI3YEF3o2A==:zkD1XleS18d5D5W3AIdatAeRAcchx9IMYp9WQbESGHbVFhn920J+WVSeGv51cPU4');

INSERT INTO client_insurance
       (id, tenant_id, client_id, coverage_order, carrier_name_enc, plan_name, member_id_enc, group_number_enc,
        subscriber_name_enc, subscriber_dob_enc, subscriber_rel, auth_number_enc, auth_visits_approved, auth_expires_on,
        referral_number_enc, copay_cents, effective_from, effective_to, is_active, verified_on, verified_by)
     VALUES ('ins-client-007', 'system', 'client-007', 'primary', 'kA9DvYyGrATXt5jE:0Qlwd8JNOOCfafi9tEhszg==:V09c48k=', 'Classic Silver', '7Rl+mDWMiK6W3lWZ:E7VM8XmX/J3ox+FnOBARxw==:MEQzhNyyS4ycHOA9kXAwKy0=', 'jZE4qlKrsZl6Z6CA:ZutIyb8NgOu7Zw7hn7aB4A==:fhhDEbm43pEf3KgFdK5JPA==', 'ShJjLALyO/aoXC4j:Ulfzl5hTAqvdoL4lpJItjg==:jKSuv8IqLjy2rEWyk5U=', 'k8nVWhCuHXLxmYLK:2IvbRg3VO8RK6OTbnbcWpA==:J9SqWmmM+Z4inw==', 'self', '3W3406668eonkBJP:mEbar6zIeqleIGQSfWdQfA==:zRq1nevEB0xuKKbAYj1/', 12, '2026-12-31', 'UuBiiGqqGQd+Kka5:mMJoTvQrh3Gxz14fomIAjw==:PdgIswOGNtkKFJ3GJ8Q=', 2500, '2026-01-01', '2026-12-31', 1, '2026-03-13', 'demo-finalizer');

INSERT INTO client_referring_providers
       (id, tenant_id, client_id, provider_name_enc, practice_name, npi, phone_enc, fax_enc, address_enc, referral_date, referral_notes_enc)
     VALUES ('refprov-client-007', 'system', 'client-007', 'c04HbUJl0aSxRFul:9WcDGeDblj/rLu8V1r43Ow==:INhyWP4DZZ8/75zfUFc=', 'Grace Family Medicine', 'NPI0000000', 'aqQ9l7STiUaslzmd:RYe7M4OKtMaaOq/VQ6Nlcg==:+/xgy8xy4U1dDTfI', 'bLk2kgk9mNV47Mrh:uVwwJMDPoIAo2MI1DQQ5wA==:SSZrYN12+TTQMEj3', '4UAsJuL88IOOLiGH:z4hsHpZgYaq+CPrP8TO75Q==:Yp16wUX3hqXbHH+GZRHD+bPwUgWhV0oqcUlI2MpQZe2aUxDIF8g0vCJKZ69OLKPYJ4JGf94+sf0PyY/lwjUNeoz902OoRtHOm6ZPIkb5aPR68FTXFqCA6Q==', '2026-03-13', '6yIOShXk6e1DB07o:NPZ8dkMUA+7QE2g/ylOiPg==:ag6tZKNnJovDluKoghw11FNp/+EEBadeCwWDdZ1OxW+j+sMNmQuRz09Y6KmGS/Vdx4nfgTU+qZ6GXcPXkBzMcw==');

INSERT INTO client_diagnoses
       (id, tenant_id, client_id, code_system, code, description_enc, onset_date, status, is_primary, notes_enc, diagnosed_by)
     VALUES ('diag-client-007', 'system', 'client-007', 'DSM-5', 'F41.0', 'JL22QDwyYwcPTuZq:is0DgMWZP4eciz/Je7GToQ==:PizXZELXIuag3niv1pc=', '2026-03-13', 'active', 1, 'zXsLqpR6RBgd2m1m:lnb8T6M9lBGQ4iaA6CSilw==:Wq9rxkzkw5CL65ZBryshU750X//GeuuQn/qz7EcWRQCa+8o2+LJg5vxHJ0BAsa3+aMRZ6P/V', 'staff-counselor-mercy');

INSERT INTO client_medications
       (id, tenant_id, client_id, med_name_enc, dose_enc, frequency_enc, route, prescriber_enc, start_date, end_date, is_active, reason_enc, notes_enc)
     VALUES ('med-client-007', 'system', 'client-007', 'qoBTKphbxSQLdDaD:wZ2UzNwgJTwuaoyN8RrOuA==:9Q4Rlqhh+Cn5', 'REnKYj3oBW87Re1J:bXy4GaER2CHHle6WE9b6tA==:9oL5I2U=', '8ev7AtLQAbIqCRsA:MSgFa05GNfVhySKCbkBm2w==:jRC5BHM=', 'oral', 'hwJLD+UhLWUZyoeD:OlALtXVL7DaqYacLOOS9wA==:Wd6rWlX4Vrtc/MXWfLc=', '2026-03-13', NULL, 1, '5kQDWAvlMCQTLvES:ve6QuQbfVM47ZbeihaQxjw==:IMK8yOmuktoyHqcX8w7b', 'uQuNK1nK+kwb25fp:xQmJXzdbEzXiyWGxFVruxA==:wv1kz6Jkyx2M3HLVhf0h/RPnx/1EdN9aKBz799GPEjnCSNu5ggesLxCO70RQNiNgVoo=');

INSERT INTO client_allergies
       (id, tenant_id, client_id, substance_enc, reaction_enc, severity, allergy_type, onset_date, is_active)
     VALUES ('allergy-client-007', 'system', 'client-007', 'bu87w6AgKjtIBozH:9QxifBT2ce0VII5Cq63auA==:nbFWpUhijXsG3PM=', '5yLwwdKS/j2n2v4G:5JJLnT0Rye+lvJd9e2xPnQ==:gO4sm37hM3EO8V24sZOurG2H', 'moderate', 'drug', '2026-03-13', 1);

INSERT INTO client_clinical_history
       (id, tenant_id, client_id, past_hospitalizations, hospitalizations_enc, past_surgeries, surgeries_enc,
        chronic_conditions_enc, pcp_name_enc, pcp_practice_enc, pcp_phone_enc, preferred_pharmacy_enc,
        substance_use_screen_enc, mh_prior_treatment, mh_prior_treatment_enc, mh_prior_hospitalizations,
        mh_hospitalizations_enc, mh_prior_diagnoses_enc, si_current, si_history, si_plan, si_means_access,
        si_intent, hi_current, hi_history, self_harm_history, risk_notes_enc, last_risk_assessment_at, risk_assessed_by)
     VALUES ('hist-client-007', 'system', 'client-007', 0, NULL, 0, NULL, 'KoRqh+Kur89HmkNe:lwQaFdjN6b8QG1zN/MMxYw==:vj5EJ3BgiPcPuGt7cbsYc5wXmEFBi002yBYnxIF8Tfpin6hDG4swXmNJ', '9xUCoFXhi5qaCb6C:JC7U5k3yp6DI1Xdight3kw==:PGcreGA4s8l3HD4XjXo=', 'Kdl1pqoEtXzhyBPu:oeEQNe/TO0+jVGrtNcM+UA==:jPRsjKjXaTvndx1ratYOsc47RKo6', '5vbGMTMqBjKJq9nC:3a4xqymVAvc2bxt+q0NUyA==:40D/HCi87/uaLVsJ', '3cBOpWz+d2BdhNeP:bSp8SAHNB/VLb4eoFKI7Xw==:0hbtcpn5iFvOTgB2YthCOUoB/vHKfkHtBzLQYlf0zDgXKXtuORRgJxgIv1SIeuwmJ3Ug', 'LZpGHggGCRgyMkeX:e2ZiTrjOy9PHqZloTNmFng==:SRO5Ly0HHz7cWd1ai9Ht62AfzQEofA0z/O1gk8c4VqzJV1i/thGFVmxtM6AtsnWDb93w33SwFHENWIqFT8o=', 1, 'RfRoLJkOuG/m2feD:kGW3KSphX/fhOgtBnxpQQQ==:dN5EXyFwi53UCmPAL255ihMmPWMKE5EpWLNFUmFs5rUV7FYopOj3abK/OIS/Yw==', 0, NULL, 'KgFD210l+HL4vgZ8:cYH4gahJl4umGs02O7Jvjg==:Qu1nHxKinyLm9Gb1MB4=', 0, 0, 0, 0, 0, 0, 0, 0, '4L+E24YH4uqkkfeu:R5VVz2VQyWWr9/Isab0w7Q==:xyarS+9iF1X2r4zjKO23NnkOpAsKY5gZfRIOXW9tlGQZZlWvxiC9aMWCI03zgvUANbPYMNAdcjeoJN6BXBMsSzqNhABila96M9IE+bDoQyxZJOMhJCthLA==', '2026-03-31 16:50:00', 'staff-counselor-mercy');

INSERT INTO client_faith_profiles
       (id, tenant_id, client_id, denomination, church_name_enc, pastor_name_enc, spiritual_director_enc,
        faith_integration_level, spiritual_concerns_enc, religious_restrictions_enc, faith_strengths_enc)
     VALUES ('cfaith-client-007', 'system', 'client-007', 'Non-denominational', 'LOyYpUNMDNoQI3K6:RWg4c0cYNonJ/QNiukPgvg==:5t9TAwUfvGdsgH9z67k3dLesJg==', 'QaRH6a8bRGdHI66n:NgLzzq7buv/2709clZThcQ==:OUeWmQ8UDRESKspTkFfSeW/V', 'SqJukPzwCYE0anSj:SGswgBFd2l6a1dg1Y367aA==:w408T7kCfQN/p559pQ==', 'open', 'oYTB7E6LkbnSmsbT:a1b26OVR5vkZ8JYqbOsrug==:8Ors1GTe43WAHL5+RuL/4TfyBrKIkxoYggkk9VtkuF2J0iBycr7qpTS6r0xVnaYFvdVWjw1r9qknAfqQqK6s', 'GxmxADOTqkmls6Ka:1K3gPEMtz/LSqlAwTAlK1w==:pwn19I0zFjSSLFnByA==', 'QBlSSPOk2bzSBg8a:nkFg3vQyHdpV4G5NBuJSLQ==:mLeOceB33TJtcYATGsebA6NvuDz8EthZvbvfEWyljvvtyA4USMpxBAe0pIvoxRmdoXOpp87VA1YJVGrd3/aynBf87pNCB0DC');

INSERT INTO client_legal
       (id, tenant_id, client_id, guardian_name_enc, guardian_relationship, guardian_phone_enc, guardian_email_enc, guardian_address_enc,
        court_ordered, court_case_number_enc, court_contact_enc, court_order_expires, custody_notes_enc)
     VALUES ('legal-client-007', 'system', 'client-007', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL);

INSERT INTO consent_records
       (id, tenant_id, client_id, consent_type, signature_state, version, effective_from, effective_to, signed_at)
     VALUES ('consent-client-007', 'system', 'client-007', 'informed_consent', 'signed', 'v1', '2026-03-25 16:20:00', '2026-03-31 16:50:00', '2026-03-25 16:20:00');

INSERT INTO intake_packets
       (id, tenant_id, client_id, status, assigned_forms, submitted_at)
     VALUES ('intake-client-007', 'system', 'client-007', 'completed', '[\"ShortIntakeForm\",\"InformedConsentForm\",\"AnxietyAssessment\",\"PHQ9\"]', '2026-03-31 16:50:00');

INSERT INTO treatment_plans
       (id, tenant_id, client_id, status, goals_enc, interventions_enc, review_cadence, reviewed_at)
     VALUES ('plan-client-007', 'system', 'client-007', 'active', '1E9i75edPTKSO6oW:j5yM6kMzKMrM0WazPiLaUQ==:qSOwTe6ONpjDNIS8XyF6tDb4dMLxv3FYdfvC/fo4tvB6Y1+g6dapC4TlIeZLIdG9N70QkTYVjsGt9F5DmZtqqrf8CYGJFVg0TeaLx/6ZOQbCvwL+IpmJaZtfvkuGQeq3z5VO712TcaNjEiM9sDb7kjm2pm3OE9gzbzp+c2j+H/Z6UtVPdJ2DBaoqEElrVCLxBupqjS1KZGK113vILvG+DolRsu8+kogxMLY8VOW76aCGpM0k51q91aePbKXaVWBhSoG45B2WlaB0zlcNnduQnv+K4YqfEbNu3oM7CUSjeaZCd8f1K090mHM0pJMhi77kt8/JrPt0Td+vcPNwAKVSHrBIzGXmdh9JINCiNidBmahq2RgQK2b1gF5sxg8fFP1skvsujN4S/duimohF5w56IJExxE1RdM8OCgKnOIjubTEh9T3xfURcm07F951lYRPLtlS8Qe1tdEjhbpq8TVOpKefc9c3baQ==', 'ZynhWU2RfjKvCYnW:n0Gm54FhZ29prZcOwS8Ngw==:Qml040CGrVP0LET26C/jx4sogQKigKJFp96qhKKjZ7ipkuF2ZtTqwI7eHCYhZ7d5VJmTsKBZ3iC7jvNG0DCycf3z/YrtTBp8i73hSPWSi8KRlySDLXSe4d6wAD90NlQQQLLEYMlncTyhocXO7DX1pFGEGjOjV3+q', 'monthly', '2026-05-06 00:00:00');

INSERT INTO portal_accounts
       (id, tenant_id, client_id, email_enc, email_lookup_hash, password_hash, failed_attempts, locked_until, status, mfa_enabled)
     VALUES ('portal-client-007', 'system', 'client-007', 'NOAtcovxc3SJOoyq:/8NeiAWFIxva2lE3T9I00g==:5YrFPeC+byJDKTq849TZNEReEQ5zkc1bjDZ/', '5e128cd39f5bb0c969cd3623c97392f9b2f81ecc9c881d9b2c81d18f8db62d1f', '$argon2id$v=19$m=65536,t=3,p=1$RIMtuIoYp95Ji77HbqJxxQ$gFx4zOuAa+uWbiRWuAGL2BRmHIw1Z+suw16YbdduAsc', 0, NULL, 'active', 0);

INSERT INTO portal_client_profiles
       (id, tenant_id, client_id, preferred_name_enc, contact_email_enc, contact_phone_enc, contact_preferences_enc, profile_details_enc)
     VALUES ('profile-client-007', 'system', 'client-007', 'EymZuL2BxCLpip3k:TGCFuOqExlQidajsLWzckg==:jBynmQ==', 'KEG8a+cMhzuCIbku:1hRd9V8jrltQhQCRDjC6jQ==:xdv53JD5rVWq+5T2VeEKU6/aBW6e3VNKsfRF', 'gUhXGiSPuSK0FTZA:EpphDw1qGA5CaulbDDLnSg==:JBfrpsVjp54qIvex', 'j59lTa4zHm4vFAlM:FTqowvWhVG6hcMkux/Qftw==:gVFCIsSIiP9+HvRY/8c8/D1qI6RpgBbTwHPBAO35Jw==', 'gIg5BFhLxhs3rzLd:HqojHDHhliqq+f1MnxWnNg==:HRDmtZtJy/TA3FTHET/zzYdbu0EEAXaF302RcpqezKuBwPA3R+jBwxhcYyuwwP9ks4vzzpnmQww+6XfPBZOb2ycnKoLDaEVOqANSGvMrw5Mcl3+URIkUy9VB5ZI/9oCvzTk7AjkJRWg=');

INSERT INTO faith_church_referrals
       (id, tenant_id, client_id, church_name, contact_name, contact_method, status, consent_to_coordinate, notes)
     VALUES ('church-client-007', 'system', 'client-007', 'Anchor Point Church', 'Pastor Daniel Hart', 'email', 'active', 1, 'Abigail approved collaboration with church support for practical care follow-up.');

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-007-scheduled', 'system', 'client-007', 'staff-counselor-mercy', 'RvHpxm0PLmoJLDpk:18S2/IgVxyY50x1KPj91PQ==:t3L8HY+IlUtt3z+4/ec=', 'qEFFOOcjoieH4kmo:02QrCDTZ5McI3PyT9YoTOw==:8k1DwJxil4wb54xe', 'individual_therapy', 'scheduled', '2026-03-16 14:00:00', '2026-03-16 14:50:00', '2026-03-16 14:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-007-completed', 'system', 'client-007', 'staff-counselor-mercy', 'Ms6NjQkQgQyDwDb2:FNy7gr21BWBBPZuuevY0lQ==:Dp0yKnppnUG4a7TFL2w=', 'pK6rULw67u8N3XXs:ptkIXMW3yyMPzqffqptGqA==:eMjbFyeReoQSsh+/', 'individual_therapy', 'completed', '2026-03-25 15:30:00', '2026-03-25 16:20:00', '2026-03-25 15:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-007-note', 'system', 'client-007', 'staff-counselor-mercy', 'oTm5fwi00wKtAxYo:ayCpz8KvJbwmPPQ9kz1TaA==:X+AZo+BYuggT4LzIBL4=', 'G7/778ywUjQxMlRP:i3blp236K6a2JWgIPM79vQ==:6W8HOstUU8ql/1aD', 'individual_therapy', 'completed', '2026-03-31 16:00:00', '2026-03-31 16:50:00', '2026-03-31 16:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 1);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-007-future-1', 'system', 'client-007', 'staff-counselor-mercy', 'tS/nejbJjNf8kkvz:B1O5c5mApv014aIv/oyQRQ==:5wtxSTgdNUdefWOeADg=', 'XDSPnkiHbkNjoh6+:iqy+D1d7/TSmyx1+24tEmw==:if44JyFNdki1Shav', 'individual_therapy', 'scheduled', '2026-04-15 10:00:00', '2026-04-15 10:50:00', '2026-04-15 10:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-007-future-2', 'system', 'client-007', 'staff-counselor-mercy', 'daOIQWkJHIzmdG0O:nmPMdc1IypPIoowJZYEdBA==:cS0UHeZEn/8IAYT8Xuc=', 'duujB3T9/LUEMyUC:47/WLpSN2Y/V+dfdS6A5lQ==:MTHlbMe/7xT/WSUj', 'family_therapy', 'scheduled', '2026-04-28 13:30:00', '2026-04-28 14:20:00', '2026-04-28 13:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO progress_notes
       (id, tenant_id, client_id, appointment_id, note_type, summary_enc, interventions_enc, locked, signed_by, signed_at)
     VALUES ('note-client-007', 'system', 'client-007', 'appt-client-007-note', 'progress_note', 'kq1zFBMekvHhbZ0z:jqSMV0CA1yjf/CKPE/ijXg==:3A4UobcVzpuegiBu8Me0eiw3oelRIFujTUjteBIY7VJSZv2iXbDGTHgokrvASqnyrS9B90fK5aKfI0c66nMeHQL7DDuCS4r940jYQKY+KKw1ewaU1gVP5xCYXjovCEM7JUNvc95t1X5CTV0Z9JkzxvXGwO1YR2Tku7eqXeRxUY9YgU6/uAyV3II1wWkg/Crm9ai4bdkcLWHRuioqm9WbGErqeb0oL83Lu+NSsEk=', 'ixnHRmVQFoAoz1QE:d7sIjZfS1XKWnFD2BcLCpQ==:mKtH+xfHsJdXaCmiTq61rzXx9QG1cfnCwuepi/7OzVa0hqgZBwsZ7Ee8yqDsHYmj64jpqYCyMP7kM7GASVWw4NiVtp9kB4I7v6/i+GjSR9rkum+ObAV48GJzFoKs6LQPXrDDmlQu72tgM2zHpH7QMI+UdZ+nXbUn4jh8mQJ84spLZt8i+g9JGmCZXy/8AwI05w==', 1, 'staff-counselor-mercy', '2026-03-31 17:00:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-007-ShortIntakeForm', 'system', 'client-007', 'ShortIntakeForm', 'Short Intake Form', 'account_signup', '2026-03-25 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-31 16:50:00', '2026-03-31 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-007-ShortIntakeForm', 'system', 'form-client-007-ShortIntakeForm', 'client-007', 'ShortIntakeForm', 'Short Intake Form', 1, 'client', 'jdRal1guA5o4ij/z:2DjwxzAj+HbvFgLGk2OQ4A==:IzA0pQPTUBeRaBNynrxWxxnd/t6TldMDg3/esUunOj33ZfbW96B2DRkm2737lUtO/PPVnD8vG5FPHUoHtXL84tAmxhWhzCAb8UD+3g4r3qE/J19gLDPXK0VuWRpHvP7P7F6RJdPdK9n2aUSIxVkG5AIyG6J3llxj9AS8UbwihBPluQSNgVvy2MFzAiwLujY8vvPE3tqtDiPFRc3F7ZZNtVf2kSmibpOaWp968zXVS70w0JByPYMYFTX6FHf6aRLDJRNjd9Y32OCRYKOLJaSzX/XZ56hWx7YP/SfjxCC7dubA8WA11IKgHHRr0jXRDvwEhiwXGEthO9aslrqS5NiS1nZRep/ZrtAeWrBVZZ6zTCaPh/86v5tJgzGWQsuLiaNkYUwovYIBnIur2o8cFIqs8LN3+7B+vCfov4qhQdT3I3M5Mp6A7dsWZtd2K4+jlvT6OGhL1AGAASVvsNWFHaOGxMJ+ZaGqj2b1L+BBjkACX7tA+ehQv/R5FSWaLPjp4E473jCl', NULL, NULL, NULL, '2026-03-31 16:50:00', '2026-03-31 16:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-007-InformedConsentForm', 'system', 'client-007', 'InformedConsentForm', 'Informed Consent Form', 'account_signup', '2026-03-25 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-31 16:50:00', '2026-03-31 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-007-InformedConsentForm', 'system', 'form-client-007-InformedConsentForm', 'client-007', 'InformedConsentForm', 'Informed Consent Form', 1, 'client', 'tU47lYxPtePn/ToM:MJgSLL5B2tRUVlmvSar6sw==:ZXYAoValSaLa1bt5j7MIf/9b3e+Hkc5JAw47h3WBiXYXtZ1YjoulJUnZqKp0nb6uA3mnhMTxRjT84CQsGB5if9+z4XwnOACPW0Z90msaPwdxKXXff9AmjkAx/4Kd2gix8yAt3Idho8NTBL7T9iDDulKVWhZTUWJezFMDXQyM7ZPL9vOuyu0oEdV6as83J+/nzspbA2hB+EQdr0ksGzWM52n1Qr64m+wvrjFZn/V47odgRs0iKzTVeSZrzxb/v/oefwS2NF1HrMzvZ4nHptnD', NULL, NULL, NULL, '2026-03-31 16:50:00', '2026-03-31 16:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-007-AnxietyAssessment', 'system', 'client-007', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 'account_signup', '2026-03-25 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-31 16:50:00', '2026-03-31 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-007-AnxietyAssessment', 'system', 'form-client-007-AnxietyAssessment', 'client-007', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 1, 'client', 'Cqf8U3Yvz0LENO4K:ax0ofoJTGET7ajLst3GTVw==:hlkG8B9KBIQUviG52CaxBk6/m/9FK04VNnfVBGtFmemaERmweKmxBQGCFdhJwRe9tnVdtQjOb7bk8hgKlzdOwR6GMT9cgwBLZHif0vwV36SQ4QtOYcaAOF54/LVElbho3vK2Xn8QGlV1m10DGSt39AXM5plRIB3OoMDnPwBklBcRtwOb5WZp5ORDsEXatCaLElIvWSzJtXHonqp/Vf/tvNvm0EZrNshSnjXkFOESdT0LsuQ3sszdpK5ET3ACgw==', 'Moderate anxiety', 11, 'Monitor weekly and reinforce grounding work.', '2026-03-31 16:50:00', '2026-03-31 16:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-007-PHQ9', 'system', 'client-007', 'PHQ9', 'PHQ-9 Depression Screener', 'account_signup', '2026-03-25 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-03-31 16:50:00', '2026-03-31 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-007-PHQ9', 'system', 'form-client-007-PHQ9', 'client-007', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', '4vT8b8IYRUQQIQJG:/EYgKEf16xKE06k9MFYpLg==:MV2M87PY5YfEYe1uQPOja+hDjdsUEFCa6nU3brHLGBMD2BROMGdWaTlrKIxfyRr7fER9zyfZaLPUdHjZxMyJZKNXscaeCAZsBnDDVImMLBD06VJg1CcY7FH/XB92u4AbLouPH+u1PcX1j/iSlGVQmOxFvjjbZE3G/lWuHuG5L62cDqACagsSbLqMrUxa+FoL4ROJIInCRYxtl35zwm0nXAtpSU4F1RVdp211hXReikrW7wwFm1OBhQ==', 'Mild depression', 8, 'Continue behavioral activation and sleep supports.', '2026-03-31 16:50:00', '2026-03-31 16:50:00');

INSERT INTO clients
       (id, tenant_id, first_name_enc, last_name_enc, status, faith_background, high_touchpoint, primary_counselor_id)
     VALUES ('client-008', 'system', 'bFvewztMzt0mgyad:+8sWRvy2/Mk9VUp781KOKw==:tXOmqfES', 'WEsiWEjxB4s31zla:p6+9lphhwZUkSBJG6035Nw==:vCKTCA==', 'active', 'Methodist', 0, 'staff-counselor-mercy');

INSERT INTO client_lifecycles
       (id, client_id, tenant_id, case_status, referral_source, emergency_contact_enc, discharge_record)
     VALUES ('life-client-008', 'client-008', 'system', 'active', 'Employee assistance referral', '0830s3K4F9VFQkhk:6Us7+JEXJvD8+IbxQnzozQ==:Oc6PFjKgbQWes9zJQRDcSm694rSRDXK7Xv6MdYF5G3hfcmLuqMxaNkdhvhGJI1Gmnz6epw/i4h9nL48L+25k4FfrB/mMuN0U1Q==', '{\"readiness\":\"stable\",\"demoDataset\":true}');

INSERT INTO client_addresses
       (id, tenant_id, client_id, addr_type, line1_enc, line2_enc, city_enc, state, postal_enc, country, is_preferred)
     VALUES ('addr-client-008', 'system', 'client-008', 'primary', 'pvujfCy68J0rejOe:fDuAs9RMm7UmKXFcWCrF7A==:0EDq8Q4ybmL4/UfxTQWz', NULL, 'y4UeG9DdK0+dTHuH:b8KOozWfNLLkM3PobmfRhQ==:fu9kstRfp6FmQaAlm74=', 'FL', '/K/aQExL14OAXwbI:9yBaYd3XZodlvpmy3UaRKg==:e4VyFzs=', 'US', 1);

INSERT INTO client_phones
       (id, tenant_id, client_id, phone_type, number_enc, extension, is_preferred, ok_to_text, ok_to_leave_msg)
     VALUES ('phone-client-008', 'system', 'client-008', 'cell', 'KSW0818C6zCgtY3H:T1s/rw7F7iXtgzB203VWIA==:GEq1vq7FWsV5ARqV', NULL, 1, 1, 1);

INSERT INTO client_contacts
       (id, tenant_id, client_id, contact_type, name_enc, relationship, phone_enc, email_enc, is_primary, has_legal_auth, notes_enc)
     VALUES ('contact-client-008', 'system', 'client-008', 'emergency', 'ZptF4swCh8ttfsmQ:BT3cq3kfUNbwoxqw9Ny63w==:i34qoSFw4ir2l4r44KSf', 'spouse', 'FMKujFscYK7ZhvAz:SwYhnrhlK7C18C9f3E9DzA==:M5LFiWfUPU2Loc8P', '9qP1fqV9jFDWb0ai:yB5dnsNlInCWHxQRzOgbCw==:ha/VIBwISVkG/eKH0s1AVw9PjFMAW7UCNyWd', 1, 0, 'YV2qlogJc8+/C2DE:0eilfA2+8Nb5fxlvNbvU9Q==:Tlmmrc1BCQPaaq2JK8Cb9Is68FvcPF3Yw8/M9K6YPZG4cSEgyaOkWEYv4Tx053TQ');

INSERT INTO client_insurance
       (id, tenant_id, client_id, coverage_order, carrier_name_enc, plan_name, member_id_enc, group_number_enc,
        subscriber_name_enc, subscriber_dob_enc, subscriber_rel, auth_number_enc, auth_visits_approved, auth_expires_on,
        referral_number_enc, copay_cents, effective_from, effective_to, is_active, verified_on, verified_by)
     VALUES ('ins-client-008', 'system', 'client-008', 'primary', 'g6+bveZvCP6QfB1t:hA0yexPkQX0ElaHcK4G0Yg==:g/3C6Zg=', 'Connect 500', 'qMTaiVhFPAcXqUYH:GvcVikdEWK1L61k84D4+iQ==:fRdiamBOK2YkxRHCWg9W3Jw=', 'tOzcWBaMsANBZGbD:bwRbJIsoyl5MyLxsKkEJsA==:EKoUoe8acgH5i/+yFLW5eQ==', 'tYQC1yyMLpesTnkM:XjJqJ2Mp5pvk1qibz2+c7Q==:ct6nSef6glVgCc0=', '2RT848fklCmdxt8L:MM9IVlaG+DlGUV8HCkHe3w==:EOf2vupxLVX+mw==', 'self', 'NsngILDdLaloD4d2:0LU3wus9RZ+2nFltA8Wexw==:aOpYnLSwwcmRk0eGep7B', 12, '2026-12-31', 'Nlp8eKHS+44bFcFQ:jiEMoPdZsf34DP7t6Y3f0w==:e2oGe4axV3UwY5C6Z/g=', 2500, '2026-01-01', '2026-12-31', 1, '2026-03-14', 'demo-finalizer');

INSERT INTO client_referring_providers
       (id, tenant_id, client_id, provider_name_enc, practice_name, npi, phone_enc, fax_enc, address_enc, referral_date, referral_notes_enc)
     VALUES ('refprov-client-008', 'system', 'client-008', 'GS341NhUBwtxXhqi:2WRzAVRDpGiw5/AgUgcStA==:yfrDLSfnHNZvjB2WEusddA==', 'Grace Family Medicine', 'NPI0000000', 'QCygX/JBXgG3cs3h:2HM4/6vid2WZR374b0luIA==:HmABnngi9EzrToPs', 'IuM+w9vpczah9Xsz:AZKanTivdQyinVgHjAbGSw==:1Kt9gHgNFnI5vXiE', '8B+rRhfj3Lr3K84v:JOLohjOPj6nrKVbUzh9bLQ==:trgthSlSDtk6dLuP8x0IbZvddYNm6WQczAOEOlNb/uKDRjjBKOnaLtzYS60MAXaSQmDYX4wham14Mu/5KQ3tuPjnh/RshK0v7y+Vs/keb0j0eKt7kA4ZFrbi0QJODLp7', '2026-03-14', 'A19A0DvKUun9nTcr:Req786UaXr59e7WQm1IlhQ==:8lOLwYRCYa53oD+8URun7nGt63UdaeTimys+9Ba/iwSasP6qTo+SjhKlg1tXeUodbxujUhONzotjz7jZyZmkng==');

INSERT INTO client_diagnoses
       (id, tenant_id, client_id, code_system, code, description_enc, onset_date, status, is_primary, notes_enc, diagnosed_by)
     VALUES ('diag-client-008', 'system', 'client-008', 'DSM-5', 'F10.20', 'EHMtrK9GIUYtkS9P:ykKdQ6GKlGTuT96iwT5FsQ==:YrV3WFINEoMFSIVeplX+vk55wdi9Re17eIva5K/4', '2026-03-14', 'active', 1, 'Y5dzJD2VFmMZnzrz:HUmwMvwd6abpr9v1kO1OfA==:wHOL9AyT1wCK9I8RxJ6pbN42WLVd6FpTvC5V714EXzQcdzablW8F8ix5OI8SIF6ryV9bkgGI', 'staff-counselor-mercy');

INSERT INTO client_medications
       (id, tenant_id, client_id, med_name_enc, dose_enc, frequency_enc, route, prescriber_enc, start_date, end_date, is_active, reason_enc, notes_enc)
     VALUES ('med-client-008', 'system', 'client-008', 'plYrAyjb3/jgOk56:Oqtko7khivSVTpXbOLZPsA==:1JVpTeG4nK/U1w==', '+I1Z5zmNekR5F8wS:9UhMtUJ/BszkpZXlvukqWg==:jY9SoF8=', '0r/Rt+pNcdU6i25+:4Egan+8R/KBTnIB8ZQ+Yyw==:3GDR6BU=', 'oral', 'jpmxfBxHGZsgCN+g:ZA2G5S5LmwqkHR5B3yORFA==:d78OQXRKjCFqflvfV3lTjw==', '2026-03-14', NULL, 1, 'WfJm5zKc6xv4F0An:Qxs0P8G7eOZ1tzzCaCf+RQ==:Zvz7xYD3TbSQsG6HgP/A', 'i5CrnnotLRLGVaTF:7BaD1ZVgOH1qHt+Uk1x7hg==:6ggomvYWGJnocI905VisTmIeCNdV5zVjyGcXHejvF+wO+ps3BYFC1xyY1TwJGC3OF4c=');

INSERT INTO client_allergies
       (id, tenant_id, client_id, substance_enc, reaction_enc, severity, allergy_type, onset_date, is_active)
     VALUES ('allergy-client-008', 'system', 'client-008', 'SlfrKleohkNxzFWB:Fks3pCANJX/T01Jxuu5snQ==:OfJSvEAeuA==', 'hYOiNZLxsjX3KwIW:ah2YFRJrOU+TMrhjKwlPdA==:bnN+CHur5avXwQvrjHMTwhqn', 'moderate', 'drug', '2026-03-14', 1);

INSERT INTO client_clinical_history
       (id, tenant_id, client_id, past_hospitalizations, hospitalizations_enc, past_surgeries, surgeries_enc,
        chronic_conditions_enc, pcp_name_enc, pcp_practice_enc, pcp_phone_enc, preferred_pharmacy_enc,
        substance_use_screen_enc, mh_prior_treatment, mh_prior_treatment_enc, mh_prior_hospitalizations,
        mh_hospitalizations_enc, mh_prior_diagnoses_enc, si_current, si_history, si_plan, si_means_access,
        si_intent, hi_current, hi_history, self_harm_history, risk_notes_enc, last_risk_assessment_at, risk_assessed_by)
     VALUES ('hist-client-008', 'system', 'client-008', 0, NULL, 0, NULL, 'vbMdCEmafW2P/WtC:qng6FH0Fgx1Zc6ajCPjWeQ==:EoLcwFKbWPZPeNwkANvGrtB8nDX3Hq6WDbiVZGe87dRingNeB1Byek5N', 'HckfnJ4Ylv93XXsY:9cgW2mSi7lx4XqgAElqidQ==:78f3EVfYvTBp1UdmkD8OPg==', '82SlsiiKTfUZOC3s:CnUSt1g1HA+Pv1dTE68LAg==:XYKOcjOi1w2bQyiBN9g6jrVA2Nin', 'sd0ToMsNee7viQQo:Duca72XfleZOQWTlqzO7Dg==:BEbluXdzwIXFtwfs', 'xEoIiUF9PyORSWgH:vbouJ8GFUyLfk6StC6DfTg==:/eK4mzCm08HopBOLyuemTaXU7MspTBvvsAYVAC+8x5vIBfEv4tIA2o/vSQQq4/0X0sv9', 'RxNFGvZGuKMtCWSc:SN/dVdloLBvY1QN/tzNsmw==:/ciYC48pmw8eR3zqfVkEbIn4WDnO9/vlJjvu9bo5L+Q1Cvw51icVsTfGAGYxmoMQn2sFSnW8XpR4gcp6l5M=', 1, '6sz4qtW0FcyN6D/P:8H/N9EF88Ly0GARqiUK0pg==:bBQjaDVlXxPMRfppUCAJWCX3qh5KFYEfnGezmtcIQoDHgVNU7jYJkdDXLRHhsg==', 0, NULL, 'TTHoRrNvsbz7Im4G:XSokxf7flxsOcoQTc+bujQ==:YuRHlEXqAxt+sM7KUNgG8FuaGgSavEyRYVbck8r5', 0, 0, 0, 0, 0, 0, 0, 0, '7Jt3ajGBpGN7VNb5:puZQeBn0dcAT4yIWgvGcYg==:+7Vz76rGSR8XEkj5O8GkGRzPOfEmZrvWpsdNwAOkHEHvFInZGtw5r3pVQA4t4RUjAyT0SzC3f5gDjcPCnlQ2CKnretaVDH9UlphiGEFwYfYoEh/w7Wozew==', '2026-04-01 17:50:00', 'staff-counselor-mercy');

INSERT INTO client_faith_profiles
       (id, tenant_id, client_id, denomination, church_name_enc, pastor_name_enc, spiritual_director_enc,
        faith_integration_level, spiritual_concerns_enc, religious_restrictions_enc, faith_strengths_enc)
     VALUES ('cfaith-client-008', 'system', 'client-008', 'Methodist', 'kG8NpYBL3aZx913L:pxPlpCPDs9Au8fXw7bBO+g==:9gqbdqxDh3HMXRewjJUrjg==', 'PbKo6UBOZpClZhKL:c+XOFgs+YTG8BBU2K8gG+w==:kQZMQyXriMJYqhT5xsYe3+S/', 'd2x3WZklR/QIEU8N:MXmrFZwNz9gqkLnKX6b+LA==:mdDLQgtjOfGRg1LiRw==', 'open', 'nLi06y/anA5LmZjC:eaytEEe3kgCcp5NdlCrQKA==:wVXsM5KMwj5UMu2oUEr2lLOmQSlzcY9BMLu99L2F77sPCSJsxd6RDzlPOlBx41V/Dn7MCZ8QYwudYNJX1Jeu', 'mD/TknRTqd7qCi2O:is2bIdPWI4Yow2+YNGR/bg==:UZZdpVrFOw0CJkTjpw==', 'bNuYqjay3DXDn1P2:sEu9iqw/lLxDLzEcL+BZLQ==:75dLsFgcRWZKbH6aRme229M+sdWM4/9An0Vk/QPZvloUP549PgtSVc7eqakw08mJFAAu04JmEErB7pvj+ZWK2NiqwwQPDSoF');

INSERT INTO client_legal
       (id, tenant_id, client_id, guardian_name_enc, guardian_relationship, guardian_phone_enc, guardian_email_enc, guardian_address_enc,
        court_ordered, court_case_number_enc, court_contact_enc, court_order_expires, custody_notes_enc)
     VALUES ('legal-client-008', 'system', 'client-008', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL);

INSERT INTO consent_records
       (id, tenant_id, client_id, consent_type, signature_state, version, effective_from, effective_to, signed_at)
     VALUES ('consent-client-008', 'system', 'client-008', 'informed_consent', 'signed', 'v1', '2026-03-26 17:20:00', '2026-04-01 17:50:00', '2026-03-26 17:20:00');

INSERT INTO intake_packets
       (id, tenant_id, client_id, status, assigned_forms, submitted_at)
     VALUES ('intake-client-008', 'system', 'client-008', 'completed', '[\"ShortIntakeForm\",\"InformedConsentForm\",\"AnxietyAssessment\",\"PHQ9\"]', '2026-04-01 17:50:00');

INSERT INTO treatment_plans
       (id, tenant_id, client_id, status, goals_enc, interventions_enc, review_cadence, reviewed_at)
     VALUES ('plan-client-008', 'system', 'client-008', 'active', 'lJJLv4v8n0WHobQu:QWbJ2KG+haqGIbx271AOhg==:dTPbBbpgDsG04xbguI2YnXYgz17BJFaJgLXsMZi+4MDnalmqyP7zszx3BYkyzUsTFlq7fZVV/o0YmMIQogpZ3NJn+F2rxs2drk+don+dkGC8ogF3z40XnbJgFHssmV+eN9N0pKvRUvYj2ECRe68QYeQmr4gJ1/b0HRrckK4y1P6i7ArZ50dEJ4d3DpWgqIQ45lorlBfAe1n8lDUNbYVByIIsmJ6W8IS+hntjWn0BLDdNeaXKgfSvo5YOwOW0FeejuH6zawTJBhLUkbrvFMH2zNhRmVeJ7N5bVMSIXVp9+6fhgnpBFPXBdUgR/dXUtltAiVRL/86nGqtKGh89O1o8dxRAyH65y5S6Vdbqkt6pz9y9ceUCG5M6D+k1UomIo7KudHp8/PeJkCsv0upnPm1ztek4PB7Jp2FouDFUI0E7KXxnb719h3STrwkg9i6wFMLcBOo7v/CVnayUMkxaSfFroelk1BEpyg==', 'zoqPuhYFWxJs+kgL:3RCyzctzm+6eIC1QeETqXg==:KU7ONIqfQJdlJ7m62Ob191vaQ6CtZjlEv4rX0fruaRj5e/OZ5u9pET5Fq2Wbk+uwBFZZC53qPfd1OhgYR6cmhkryfwqC9IA62K98HmSH7QaCMvr7E6RWUadaThCp6qYQBh5D9xgRAqlR7klCO7QWV019i80S3zEa', 'monthly', '2026-05-06 00:00:00');

INSERT INTO portal_accounts
       (id, tenant_id, client_id, email_enc, email_lookup_hash, password_hash, failed_attempts, locked_until, status, mfa_enabled)
     VALUES ('portal-client-008', 'system', 'client-008', 'PDHWsvOvMur++mO9:iX2jk/ujoxjEftbTqXwc8A==:OjwPHAZjnu+YUZHVmp/+rARGcQ/3kaTP', '5ac8781b618d6b6b2d439b58d78df908ad48d0768004b043691e779e2e4e7fc7', '$argon2id$v=19$m=65536,t=3,p=1$RIMtuIoYp95Ji77HbqJxxQ$gFx4zOuAa+uWbiRWuAGL2BRmHIw1Z+suw16YbdduAsc', 0, NULL, 'active', 0);

INSERT INTO portal_client_profiles
       (id, tenant_id, client_id, preferred_name_enc, contact_email_enc, contact_phone_enc, contact_preferences_enc, profile_details_enc)
     VALUES ('profile-client-008', 'system', 'client-008', 'g1a/JtFVTg905WC6:pDdaQ765zlZffWnrAXIouA==:TRb5vDZZ', 'sOAKNuPqoGhvg53q:1yil5qVtwNyUorh9x9rLQw==:7Tmk43KqKuApIKh3xGLP2Q7nQMJf3jnl', 'Qqca2PezLdeHBnsQ:4O8VfOJOdfEl9qw34NG0wQ==:p83WX80f8vzKgzxz', '538X/tHz4l41iZV6:wELSnGy50zqoMTG7G+qBYg==:UplQaLfd9k5qBv2twL0hEqoDdLAmg9Vcx9wr7s1Tvw==', 'IFdHbd7NKsrApLK4:SNIkMIlgzH9klJgsNP5AvQ==:fLOylphKmA6k+3JKSSVoNItvRWq9OweL+ipiiR1toDFsW2dQDu3tZxj5InIUQByIV43j7D/SW4i/oi6aRiQNuXEGkTo89qnjm7Hi0DFERns/YWb0DZ04iU3nZYZzzFw=');

INSERT INTO faith_church_referrals
       (id, tenant_id, client_id, church_name, contact_name, contact_method, status, consent_to_coordinate, notes)
     VALUES ('church-client-008', 'system', 'client-008', 'Harbor Methodist', 'Pastor Daniel Hart', 'email', 'active', 1, 'Daniel approved collaboration with church support for practical care follow-up.');

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-008-scheduled', 'system', 'client-008', 'staff-counselor-mercy', '1s3ZQeYRIVaDKDQb:tscbd3+enJrkSBE9f62aOQ==:/eXARaAQ1J7Mu5k=', 'a9qeK9oq/mio17DK:BXNmOJQJTf5ZwM2piWTywQ==:n6MDQ8amfgp7n2TJ', 'individual_therapy', 'scheduled', '2026-03-17 15:00:00', '2026-03-17 15:50:00', '2026-03-17 15:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-008-completed', 'system', 'client-008', 'staff-counselor-mercy', 'wykIq9JMWvyYzb4C:J4AEGfDz31JwJHsGMCR1Ww==:2Tb3zjtGf1QYyr0=', 'Q8s99GdrnE2josSY:oXy2aNrxtztcE+NYX/K/Ew==:BSuNYJVzXQJ2cjhO', 'individual_therapy', 'completed', '2026-03-26 16:30:00', '2026-03-26 17:20:00', '2026-03-26 16:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-008-note', 'system', 'client-008', 'staff-counselor-mercy', 'Vu/xY5EkePa9DlTA:V6UZYKjoncvlbDvxqHgshA==:YHgMkyMEOd8eGVU=', 'KxKsp/qt2dVXFft+:tbcydlMS3oxVY+bAVkMiUA==:hoKVvBXxhSGDQj67', 'individual_therapy', 'completed', '2026-04-01 17:00:00', '2026-04-01 17:50:00', '2026-04-01 17:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 1);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-008-future-1', 'system', 'client-008', 'staff-counselor-mercy', 'LajG2XO+Olb5RFPl:lPon7wTsBM0awLUcYRq8Zw==:v7KHUaZvR7+SO1M=', 'E8+dMYHOedQwMix1:pq30gr/d/yZce8mnXwfzEw==:EMg7H5PWLRoUxrim', 'individual_therapy', 'scheduled', '2026-04-16 11:00:00', '2026-04-16 11:50:00', '2026-04-16 11:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-008-future-2', 'system', 'client-008', 'staff-counselor-mercy', 'bACw3h1Qra6wc/5h:US54JnDCm6XlNPwEyQlo2A==:XMp8+8xlq/e6/ao=', 'ChRBpOmdsa1zPsJU:EQdqdhR3Ov+LTJFyaF2FoA==:mW31alxPDxoMzGBm', 'individual_therapy', 'scheduled', '2026-04-29 14:30:00', '2026-04-29 15:20:00', '2026-04-29 14:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO progress_notes
       (id, tenant_id, client_id, appointment_id, note_type, summary_enc, interventions_enc, locked, signed_by, signed_at)
     VALUES ('note-client-008', 'system', 'client-008', 'appt-client-008-note', 'progress_note', 'zXLPCW0W+Xxh9Oz1:4qhUdFbwNyH8jb1nNiU/wg==:XAzr+zJx2sB7sz7aXHXxlo7spZh0kO4R0h0gyHjMUTCekFz4AYqliW3Cx6N8hlfHLR/7BBcqSprt4J25vq4sbTGuYlIP4adMMTVZ/kZSYDpnPCdaThkskuBjTDuypfqAiNUt8fqx9axVf21x7wOQMc3z2y3/PWU1pX8UMzTdZPKYY/RT4tFL11KZ4ngaWBcOxmiZbOazGgrnFlODaXO4omskJnI4JfRi/qdRwZdQhv7YPWAZ', 'rBfxxUTnNRa703tG:dTcBXIs5X98lMJg9JHY80Q==:kQxTbORXhaBVljmOEiXEC31pjNA/F8YOKTbGn5cwp+gednw33lZiJTmFRJy12++bBA+0wshpCO/h14pleEgKmo+Sss59t32HuKgWTz+ZEern2SjrrMMAsDE7N2+meHzKpjzig9Mm92RbrElDMAK2u0B7fYoQMqCOM8rIe/EyA+yBF2jVu8H4QKyOS0x5S4sTRg==', 1, 'staff-counselor-mercy', '2026-04-01 18:00:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-008-ShortIntakeForm', 'system', 'client-008', 'ShortIntakeForm', 'Short Intake Form', 'account_signup', '2026-03-26 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-01 17:50:00', '2026-04-01 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-008-ShortIntakeForm', 'system', 'form-client-008-ShortIntakeForm', 'client-008', 'ShortIntakeForm', 'Short Intake Form', 1, 'client', '84qsoM9KaW7yP/dN:CPvd7W3EN2zjnYS67P1APQ==:cfCVAQAy/tqspD/c95F7f0Pe4e9Cg/v6T1LYs1MtA6UpYtLJ+17k/6mnKP2HZGTkFu9PenLrzzIf1pxOMmtAz23vtEz3MvYrhcrfkRHGsvZEHQP6mlxgovip8M2jpiIdyp7CBJzaHcp4d2Sjhyh1LfK6B8aNkelBmuVgyYQlb0PJJnAktmWOwMW0X3cqcuXnHvL5qTXxG8TZ7gINIb0v91qajR16/xWMdqpUTIwEWJ1Bxbox03Yf0fH+29U9IZznFV0EXQsqxcqrR+O2K1JGozZanLPrmeocA5HFm+ngBEzC7BAxqOP9hTZFrs8T3qPaqeuRatGD5agjaeDlGpTXwrcbVMUH9zyJhb3DN0nmfubiKk9KRQ/eosuMaoqqmPCQNRGzPccSxtNjo4p1rXYLqRCL39ALI/WSS1dQeK0Wk1EsY4PTQJJdyagalR43jPgKYQVeVZQO1WhGvHgBIJgXOoqBXbUaOTzVQ88mcd9vZPTHEdnywzyWVrs81HzXzdS/b4aSJzVxoYFKdFM=', NULL, NULL, NULL, '2026-04-01 17:50:00', '2026-04-01 17:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-008-InformedConsentForm', 'system', 'client-008', 'InformedConsentForm', 'Informed Consent Form', 'account_signup', '2026-03-26 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-01 17:50:00', '2026-04-01 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-008-InformedConsentForm', 'system', 'form-client-008-InformedConsentForm', 'client-008', 'InformedConsentForm', 'Informed Consent Form', 1, 'client', 'kaCccVH1bsGC7quj:EuOgAUl1cnotDyTV4si1vw==:pF+nCMjGzgdw/HTg/+2nyU1UrnFBWm5fOEQuEPoHgd+tSi77scNt1Fj0cAyJdxtjCRxbAXPlukVeUbou0IBhPqJWkjS4S2JKi9yjbjzCta/WwwFRKvmRcVZBgdj2IwLZ0hUS+SKzgTENCmzaTkrYyyTcY/Wvw2QiMGU3SBIYnSYqab44NDEPR44z6wKCkF27IvLLoo2cySL/lWO8yMmR3CyquXmAgYlpsNC2fEDr2raoFOg0/fMkRDHGk8UjATtdBHTHGM2ALv2fL5qI', NULL, NULL, NULL, '2026-04-01 17:50:00', '2026-04-01 17:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-008-AnxietyAssessment', 'system', 'client-008', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 'account_signup', '2026-03-26 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-01 17:50:00', '2026-04-01 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-008-AnxietyAssessment', 'system', 'form-client-008-AnxietyAssessment', 'client-008', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 1, 'client', 'sIQcp9dCXzBfPPUh:IdmLtyxnKDkiBLD34zWW/g==:tkfAA1RYBmoKHUCFbAUjYuvnp5vOePv0EC5gXwAhmMXHuXV7ckkZ8MOC6nm/hfo8bwk6xL8NCxBpN1I1RgbioAWAopTYbHj1k/c7eIQ9OBgRTlkUvLLXrNyreMLuIH7qPLND5NsWP3jb8rICgRswjIItd9YcjCp5O/f3Gc2WfRmIPp8PUcKIc1725eVgy+96yi16HQbqad3xaZRbQKw/pl+zzt5ZXA2n3/2jhS/+TEuaPgoRuMAEJWVEXw09Fw==', 'Moderate anxiety', 11, 'Monitor weekly and reinforce grounding work.', '2026-04-01 17:50:00', '2026-04-01 17:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-008-PHQ9', 'system', 'client-008', 'PHQ9', 'PHQ-9 Depression Screener', 'account_signup', '2026-03-26 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-01 17:50:00', '2026-04-01 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-008-PHQ9', 'system', 'form-client-008-PHQ9', 'client-008', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', 'J03AtOTcK7jWtuN+:NGs9lQCqnNnT/8W9vyxELg==:fo+CwOPd1mYmSrkJONqPOu8bEWCZ2GGyhSIDs7Ssllk8xrwlZHp7QpG3bi6LWVl8kn3MwXyI2ssjfAWEE0FG7W07G5Bt/MyHUqIxYcvfanr54j0uJ8Ktee5+eBrmcS0bRHPR02rwzef6iCWOXkt4wBNA3MjVTPPd4QPuStXK5BJfaIabXBiAfbgCwcTr3pXVVX6Jso9f/8ePxU0W4jn4blZq47V5g0W62M+7lW9Ou6e1umn7fR4nKw==', 'Mild depression', 8, 'Continue behavioral activation and sleep supports.', '2026-04-01 17:50:00', '2026-04-01 17:50:00');

INSERT INTO offerings
         (id, tenant_id, client_id, counselor_id, amount_cents, received_on, note, created_by)
       VALUES ('off-client-008-01', 'system', 'client-008', 'staff-counselor-mercy', 7000, '2026-03-16', 'Daniel shared a ministry offering after session 1.', 'acct-001');

INSERT INTO clients
       (id, tenant_id, first_name_enc, last_name_enc, status, faith_background, high_touchpoint, primary_counselor_id)
     VALUES ('client-009', 'system', 'vDqOepjXz3Pldd3X:scw9Z9MGsFy8ILMqg/ZeoA==:0xgpIrs=', '4HV64qBVm2t3wkS5:8qWZI3AQQ94xthXJVrUTFQ==:Ms3WvpGcQw==', 'active', 'Pentecostal', 1, 'staff-counselor-mercy');

INSERT INTO client_lifecycles
       (id, client_id, tenant_id, case_status, referral_source, emergency_contact_enc, discharge_record)
     VALUES ('life-client-009', 'client-009', 'system', 'active', 'School counselor referral', 'EmKXLIx9dMeqsjcV:/abefWo8sXFuoejs85HDVg==:W/k3mCPBl5iYncEjsXHDyDseIJUJfz3WPGNAYKMDUF4ECjtCSVLvG9vbzcBltbb2v9P9xTtKSPPy9wKjFaSjGF5SdhqP1WVDZvI=', '{\"readiness\":\"stable\",\"demoDataset\":true}');

INSERT INTO client_addresses
       (id, tenant_id, client_id, addr_type, line1_enc, line2_enc, city_enc, state, postal_enc, country, is_preferred)
     VALUES ('addr-client-009', 'system', 'client-009', 'primary', 'Ps6CgCg/1yglMjf5:NuHX+YVfDdcsEzVuQh+k4g==:VLSpcTRwuUb2dMMybmI=', NULL, 'qjuZ3R23iEV53ccR:ZDfgftGlmTGhnBzRmeW8Fg==:gvg/mA9ygg==', 'FL', 'U2BPpLLF8nY+t3z+:m8GkPV5sXXP5MSAz6IhcFg==:o+O0nho=', 'US', 1);

INSERT INTO client_phones
       (id, tenant_id, client_id, phone_type, number_enc, extension, is_preferred, ok_to_text, ok_to_leave_msg)
     VALUES ('phone-client-009', 'system', 'client-009', 'cell', '31ZfC8ESJAHbyIN7:s02fydovAzpOWL1iPFMCZw==:skZEgPcTjxZuUgVL', NULL, 1, 1, 1);

INSERT INTO client_contacts
       (id, tenant_id, client_id, contact_type, name_enc, relationship, phone_enc, email_enc, is_primary, has_legal_auth, notes_enc)
     VALUES ('contact-client-009', 'system', 'client-009', 'guardian', 'vLEP2qRgmrUmiRrs:2BrZAmxyD6okPe4RqbFVug==:ozLORI0/sc9olaeh1U8=', 'guardian', 'WHtYDKSdN4W7TLln:cM9y7INJ0GtJ1WP7yqnlng==:SbajgtOGMOm61zLW', '4Uu0chptiAPKbi0d:ciLJ+I9uF1fucIPjURzpFw==:vqaSqYcU0ARdyx4/daIRZuKTEDrUHZeHw8xh', 1, 1, 'xvNGYQ/D12mic7sK:kAl6d29QbGmwOoP7FBfKzg==:+ymDvXBX+Ydy7KA5OedDggXJBH31ROdyGtsSb6g3pDexKo7pGgTxu2ReB+WhksNn');

INSERT INTO client_insurance
       (id, tenant_id, client_id, coverage_order, carrier_name_enc, plan_name, member_id_enc, group_number_enc,
        subscriber_name_enc, subscriber_dob_enc, subscriber_rel, auth_number_enc, auth_visits_approved, auth_expires_on,
        referral_number_enc, copay_cents, effective_from, effective_to, is_active, verified_on, verified_by)
     VALUES ('ins-client-009', 'system', 'client-009', 'primary', 'Xh3svBIlhYms2ADF:dII4KDdQAoFHmJ/q2cJ7iQ==:9dYQGZ2q', 'Molina Gold', 'UABTDqIdCzsaSqBo:Am4GX9XW/bzGBvrMNGlmDw==:5y7B9Sbz1w6XifBnHhYS7aE=', 'tagD7W14Q7VXTMaz:s6ODIWSU7SUy0IxDeqkEWA==:rBFek94BfNTmI3Sxt2/6fw==', 'sUANEjZFIdKK7kcX:lQqkBYK+tQWssQEAMS7u1Q==:0y/zG1JoWz9TvBY93Q==', 'eSzlFISG/lM0b7QQ:K9UKscYRK2FpJF/aHLU5Nw==:Dj0vw+0HYHvPag==', 'self', 'AdIwzZ/NWQBl1p/Y:2Rfm99iDaw/Ef66BPE9+qA==:ZwuY2mOJb4gV4iNwJJ+A', 12, '2026-12-31', 'Pwz+FK0lQsMbH9F8:5LtGm68VQAtyImxD/Ulyvw==:KiBR6thldcT6Y45cyO4=', 2500, '2026-01-01', '2026-12-31', 1, '2026-03-15', 'demo-finalizer');

INSERT INTO client_referring_providers
       (id, tenant_id, client_id, provider_name_enc, practice_name, npi, phone_enc, fax_enc, address_enc, referral_date, referral_notes_enc)
     VALUES ('refprov-client-009', 'system', 'client-009', 'VO9u7rguQjmcTkmN:WQt90jg9Do02YnV9wJ0wpg==:qisUSxjc/keoScIXcQ0caw==', 'Grace Family Medicine', 'NPI0000000', 'JuxiQ5XcTHOMSKfT:+Qm3js1tbMLPWpdXYm89Ig==:ykfI2Biuh5eFd8Uz', 'NFWdqJ2+vbG/pdm1:LsXSMMz9VMJ0851F4HpT7g==:amo+uUmpc8oSNC2C', 'KkvqyTjpEBT+3np1:lZ9NaV28kQZXrHvp8JrCvQ==:uxyi5KQz/4LnkRlBBlP8OHCaCfkl2hVeP0oAiQ48mCI63awHbBea+ltGJVVQjEEBVRPuZNVMjzvfRklbUEs/3mczYOiqZUr1bIgxdQZ/99yDHd9AyyFJmQ==', '2026-03-15', 'IoQMSae98v8/iSLU:46lIg8wpQBqKeCW3INV/IQ==:OLLyXtUmi6idQct10D5tidbmPFUQytxunBIsnOMsr/Ci1ngvlcRd2BIv07vid5ZzTMn3gej0YS+tNLrM3yY2fA==');

INSERT INTO client_diagnoses
       (id, tenant_id, client_id, code_system, code, description_enc, onset_date, status, is_primary, notes_enc, diagnosed_by)
     VALUES ('diag-client-009', 'system', 'client-009', 'DSM-5', 'F43.22', '+anVcRj7bV0OR7pQ:YxgoNNO3g4TPwgoEhnxx7Q==:yegW+0r3UlDLHMxNKw0OPCfsEFhDixSnWYw75+Rxgoo=', '2026-03-15', 'active', 1, 'mPqZnMNPlVQIHuSg:iC16uxP4DyYKnYUEnqRk3A==:yPsgpTSa0nuA4Xe6XU1P8J65gJEOI6C3xg1hqo9GxNsGCR+wd2YsdunRKph1woSmkUhm+iDG', 'staff-counselor-mercy');

INSERT INTO client_medications
       (id, tenant_id, client_id, med_name_enc, dose_enc, frequency_enc, route, prescriber_enc, start_date, end_date, is_active, reason_enc, notes_enc)
     VALUES ('med-client-009', 'system', 'client-009', 'Ffr6FoeqDUFf6N44:cRav77eA+ltAIhJanUQXGg==:hwG1Sg==', '0XOCafBFM8cLOS38:JfrABa05FZLSQiddHdLj/Q==:Yhpf', 'QcOxmDkswni8PE21:KEdfJO6jfnyIxEnb8syg7w==:3rP7', 'oral', 'Dj3zqSuxuRHCItu7:474QQDayqTYDb1C6bxQwfQ==:cAweL3zt+zaYjaHzhoXpjQ==', '2026-03-15', NULL, 1, 'Kbb642SWKnQSae5/:QO712heTFd9DS7ZpLVfSPQ==:UEWSKnSfPck7JdIiYEBb', 'O0R+gQs2cuGRyIlk:BJ/NB8c/rHGybbFiBPMeZg==:ZvP/G96YZwv+SrM6w58oIChKJsnVeMOfSvxER1AJe8ynbNdY5Y49B1mR1i8/YTlHX2U=');

INSERT INTO client_allergies
       (id, tenant_id, client_id, substance_enc, reaction_enc, severity, allergy_type, onset_date, is_active)
     VALUES ('allergy-client-009', 'system', 'client-009', '+Dd+FeCqhnuVGUrn:nEzgB5uU18gYlTO8ZMiMqA==:ESHckw==', 'unaOtrcokdLfWSgV:c0Zkwg4BpcikczxgfmOx4w==:VMc2lNMLHWgso7OwuZmnkWLw', 'moderate', 'drug', '2026-03-15', 1);

INSERT INTO client_clinical_history
       (id, tenant_id, client_id, past_hospitalizations, hospitalizations_enc, past_surgeries, surgeries_enc,
        chronic_conditions_enc, pcp_name_enc, pcp_practice_enc, pcp_phone_enc, preferred_pharmacy_enc,
        substance_use_screen_enc, mh_prior_treatment, mh_prior_treatment_enc, mh_prior_hospitalizations,
        mh_hospitalizations_enc, mh_prior_diagnoses_enc, si_current, si_history, si_plan, si_means_access,
        si_intent, hi_current, hi_history, self_harm_history, risk_notes_enc, last_risk_assessment_at, risk_assessed_by)
     VALUES ('hist-client-009', 'system', 'client-009', 0, NULL, 0, NULL, 'HXjiPOvLaIDpumrU:3CkD0HQj9C+d8F6ND30EMQ==:YCH9NBcvW/euoC6di43JsfNF4wJqBvkUtF2fN3e5jlkW0ICllI9htGBH', '2IacmRzsCLUJCs2p:RnqPP2gnHqHHPbrpwqLoXA==:s1J3wLgjjzvD8XLgl4eHAA==', 'N/jsc0Qs0K3dW6xr:9/c7/FAuMeK+nC7J0X9JuA==:8cFut/Jq1qjA5+tXSENMSs5brBLy', 'IBnqxkG74TGf6vRj:QBmALl/hbOloye5qRT+KsQ==:M3dkL60wbBcTyPtR', 'A+/TqvGK7A9pv2AG:sjFItoI9yqW6G9gclfjoBA==:AHbNJtBvK19JxVVGsSC6vt+FxDCXZt/BdhQhUsMWvefnsFuvNFFgZgN07pPmH6ePM59h', 'cQwz5DMNan5+OkMr:O5ynAKkVQIUk/jPbnDqzKQ==:NY0/lKi333P+63N+1wYpxYdt0CUc3q1evo7qpg+aaP6LA/MV2FZ70ebMOMyeGRjdP8/E+UPjOQ+fQxBB6Ic=', 1, 'ReBJ6QhZ1jJNPxpw:nBDLUwDmXEGyZkPCvc5XmQ==:ZlarFkVD5bPJt3rf5C2OnnOqUzkGoZg8FgnqsqH0JecZUJh/qgAmwRgOqnQQpw==', 0, NULL, '9beioimwn8afnfCh:yxqVa+YRRwv4/r9IRN4evQ==:M0BUMd1+rjOO2c1yDW2cFDRap+0pTwBZRmf8E7Tzf2c=', 0, 0, 0, 0, 0, 0, 0, 0, 'oYcHyQ+XeS//NQwf:oUQtYmzIBmZWDMSOH3f8AA==:/ABorKXi2tiaftR95p0mFBHukT+0Z1RYQYHrcd1odGUWNDyM9MOVADf8uwEp4W5B/dfQ4emSkPomhL7SODGxZBP0FRk8uNGw3cm15vNzqORIEzjXMm2q5A==', '2026-04-02 16:50:00', 'staff-counselor-mercy');

INSERT INTO client_faith_profiles
       (id, tenant_id, client_id, denomination, church_name_enc, pastor_name_enc, spiritual_director_enc,
        faith_integration_level, spiritual_concerns_enc, religious_restrictions_enc, faith_strengths_enc)
     VALUES ('cfaith-client-009', 'system', 'client-009', 'Pentecostal', '7ngP9UKCyc8uCPpp:YOCE3BCWyCJHmc6TQtjsEg==:jeDJStjk+PC0sEEGVK3JwrbAuiddCMM=', 'kBwpu+Z3DpauxWFw:BHJ1V9UbKi419YdgO7mgjw==:09ekNcFZ4pr4+f5fBd2XJu8U', '2hcSi4b6rbYXDlgD:Ed2MX/0SN8AZ+J7Vu/lPGg==:Vmln7DHe+AOwepWz5w==', 'open', '/P5Wa9UiBr63XDkR:F07A4EesVFV++IToHHfVmA==:gggawJrqwhZPkX6xLs0QuTbzfkPYZM48BEKgoaUJ7SdlGBfmpfCMpuvfkaH2ANv6Qla9Gesuz6Xc8uFrG6IE', 'XH6Oye/mhxN1U4Tx:J8Jz4pGhZAU51C1FO/Z1iw==:IqsG/03HQNP6eS8k9w==', 'y0jNjY5fOtHDTqgy:xuGYqWPPApK9dXyaLkXE4w==:hZIoudQcPSy4Lq7XCkE8mvj4tMAHf3BSWp8fpkbDZYlTK/B58PpPto7OHozvuD3NazQy8JS0fdhoq7w+iEjyD1TpApoWGTiS');

INSERT INTO client_legal
       (id, tenant_id, client_id, guardian_name_enc, guardian_relationship, guardian_phone_enc, guardian_email_enc, guardian_address_enc,
        court_ordered, court_case_number_enc, court_contact_enc, court_order_expires, custody_notes_enc)
     VALUES ('legal-client-009', 'system', 'client-009', 'fDZFrLkVQjNjS2Ez:ARGFVDf+skavvgh0v1lAeA==:xkFPGtcGBFrVvTMJ5hg=', 'parent', 'NvmdX79uHUedO1Wx:+BaW2Mkecu9pT6QsxCz/vw==:KkrzeSJblVrgrHZV', 'wJlZtTRRHVMnHnQl:2yp/KuPDbU+cXNbXqJ8W+w==:N0mRhkZHPPUitW2Hb1OdXpSP/Uu2cZ7A3QBB', 'uwh++h1Fs0UsjHKW:K2VR2pl6YyLL2e8efjszGQ==:qUmVX0dEajbBKmCvBScccX/g87SEn78Cef39mmSrMX9oVX9RLOAY4uxKP6DD3xH/dIG6pm7T/GK7ucu6CbAz17zfPYBj33nB8ogEwcHV1WbclTGJniG7Aw==', 1, 'FWurE6ASCHzlGoFZ:b+6t837oCkyudQ2AliVPWQ==:LLdHy9sdBwR2HYFaJsAl+w==', 'Hrn6S9XajOvz8AlB:6Xqd5+Tv0TE+joK7gylojg==:MjdxFIqd+vWQa7qf0ET4KCFggJ6q7mOA69a2piYBIfr60aJ3aWlMTyCCysdTJnm3S9Egxxgwo6Q=', '2026-12-31', 'UgiHOW1hPufmSKmx:0doVGXXEsHycCUMOQ7x2Sg==:k8MAfE0KoM3eUY4ph5gJOX5hcwKPraeW8fMpybuJxM2xDU0mqnJLWgNm7PQ+iWg21iLVRASQYgp9DL0RQhcKoyDcwrF8zg==');

INSERT INTO consent_records
       (id, tenant_id, client_id, consent_type, signature_state, version, effective_from, effective_to, signed_at)
     VALUES ('consent-client-009', 'system', 'client-009', 'informed_consent', 'signed', 'v1', '2026-03-23 16:20:00', '2026-04-02 16:50:00', '2026-03-23 16:20:00');

INSERT INTO intake_packets
       (id, tenant_id, client_id, status, assigned_forms, submitted_at)
     VALUES ('intake-client-009', 'system', 'client-009', 'completed', '[\"ShortIntakeForm\",\"InformedConsentForm\",\"AnxietyAssessment\",\"PHQ9\"]', '2026-04-02 16:50:00');

INSERT INTO treatment_plans
       (id, tenant_id, client_id, status, goals_enc, interventions_enc, review_cadence, reviewed_at)
     VALUES ('plan-client-009', 'system', 'client-009', 'active', 'Ap1zmzH54DcsatC+:KQby9x8vG6K1evgOWeTyuA==:v3oEvXdXleYUxg+nM7okPi4gRPXvpXLm+VcED3mI1QsWEatgu7XuEnQaAASoz3o+D3eXm/yM0FX9A4pNEJu5z2LimkIbQaeYjVA4tKSEbKQQJkpZXLsmFeuRImbwmO0HlFGwcGzmCTZ8Xbs3WZ1XkO2HgOFfYyX6fzqgp6v5ScBLBqQS7GBcBNVOIx7Xym0TfdMnwRN7sg7uuBifjqZ3ivdrxpi85/4ok8NWAs+4pkMVaI1ituTO8EJRTEYM4r6XndBYyD5s9Dq7d+7TX/eDQCAwYzBHprjDn9PPPmB7ngG0yju8Pu5d5k1Bi++HrpImadWWHoCsLtGs+yYmbRK7gJqsgNtrR6q8ZDew7MQg+ckMuAClW+ev6Iz5Fe7UNUXTSbx0M/rZYdZsCcMGh4VdN9b1zODG8espZsg+5lSVRs5XXFCvJw0mXF6jo04N9xoU3dZ//KqtnKKltefvZd1VgCapGCUv+w==', 'FKAZ6/n7wkTNHxgO:6bkT/cL/ywHMWnQXa/ceaA==:NZ3qloN+SHLmQcq+pP5MiM2ZNlS/tAesAM3sZV7bKjPhvR1754eqlGpDNqpchnKqsGWmi1vZfkQN+U19ku6+ewu9QVqU5EfggprqVoKazzb3MaKcFk+K2qyzAxljR+Zkk+v3CXMuHI0JdFxK83xx8iypb5863KjT', 'monthly', '2026-05-06 00:00:00');

INSERT INTO portal_accounts
       (id, tenant_id, client_id, email_enc, email_lookup_hash, password_hash, failed_attempts, locked_until, status, mfa_enabled)
     VALUES ('portal-client-009', 'system', 'client-009', 'DURESsIfjVykaLxn:KhDFO9UmpBP8xQRPpcYuVA==:Z119qrEP8meopb4mmyWawL96kX/VGTHAl1c=', '5080bfd55343df30ef2d1d27b7ac77907692a1cea97b32d7c9a9b96190b9f917', '$argon2id$v=19$m=65536,t=3,p=1$RIMtuIoYp95Ji77HbqJxxQ$gFx4zOuAa+uWbiRWuAGL2BRmHIw1Z+suw16YbdduAsc', 0, NULL, 'active', 0);

INSERT INTO portal_client_profiles
       (id, tenant_id, client_id, preferred_name_enc, contact_email_enc, contact_phone_enc, contact_preferences_enc, profile_details_enc)
     VALUES ('profile-client-009', 'system', 'client-009', 'HUehRLoFRA7lyskT:4EKFed3XHAo0ucpZttbSGw==:vKo6Ag==', 'jrqoPHbCJZg3Q8mg:xhXSpq5Hk7be81rKFiORMw==:hnvdEj4Ef2se8uDT4nLJI8fBPkdjHp7xAn0=', '4nZXeWbciQL7UtA2:/CgxPU8OSbAthyD+8wPiug==:sPKPbdKm0vR37K83', 'umWVeVhfJcW+oVwg:eI7Z+aPv7QoEbGrH6ZGMMg==:fgZbxmarisGi73seaEaaIGbVCxxqDreMXv87gxyXjg==', 'r51FMaOO/QGbMmTI:QaNF0mPImXErpgtD4rQxgQ==:GCxfqTawomIDtNk8cw0t4Un8l4ol7b6fk4vbeLkKGTakuEYqzrPJWQCvFmSxVVSXNUnauTOqT+GIwMhUlVukNgSqdevkU1sA4E3mpQmTyWFAxjcXZL+86465Sq5H38A93g==');

INSERT INTO faith_church_referrals
       (id, tenant_id, client_id, church_name, contact_name, contact_method, status, consent_to_coordinate, notes)
     VALUES ('church-client-009', 'system', 'client-009', 'Living Water Fellowship', 'Pastor Daniel Hart', 'email', 'active', 1, 'Lucia approved collaboration with church support for practical care follow-up.');

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-009-scheduled', 'system', 'client-009', 'staff-counselor-mercy', '1+5VqEgZ5cFZ01/t:VKf3aDRNaIN/cQ5cB0ATBw==:D+riW+biPngIOU2IMg==', '04+kSFK9Rh0Bz+Xq:FwK9cOvwu8PKqCeP+gOagA==:xAmLz7FOqPW769Z1', 'intake_assessment', 'scheduled', '2026-03-18 16:00:00', '2026-03-18 16:50:00', '2026-03-18 16:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-009-completed', 'system', 'client-009', 'staff-counselor-mercy', 'CLpEEk1F25nVBrfc:QEPGk+NtRlBrQjRBL46ZFg==:EWcPM0Qq4KGRp92Csw==', 'jWjBh9sa33YF1Nj2:IZyOuXbijVeJYiN/MJCRxw==:mYo8m7d1PbP1LDBL', 'individual_therapy', 'completed', '2026-03-23 15:30:00', '2026-03-23 16:20:00', '2026-03-23 15:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-009-note', 'system', 'client-009', 'staff-counselor-mercy', '0eFrCRUnGf5dRGx7:DmJw4WL4Ya6s8CxUUca8zw==:pjbGTQDYIcJLZzrCCw==', '9da3rOXa8q3WLVZW:JdwTseWMsP+EOgSeh4johA==:ZbG5apQGlsz/k8H0', 'individual_therapy', 'completed', '2026-04-02 16:00:00', '2026-04-02 16:50:00', '2026-04-02 16:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 1);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-009-future-1', 'system', 'client-009', 'staff-counselor-mercy', 'k7vwGCNcB4GxiMCk:nkDTiYGh9lrd7j3LsY0q9A==:jrS7lsp7Y7P1onaSAQ==', '1NJgHcViORTvf0Vg:j5f+G0Y78W53Qm8kEzv2kQ==:Zs8k8yVEMIqxyc5K', 'individual_therapy', 'scheduled', '2026-04-13 12:00:00', '2026-04-13 12:50:00', '2026-04-13 12:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-009-future-2', 'system', 'client-009', 'staff-counselor-mercy', '6HauoPR6e6dqgAMk:nWRkehd9x0LZdep53QSUrg==:/3xUtHgnhCkmQVnRng==', 'mkl+jJx4Gak1U/YT:XfBeHcHQmT+6k8I0vWngMA==:wyqH392VbXeZ3CEH', 'individual_therapy', 'scheduled', '2026-04-30 13:30:00', '2026-04-30 14:20:00', '2026-04-30 13:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO progress_notes
       (id, tenant_id, client_id, appointment_id, note_type, summary_enc, interventions_enc, locked, signed_by, signed_at)
     VALUES ('note-client-009', 'system', 'client-009', 'appt-client-009-note', 'progress_note', 'Vw03NZpawGJby162:fEyA0oherUctZkVO/ZU5qw==:YhhHcE6UnOSci+GZ1s+Rbc/XKP4c8laENmr4u5wjOcFEgdW/cglw76qXB6jjQlN7FWcDSP9BydM0L7mpQGXx9lCjfZFvhP8bwO6qFgN+HfOYA+Ces6wQg4Ig3DhXL8GhaL0OpyUT8DlLkJEIdstR4AcXd39/g8dRkwTOzAfp0FzQalWvx68GduIhSFWMPiCD2NV5crkbdg5Ddud67sKwlLS6JXUZgYG+', 'vDvHwBsqkmD3Vgie:vnBAfCXHBH5WTcTQAj8P6A==:eHjyqxAocvY0lJtxaDf3ZCDBW/SKofq9bEJeXh5QigyOrZL4HOKeSr71I+GML213NckYIWiXpDdP0o7C2m9I6CHt+SaVfBUr4VIF7lI7gEVuu4NQ1iOwA+uW8lCovawrqb+55FE8fZZcKfvxvYRrW9aM382N4uxQIjb+xtA62LjIyDFNfYKifMmgrHZ5SA5JlQ==', 1, 'staff-counselor-mercy', '2026-04-02 17:00:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-009-ShortIntakeForm', 'system', 'client-009', 'ShortIntakeForm', 'Short Intake Form', 'account_signup', '2026-03-23 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-02 16:50:00', '2026-04-02 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-009-ShortIntakeForm', 'system', 'form-client-009-ShortIntakeForm', 'client-009', 'ShortIntakeForm', 'Short Intake Form', 1, 'client', 'w7QiPe31zUVA9cFg:Y4yP1dQCTp3FzTqtaDSSBA==:4ZFicNpHrFylG6xTuoZ1OpoVop5+v3MuqVfe8NdB2AN/LUJ3k1DV2z6WIyBA4fTT2A1DxQR6tGnLuK3y8Ar2BndLrId45DUeDeEaYZp5COKfP//U8N5gajG6bmW/LDsxicm7hLXwxJRceeKCuL6KvN+HA83arkmJB/HPPgqd9iG+U98VsyEXkhY1xjb2GqUYFukBu8c0zVi25MmlO0mw57fM5aB5u3U4Uh8jn5TEpkRJiYM3Sh6H0Diz1JjcLAJlHKYFHDSFAfoliN6haN2fsmtvYmGMG+1FIHfV6lPM6NjsYmr9bVnaHJu979Oosu0gjVF8VdFEORxKQX2zaHF420pYo3WnvAaZ4u/APNNDcRexY1u27OPe9tPvW/SM3bsUiXl6+I6Jq/IxqO+AVRYxW4QLMM98tfrKHqcJzEKkB/TE1TjcmqL6lkRZ9JkLmR2FPl737iMRVDRGM9AbT/l/Oco/r/dNx9Lo67UJiToDXeGa9rnrqgG6qSnB8JYNb7cv', NULL, NULL, NULL, '2026-04-02 16:50:00', '2026-04-02 16:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-009-InformedConsentForm', 'system', 'client-009', 'InformedConsentForm', 'Informed Consent Form', 'account_signup', '2026-03-23 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-02 16:50:00', '2026-04-02 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-009-InformedConsentForm', 'system', 'form-client-009-InformedConsentForm', 'client-009', 'InformedConsentForm', 'Informed Consent Form', 1, 'client', 'J3IeGjgzEHLkhyvI:DcHt5DND2n/1UelvTMdK+Q==:Zp87G+bZqGun5PsbjTyROuKbOcC8KPzfJXH24rJx986qQtUgV39D+2Cg2YTvqd9NDGrC0riVPR3BtyYSWymXh0nu1ajVfKgcWqoal0q6aY7NGw38KxaswDeHUdg0Rf/4e+FWGTGNz4GTw0gtck3ApVNJoxnH1orKb7LycdP0Ws67nR1gZwMo81D8SJx2OQovD5JAeUMrV7yffALBTwcqoJGCqGpamE9fGWcyK0yvMHBBC1H7wpek9B1uTrk6Qgddywl/WvxKChufg+yqxdY=', NULL, NULL, NULL, '2026-04-02 16:50:00', '2026-04-02 16:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-009-AnxietyAssessment', 'system', 'client-009', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 'account_signup', '2026-03-23 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-02 16:50:00', '2026-04-02 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-009-AnxietyAssessment', 'system', 'form-client-009-AnxietyAssessment', 'client-009', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 1, 'client', 'j2kANFhuClNdDInC:RnCHqYV0uQGpqqzU2g4l2Q==:zjcBXeh31MuuEBZL8udBBd2x+zmn6Ci+8Veu8uz+1Ju0OzLnbM9tVXdgP6UxASl159T5mkwa9d5nF/abBY2bpKqe5qWZOvsdLNeagftFmYpQUrBiAtCJfuzZeWVwLTHJVGKRuaagHH/6ZrRDJJZUtVsw8zdxqPuLIUi4K6FIWk25snskJLNyTR62d3es8xhsoryYCZqnKqYsg2j+zsKNG9C89WPTUEeFxNXGDMJ0Z2qMWhOqxY7BlwCPXKyqQQ==', 'Moderate anxiety', 11, 'Monitor weekly and reinforce grounding work.', '2026-04-02 16:50:00', '2026-04-02 16:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-009-PHQ9', 'system', 'client-009', 'PHQ9', 'PHQ-9 Depression Screener', 'account_signup', '2026-03-23 15:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-02 16:50:00', '2026-04-02 16:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-009-PHQ9', 'system', 'form-client-009-PHQ9', 'client-009', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', '36qLaup2g7bUocgJ:R0FaE/4uhcb8yD1LJt07ew==:Ro6Ka052IAn6zZv8mhT+U7SahPVoVAhBUu7PIxyNbhic/vNhuiMoQFXd6Me5qGAPK7W21XFDZN01LMJidJ/a/7NcuHwo0HU+Xwn/FhVPug97oIAh19OIYAhXqpQmZEFndmai8NtXOpbFaslKg0ZpnMjidmcU0Fz50RzqV9s3Xt4ibRpqMHbvCnbT24dYVvSYJI2r/AxlKW5ZORTvRFKWA0QJpjUgo5hjyBki9ICk+/NC4HCBre8XnQ==', 'Mild depression', 8, 'Continue behavioral activation and sleep supports.', '2026-04-02 16:50:00', '2026-04-02 16:50:00');

INSERT INTO clients
       (id, tenant_id, first_name_enc, last_name_enc, status, faith_background, high_touchpoint, primary_counselor_id)
     VALUES ('client-010', 'system', 'iqewBMrPF0GIrZE6:DyimzHoKcP98GTCe51Axrg==:mtt0Fb0=', 'TGmt/bEhKSfOLPRn:21/Rbny1BLqc6+v5mpEdbQ==:ShXRZ28A', 'active', 'Evangelical', 0, 'staff-counselor-mercy');

INSERT INTO client_lifecycles
       (id, client_id, tenant_id, case_status, referral_source, emergency_contact_enc, discharge_record)
     VALUES ('life-client-010', 'client-010', 'system', 'active', 'Marriage ministry referral', 'lEInTvM/D/HxxsTh:40cPYEPkpAZEoeLNNuWZOw==:fZZAM79h8V/3Sqm2T1zpiAHQnx5E/DfbAaBZ9BT33tefEZUTgcSTUcp3Grk9e9jBHqEqq1JT+ms/EK/CsGVVjsWwNSqt242Jl/M=', '{\"readiness\":\"stable\",\"demoDataset\":true}');

INSERT INTO client_addresses
       (id, tenant_id, client_id, addr_type, line1_enc, line2_enc, city_enc, state, postal_enc, country, is_preferred)
     VALUES ('addr-client-010', 'system', 'client-010', 'primary', '0FymI04zmwXJGW9p:1NRWVPHgSTyzJOnTy4vXeA==:tJJxWnq9O4a6VJ7V2YhRP8w=', NULL, '7B6nSxp84sdkICqZ:35bRbC2Y13j6AvNTE7uW/Q==:nzn0kEDUNnw=', 'FL', '6v+kbH87FhfAf1MU:eCequLGUD7t+dlcZk0JRHA==:Gd9PvOo=', 'US', 1);

INSERT INTO client_phones
       (id, tenant_id, client_id, phone_type, number_enc, extension, is_preferred, ok_to_text, ok_to_leave_msg)
     VALUES ('phone-client-010', 'system', 'client-010', 'cell', '9zdlD4Re3v+hkEQh:CM0G8V9dSUzhteXYi/gk5A==:TwYicFzb8alHqK63', NULL, 1, 1, 1);

INSERT INTO client_contacts
       (id, tenant_id, client_id, contact_type, name_enc, relationship, phone_enc, email_enc, is_primary, has_legal_auth, notes_enc)
     VALUES ('contact-client-010', 'system', 'client-010', 'emergency', '9GPpMEZAIaEhcdxe:j4QnmtXtLx/4mdiJrtX1Vg==:UJuPDo0vmji8vGi5BJc3OA==', 'spouse', 'I/62SMxsSdtSKfDj:Pc9wNVtXmIrWeMYGEqaN2Q==:DLJqEBVtifUR/bnO', 'LRe/4JYhWLOW4J2r:vMKqCjJvRbAO35ycJq8YZQ==:DJFGow06ywlKJMQGbrnpvJRk6T4JHuaMahQ=', 1, 0, 'xKcqLjtjTn3+Dbl/:mlwImm/1J7bJDIL9wtCA7w==:e2jPqtjHjAihPZ1PXtuhpyzpnpsvKUfQq3lSqCmVzl8XlI4TAeU1H5oRHzr2C/xN');

INSERT INTO client_insurance
       (id, tenant_id, client_id, coverage_order, carrier_name_enc, plan_name, member_id_enc, group_number_enc,
        subscriber_name_enc, subscriber_dob_enc, subscriber_rel, auth_number_enc, auth_visits_approved, auth_expires_on,
        referral_number_enc, copay_cents, effective_from, effective_to, is_active, verified_on, verified_by)
     VALUES ('ins-client-010', 'system', 'client-010', 'primary', 'n9LzlxSkZjGz4Hy9:RFlXQXQuy6AvoMqmmWji1g==:1dNM1YZ2DQg06aDl', 'BlueOptions Silver', 'nPb+5C6X11wXMV34:NA6mZii2LtSz3MqBpwIP4w==:ysN+BLJU0HypG5+DXY+rNx4=', 'bBlnO+nxeI6Ey0QV:WCJZ/E40p+seFBfWQpu3Rg==:Al+qnfXIpQENz7iIfj3wkQ==', 'jpDdfRYvOogBV/sN:KPYZa4MRDBZMNasb2DBlUA==:ZvSySACrxP6vtLLT', 'mb/NAmbtLKyfGu4H:4qfYDauB58p3wIih7FOzrA==:Wk9aYP+UM9z1yw==', 'self', 'lTPijfYY/ZxOXT33:63VNJyWBvv+GtgOO4h5Cbg==:30SkHyt3aap4sOOBvrc7', 12, '2026-12-31', 'zxAquIHbiLD1hDn5:UDyH9p/2xdp4tgp0RW1jSw==:gyamGXBOkKki2e46DN0=', 2500, '2026-01-01', '2026-12-31', 1, '2026-03-16', 'demo-finalizer');

INSERT INTO client_referring_providers
       (id, tenant_id, client_id, provider_name_enc, practice_name, npi, phone_enc, fax_enc, address_enc, referral_date, referral_notes_enc)
     VALUES ('refprov-client-010', 'system', 'client-010', 'AkdHvOTLRZXvgCM+:VSmZc6lbecCxEyvzq++14Q==:k7j/RTr5W0uutqdxVgA=', 'Grace Family Medicine', 'NPI0000000', '5e0sEUutJ97S2rE3:wtPXFcN490y0KppQmRZz1Q==:fmk6TTDn9Yx/HXAP', 'YtE98J9BOMRjY4oq:pK1qen4QnT61t5D3KPHfIg==:ztvs0Q9DZLBRfh5C', 'k+//My0A/DCawG0h:K/6MWcARlVNoTVtfVI46vw==:TZ7nIFPt534oCOHtCFV8IypXCs9TsMioCMvoQjrjTGl/KarlhuiIN4wzYvc+VrZ7q801UhLj09RTXjwq0D58KbyBLmdL8MhQulGBnnrFJ4Yf3EopIKJ8IW/STaQ=', '2026-03-16', 'Dc1WNV7uJjwaPkkd:a2DF7ydq262XMoEKlSuMLQ==:lsm3+bia4Q/dJevHlUvJxvhM/VxvRoeWr/SJ3HLVzM5WQ/XJvuhzy3TrYWkol3dsrAMCF7i2zh6Oe4xsu2sBMw==');

INSERT INTO client_diagnoses
       (id, tenant_id, client_id, code_system, code, description_enc, onset_date, status, is_primary, notes_enc, diagnosed_by)
     VALUES ('diag-client-010', 'system', 'client-010', 'DSM-5', 'F41.8', 'D3WsW20kEz/IUpuO:YTzZpaKzeENeCe/VItvuwQ==:obZX/ObJqjH1HeQh4JkkX9cM55c5Q6VTaDLpSyRJWCBEdH2EGQ==', '2026-03-16', 'active', 1, 'EPG2Nb7gZaLg0eBb:g9Tazgaz7f1MmU9HW1dFLA==:Pdoa0WDg4f/EUHq8ImE+S5X5+Y+T7XfEpn2BFHFMBFKvJPtP1w09+1uAHc9dHZ8fN8LLhsyk', 'staff-counselor-mercy');

INSERT INTO client_medications
       (id, tenant_id, client_id, med_name_enc, dose_enc, frequency_enc, route, prescriber_enc, start_date, end_date, is_active, reason_enc, notes_enc)
     VALUES ('med-client-010', 'system', 'client-010', 'n8W98VlN2amq9+J0:8D+s91ILPtA9PYdZNuI0fQ==:mQvIiFceMXJlGQ==', 'JiPcGWS2dIfsVDiT:U3aNuvkFokMo773RtJUYfw==:I+bCHlw=', 'GEcEVpckXcnZoq8T:HIHlKTOtrVhNVbKV6V722A==:isHDHxs=', 'oral', '9f/+TR6ODPIAoFoF:7+rtefEypY4w1ThoSlvXAA==:5dqkO/pF0rIfHQe8VHc=', '2026-03-16', NULL, 1, 'ce6d1moyqYJrz8vt:UvbU1DqGUwaXR6hXFVDs9w==:nehePcMNyI5VoJjxLU0W', 'Cz2zUY6eLtD8hJig:Ku84t9tYMYIAvvXdb+B0wA==:gNOS+VRz/fJBu2jf5rIdpKlSSyySh1F4M5E/GMfXyctR2/gOQFYIt97RtGbEHCAqqj8=');

INSERT INTO client_allergies
       (id, tenant_id, client_id, substance_enc, reaction_enc, severity, allergy_type, onset_date, is_active)
     VALUES ('allergy-client-010', 'system', 'client-010', 'jGb0Wu3kWuBK+Y/I:4NyIOvanbzbHj3j7joFavQ==:Sk8PIW8FTg==', 'CztsqAXDwpAFW/Em:NGs9OcppOCfljPivd+lQ1g==:ss8D8Y4dDScOcCsuxDLA5dRT', 'moderate', 'drug', '2026-03-16', 1);

INSERT INTO client_clinical_history
       (id, tenant_id, client_id, past_hospitalizations, hospitalizations_enc, past_surgeries, surgeries_enc,
        chronic_conditions_enc, pcp_name_enc, pcp_practice_enc, pcp_phone_enc, preferred_pharmacy_enc,
        substance_use_screen_enc, mh_prior_treatment, mh_prior_treatment_enc, mh_prior_hospitalizations,
        mh_hospitalizations_enc, mh_prior_diagnoses_enc, si_current, si_history, si_plan, si_means_access,
        si_intent, hi_current, hi_history, self_harm_history, risk_notes_enc, last_risk_assessment_at, risk_assessed_by)
     VALUES ('hist-client-010', 'system', 'client-010', 0, NULL, 0, NULL, 'h4uiGUDcfF4LpqOB:EcypS+2YMhjZLDoFgH+1Eg==:kTpyqHhVS/zbxH2brvVrJn0HyTHO73S7995xnjbSN064eZ9mK545+Fkt', 'nyJemJGi86C/F2ID:bdbQVKV0VdPGLyRDNqANwA==:CmdyS/Q0sMf8uf7vo8A=', '5fY0XC0pWCv1Go7Z:JZAYsS6BVqc1qoCIn1c9ng==:jxozBsw8CJy8oH8cGP0cDvb/qSr/', 'TNgZcvCuukd+JKcI:7Owm0xfrNeZbebFVjV8t1g==:qDxxCqQiljSIf4pO', 'o7d+FdnTDcwwGEtr:hxMYsSNuWK+sliaNvtmdhA==:EuNx/Um3/1wgfaKJJXjT30M5nq2CPJggBbNRBo+ymC7kfcni3NY1MmpEpq4FLFjGpSRM', 'piuqWMsujLeSdlSy:SlX7wfcQQxfAFARv9jrZvw==:e8Cb7w735EX8YA+6PjXmCzH+tQJTRf3prWOdtop2mRO+Uuq9pQw4bGp/wlNd2Xt68QBGcY8k2cHRbdVg0nw=', 1, 'jk4urzM2QgSUCn2o:hA6TNSDNcgB3daGDuCrn+Q==:zT8imFfAbXPdvcwFT2jZPUOdBJgvRIGb6085FnYTa0z6brzHHMocADISEQCq9Q==', 0, NULL, 'hofDYjmxEEcrzLOL:sRzykkSGbku0Yut+P0yQcg==:WC5G9mdBhFnJzOI0Q6OXB4sZsu5J5MD+pMonSlJhI96OEEU+iA==', 0, 0, 0, 0, 0, 0, 0, 0, 'OUmwB0ZQd6J00YIf:02htdwtUa+4e5mpuuGLLaQ==:zLwbllBXj837VI8e6YZl5siSDtHrRd0NAKz9k/T1aA+o1GN6m0VWhWKnIz3upNMYui2NV9k8AmxdOPrTt5zq52a0sNx+HiVFjrjdDLcbZUTQnyvaU4i9DA==', '2026-04-03 17:50:00', 'staff-counselor-mercy');

INSERT INTO client_faith_profiles
       (id, tenant_id, client_id, denomination, church_name_enc, pastor_name_enc, spiritual_director_enc,
        faith_integration_level, spiritual_concerns_enc, religious_restrictions_enc, faith_strengths_enc)
     VALUES ('cfaith-client-010', 'system', 'client-010', 'Evangelical', '2WvRWECnD3qosAnK:U6wx35D9x9+I0D0ZFtlJMQ==:y9ul5LN6hhrve33PA8TN+8lK1A==', 'lHRNLV0Jzgqvi0C4:Eid5xlMhki5EXlbYkMAztA==:cFN0o162nozR5d5NpmIVha2g', 'stLH+uVh7djyzkOb:yzKntw7oVpOQUI72AbX36g==:3DDfaNsW/ppf9dKThQ==', 'actively_integrated', '5rdJHOVQwzMTTl8Y:+QvONsdZTN3ftGJye7bKuA==:ASd15lDnP7VbxlOTZ62gH9NZcdxNy1826XIT5ts/YPGQqCDIz2LvOoFJqvO7vx/kZE6yHDb4CFD8TbqR1jeP', 'sS34Ro7rxhA8dg6e:0JPUqSN8PuVFVuXJcPhCyw==:TUs7LEy56278GE0jYA==', 'w2TKme3ieNfuLRgs:EVrUrWUSulVUfccnOg8utA==:tcslGth+AuKXQSx2qmvqT4FWk68+yu9Tg7BUZmDluENlCRu+iIryUPAZLivKwzGMEeINdHnjnAxHahEbUygUYrLz6/dq5rAR');

INSERT INTO client_legal
       (id, tenant_id, client_id, guardian_name_enc, guardian_relationship, guardian_phone_enc, guardian_email_enc, guardian_address_enc,
        court_ordered, court_case_number_enc, court_contact_enc, court_order_expires, custody_notes_enc)
     VALUES ('legal-client-010', 'system', 'client-010', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL);

INSERT INTO consent_records
       (id, tenant_id, client_id, consent_type, signature_state, version, effective_from, effective_to, signed_at)
     VALUES ('consent-client-010', 'system', 'client-010', 'informed_consent', 'signed', 'v1', '2026-03-24 17:20:00', '2026-04-03 17:50:00', '2026-03-24 17:20:00');

INSERT INTO intake_packets
       (id, tenant_id, client_id, status, assigned_forms, submitted_at)
     VALUES ('intake-client-010', 'system', 'client-010', 'completed', '[\"ShortIntakeForm\",\"InformedConsentForm\",\"AnxietyAssessment\",\"PHQ9\"]', '2026-04-03 17:50:00');

INSERT INTO treatment_plans
       (id, tenant_id, client_id, status, goals_enc, interventions_enc, review_cadence, reviewed_at)
     VALUES ('plan-client-010', 'system', 'client-010', 'active', 'luRdtoQmP8tqGyMH:I6MRyMKCGy6EAQ0T1+D5Ag==:pDrnjp/rawhZrT1rLeMUx0BlN6eLKuv/ZqQMsp3eaON0rtQVJRD21Y39sX+up34+V6TBreYg3jeV+rXg7IBM/QOPgR/r2nO8L1VBN4HcnQHfh5EBYFYrF4LxZzZetgmwZLt9I+GpSKFhGqrwUe7WqoBK0YTyT/2qu3h6BMxA/hzUX9N2M30xJDtvto/E9DRXhIri2I1tNuiX3jPlpG0OUJlLzd99n+rxURWof2K8jVFGwOTptz4bV/n89iWdFIEsW5bn4pn6Z06aMfl9WNOaUPAYow2Th8/qdwTw01mFgIS76t9COY7oujqklCijilRDulEgoZse7w==', 'g9ipNNOgGxByqtdN:gz3yO+jx7meia/bHGRrlsw==:Xf6e7xLvp7I2xFxtwCPGLmTU2xMnBOFcjl4Y3XHrU7Pb8aETidXk4LNtFHiT7GjTHmiTI00xCH/Z2sWedwylLFnp28THFQBLPYxTQRxdhDwGTWAjX4EHZGbbVoLB8m31bicRFG2K4oYCaxjCeW6uthqZrDVRSH0s', 'monthly', '2026-03-17 00:00:00');

INSERT INTO portal_accounts
       (id, tenant_id, client_id, email_enc, email_lookup_hash, password_hash, failed_attempts, locked_until, status, mfa_enabled)
     VALUES ('portal-client-010', 'system', 'client-010', '4PNbxV+rN64sTcQK:phja/jIHORwb9ItuLtQU7g==:Y7u2NnlVPhSfV13u+WpaSqMh9YtFDBIelQ==', 'c7c688d880900031a009f2cd1f86c8eb5a1f8eef81587ca492c12e66dd044343', '$argon2id$v=19$m=65536,t=3,p=1$RIMtuIoYp95Ji77HbqJxxQ$gFx4zOuAa+uWbiRWuAGL2BRmHIw1Z+suw16YbdduAsc', 0, NULL, 'active', 0);

INSERT INTO portal_client_profiles
       (id, tenant_id, client_id, preferred_name_enc, contact_email_enc, contact_phone_enc, contact_preferences_enc, profile_details_enc)
     VALUES ('profile-client-010', 'system', 'client-010', 'if6KE3yGdJdwR1yW:ujwsFEA5Fo9iIpif3oXMPQ==:wViT+ZU=', '8llywaCT5x7itj1J:FxrrxX1bwYPxUEoHOqgLvg==:20NF+velCKx768bItlqUPrKOK7YSkfyKZg==', 'pt6zygICmcTnwi4l:AqoPp74oSRKnKkf0HrGxEA==:Yeg1I2pXS9Mczbtb', 'xVW2Pqx1OmxnSN6w:basx6iQXcDLEYPrSRgxmsw==:ATADDUkqm5HQOIwzW5i/HW/Gou90HdDtGFD73TDz2A==', 'QjXmHFGmHtILHbu2:QB4hmuHXgVnmFg/fbq72aw==:maKHGLTJmMQVviRcQyDtJvDgJDUXQNeLe9+VKW23C8em3LUnTkjChW/Ta9EKlEF83kS+R255IPPcwRtu4+SwwOij3RYtAHpClatoLyVRkt6Ea+hoJc+RDZgmUIGJJ35zwA==');

INSERT INTO faith_church_referrals
       (id, tenant_id, client_id, church_name, contact_name, contact_method, status, consent_to_coordinate, notes)
     VALUES ('church-client-010', 'system', 'client-010', 'Grace Harbor Church', 'Pastor Daniel Hart', 'email', 'active', 1, 'Isaac approved collaboration with church support for practical care follow-up.');

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-010-scheduled', 'system', 'client-010', 'staff-counselor-mercy', 'WRX4JEWXrExuYjdo:1uDy9hdkHkjZSp1pqoXtnQ==:eOMycEIuw7wOq422', 'xAWir5nUBi7lgbiM:a/g4lvvilQ40/HravZjTEA==:mduTxa7f81oALLGx', 'individual_therapy', 'scheduled', '2026-03-16 14:00:00', '2026-03-16 14:50:00', '2026-03-16 14:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-010-completed', 'system', 'client-010', 'staff-counselor-mercy', 'g+P6tXQB1767tnA0:7PUNbJgRvNkEusHSLhQetw==:ONwZHnplxbB+5zbJ', 'BOX8npVXIxzkDpcN:mr7hddCbGuZbiUcIgYvxJw==:Xl/NC70fcXjF0jrs', 'individual_therapy', 'completed', '2026-03-24 16:30:00', '2026-03-24 17:20:00', '2026-03-24 16:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-010-note', 'system', 'client-010', 'staff-counselor-mercy', 'H3HVYniv/6/vwdw0:s8xxNwES/tXgpPBVK77kGg==:MRncE9yPbxW7vdqK', 'ZzVWC53OcFLDjdYO:DpGDUmayC1wv30CTv0p6zQ==:BXEsRyMWvxPFxhDl', 'individual_therapy', 'completed', '2026-04-03 17:00:00', '2026-04-03 17:50:00', '2026-04-03 17:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 1);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-010-future-1', 'system', 'client-010', 'staff-counselor-mercy', 'WTO/K0ighISywhTn:GWAcxuPndO/Dv2+IKYrvEA==:+H3oVsvnraDo/vCo', 'AnEpkK3mXCIOzGDY:X2xr6mHnP4euldIzSzdF7g==:f+Ho0PwxrZnK1mzP', 'individual_therapy', 'scheduled', '2026-04-14 10:00:00', '2026-04-14 10:50:00', '2026-04-14 10:00:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO appointments
         (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc, appointment_type, status, starts_at, ends_at,
          scheduled_at, duration_minutes, location_id, location_name, timezone, remote_session)
       VALUES ('appt-client-010-future-2', 'system', 'client-010', 'staff-counselor-mercy', 'PxXAXc5CsZWaottc:uUoK2muRLFbRn6Np/+265w==:tc5iSd001Etg8gPZ', 'ffsZFpk1qlCPNKsx:FX6MdYRRe2Jy19aUWScWwA==:5PmXrzPCe88R6Eto', 'family_therapy', 'scheduled', '2026-05-01 14:30:00', '2026-05-01 15:20:00', '2026-05-01 14:30:00', 50, 'loc-main-office', 'Main Office', 'America/New_York', 0);

INSERT INTO progress_notes
       (id, tenant_id, client_id, appointment_id, note_type, summary_enc, interventions_enc, locked, signed_by, signed_at)
     VALUES ('note-client-010', 'system', 'client-010', 'appt-client-010-note', 'progress_note', 'vfE7hVvPeG4XMWcP:iXN9g4a+eKd6JacwP+cxog==:TaBkJSyJZWhhOzrnl/y6svKJoTT3TscDI4t2Szz3ihutPVku2i3dm5VEEZqNhGycBbHL5oc+waYLCuCkNHtMYbk015DjfxnrhJsn5YUAjzcMwKe/ntmokuqM5gZsUVXQNEiJI6wxgpDwrH9DCHdGfiI/yN5mLeqMNRwq1oFZb1zCR6icFkwJbUEW', 'CGuujv8xrDFGH6Ai:WMFoSfxwHto+n9YABBaYfQ==:yFqRSNG6K32RHpUsopyBKoJ0zsxSoE7bcIlAxaoberZCfTleZRcejk9OmvsQt/7oXsLIzyJIkIN80ZI28+VjCNMtAt6dWE40gHxFd4ZjjnO1MIvlPMnteG+3s+FSpOVBwFRZHZ9s54h7HRDzZr25aw7Q4kr7nqAQd4JczjjfRLkijHWDbhnsR2GmWy52l5J8Zl7V1t6Msmkxu1dTcwNaRuGkdLNNs/BwWengoQ4TcjKMilVJya4Ud1c=', 1, 'staff-counselor-mercy', '2026-04-03 18:00:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-010-ShortIntakeForm', 'system', 'client-010', 'ShortIntakeForm', 'Short Intake Form', 'account_signup', '2026-03-24 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-03 17:50:00', '2026-04-03 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-010-ShortIntakeForm', 'system', 'form-client-010-ShortIntakeForm', 'client-010', 'ShortIntakeForm', 'Short Intake Form', 1, 'client', 'ApyFHcOgsKTsAGxo:QRihwj+76KcWVpfDzSn7Iw==:M8DAIEGioS9hdUeHxt39wdcUB4V4VHn0nVw9YTDkDW+fZe4hZadTGK0v13HzSm6jIjIDjjS3MUYGsg7aHbfZrFZLxULieVfOOojlgLQytpCRDq0kvymiISw/5/l0vr1pZgSpFrCs7FVmRLWblA5nwX0/d+6nnAlugsepMe8ZPSJnddgeIICHCsLOiVgoYjgkR0NLv+m2dZQ7I0537JyZteLb59ZLJiWpd9ktvaR9qpnRDFX6NRRoL2/tjfaBUNvWI/eW4Pn/JqI3OmFl63QUxDPTZxnsQTwrxKWaGuX4cVL/Jnw8p7vGFPUYrIMfRQaIwgLsHO7mJo+I5C7ZY1M4U91RqRcjGTxlfEn52hZpyTu5O0rrPicYkGdJIrpZ1eahS4lQ650v5m7ve0aVXqk6wrUlHUS6s/CXqn88CPTdzsGvl9qQs1xc280vJrfYcdYDGxnrQ4Yolq/C9wwVK+LM+ZF2upG3/IhOliTZHj6IINhhYxdxQGYIU/NKfLs=', NULL, NULL, NULL, '2026-04-03 17:50:00', '2026-04-03 17:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-010-InformedConsentForm', 'system', 'client-010', 'InformedConsentForm', 'Informed Consent Form', 'account_signup', '2026-03-24 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-03 17:50:00', '2026-04-03 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-010-InformedConsentForm', 'system', 'form-client-010-InformedConsentForm', 'client-010', 'InformedConsentForm', 'Informed Consent Form', 1, 'client', 'x6MvJsyT/fAEmmdL:iPGkEElD2TnuHiE50z3wLQ==:MqD86svAmU/owL32ZkhO7iZnDzidV4P0Gk540mehqtdPoOpXlHFLtvEUM/ARZNzVjac1bMOpqm6htIFCJmCkPvAoSQEpO6yLgKvJ0KosRtT2cn9W147hrBmUblsW69FcCufuJGaUjTGmEZHMP/Ps05Hvv9zYa2CPiNfg2Tmy8pznjP1keBFON8jxTmcyb+Qib06NG2lnAEjOBUGj6MOtFC0el0A6yTv7ADiCEzmVVUY5QaQqkcx8k1cQiw4/tzHPlg7bb21uyI4D3jZgUw==', NULL, NULL, NULL, '2026-04-03 17:50:00', '2026-04-03 17:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-010-AnxietyAssessment', 'system', 'client-010', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 'account_signup', '2026-03-24 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-03 17:50:00', '2026-04-03 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-010-AnxietyAssessment', 'system', 'form-client-010-AnxietyAssessment', 'client-010', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 1, 'client', 'IAGQHjQc9J+YcLzP:R9ZkblZwFEWUVdPRPlKxQg==:8Bxn0AJ3vqr5kYiYDedlqjqZ23qlVa3GUTE5MNr7UrDHMxRoS9rcXfDMgRv2tyCJ78K/Abp3RjiOzWKvbzXeiMuiP/IferoHEe9uVacn7+Xk7snP0XY6/LarXDZASQceJqu7hbrd7xRRoXXmfbc168LeFvhbnxDdigIEvSnS7OqvidL2lnZHKHu+jHt119CewYpurl0TB7OH00vvfH79qMOtlbq1xJRjB6GQL7eGhEQt9lJm4PBzpwBvMHvnSQ==', 'Moderate anxiety', 11, 'Monitor weekly and reinforce grounding work.', '2026-04-03 17:50:00', '2026-04-03 17:50:00');

INSERT INTO form_assignments
         (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at, completed_at)
       VALUES ('form-client-010-PHQ9', 'system', 'client-010', 'PHQ9', 'PHQ-9 Depression Screener', 'account_signup', '2026-03-24 16:30:00', NULL, 'completed', 'acct-001', 'Automatically attached by the demo dataset finalizer.', '2026-04-03 17:50:00', '2026-04-03 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-010-PHQ9', 'system', 'form-client-010-PHQ9', 'client-010', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', 'Wsken9KNOQtRSqiV:F9oIw8z5WgQfIIPnjEb7Qg==:aR29e/ODHQ/6n5rmnOG27JPclnnc35jyJ4mTRiNdAEbDsYpB23wMSV/xJCJmC5OtZMlRar89wy6HnpIQJEIfcca43bLpXWqOO0tkJEziJxaVIwtJUH0co/a3Ela3BB0uE/Xmv8wZoHBuYfQ1iQMELqhuuEGgY7UUchQsrgG7ywIK8Dg/OAGHhwE8g/ljummJLQAtUdQpY8JyR277eSCM2ldberFsWPPXsoA45baYfJsjBHiVw854KA==', 'Mild depression', 8, 'Continue behavioral activation and sleep supports.', '2026-04-03 17:50:00', '2026-04-03 17:50:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-010-PHQ9-history-0', 'system', NULL, 'client-010', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', '3gxfkiDyS/wd5vOZ:xdEqZ4DNbcFSeujBC7g+uA==:fhrDIg8X9qrOntRSXaaRHAmud/fgKDO4MciUYKhLoLwwUaRAxmz8yqCv2AV0roT+fqxGvBCbi1cwIGUZdZOCAaHKfhqsitpS66EXbLyd78JqKI0ZHQ==', 'Mild depression', 7, 'Stable — continue current plan.', '2026-01-06 00:00:00', '2026-01-06 00:00:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-010-PHQ9-history-1', 'system', NULL, 'client-010', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', 'bwmi8FkqrAITVUI5:jKClYjpH8GTXd6dauQS5Zg==:6nSk2RJklL4wfUnHKmgiOEHtlpUWH98jGEjY4tf8BN6o+4pJl3CaDBThrX6CD7SgmmS123aTmdKfMfggNoPSV7DeaD1IfC/7oV+jcPjf1s7MwdsNjQ==', 'Mild depression', 6, 'Stable — continue current plan.', '2026-02-20 00:00:00', '2026-02-20 00:00:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-010-PHQ9-history-2', 'system', NULL, 'client-010', 'PHQ9', 'PHQ-9 Depression Screener', 1, 'client', 'rUDe1fFkXhO0JNB7:Dq9WY5WBBmVkY2qBRuXLkA==:POFEz57PBh8vM+CfZT0ornv5B8teOqYIXlZ/OKSSWa1hSC908BfR+GIiHUVVXV8XOc2EqvcaSsN5NBd7PaIotuO2n2a9kk+g/fb1IQZaF2Kx0ULWQQ==', 'Minimal depression', 5, 'Continued stability.', '2026-03-22 00:00:00', '2026-03-22 00:00:00');

INSERT INTO form_submissions
         (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc,
          score_label, score_value, interpretation_label, submitted_at, created_at)
       VALUES ('sub-client-010-AnxietyAssessment-history-3', 'system', NULL, 'client-010', 'AnxietyAssessment', 'GAD-7 Anxiety Assessment', 1, 'client', 'kdvXUDCZ3/FG56nR:vppJHQYoiKYTV6nsCDX14w==:OGwejZBrGwYYsMHg3Jx48gJJAz0t2GEOKTFiUoo8FZC6cajgLXNF04r1T6YFM0BcNl3KtCzgSwkL', 'Mild anxiety', 7, 'Stable — monitor.', '2026-03-22 00:00:00', '2026-03-22 00:00:00');

DELETE FROM sessions WHERE tenant_id = 'system';

DELETE FROM portal_sessions WHERE tenant_id = 'system';

DELETE FROM portal_password_resets WHERE tenant_id = 'system';
