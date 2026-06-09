# Bugfix Requirements Document

## Introduction

The login endpoint (`POST /api/auth/login`) does not validate the role tab selected by the user (HR Personnel, Manager, or Employee) against the user's actual role stored in the database. As a result, a user can select any role tab, enter credentials belonging to a different role, and still receive a valid session token. This is a server-side authentication bypass that violates role-based access control. The fix must be applied in the backend login route so that the submitted role is verified against the database before a token is issued.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user submits a login request with a `selectedRole` of `"employee"` but the credentials belong to an account with role `"hr"` THEN the system issues a valid JWT token and grants access without any role mismatch check.

1.2 WHEN a user submits a login request with a `selectedRole` of `"manager"` but the credentials belong to an account with role `"employee"` THEN the system issues a valid JWT token and grants access without any role mismatch check.

1.3 WHEN a user submits a login request with a `selectedRole` of `"hr"` but the credentials belong to an account with role `"manager"` THEN the system issues a valid JWT token and grants access without any role mismatch check.

1.4 WHEN the `selectedRole` field is omitted entirely from the login request body THEN the system issues a valid JWT token without enforcing any role tab selection.

### Expected Behavior (Correct)

2.1 WHEN a user submits a login request with a `selectedRole` that does not match the `role` stored in the database for that user THEN the system SHALL reject the request with HTTP 401 and the error message `"Invalid credentials for the selected role. Please select the correct role and try again."` without issuing a token.

2.2 WHEN a user submits a login request with a `selectedRole` of `"employee"` and the credentials belong to an account with role `"hr"` THEN the system SHALL deny login and return the role mismatch error message.

2.3 WHEN a user submits a login request with a `selectedRole` of `"manager"` and the credentials belong to an account with role `"employee"` THEN the system SHALL deny login and return the role mismatch error message.

2.4 WHEN a user submits a login request with a `selectedRole` of `"hr"` and the credentials belong to an account with role `"manager"` THEN the system SHALL deny login and return the role mismatch error message.

2.5 WHEN the `selectedRole` field is missing or empty in the login request body THEN the system SHALL reject the request with HTTP 400 and an appropriate validation error before performing any credential check.

2.6 WHEN the role validation check is performed THEN the system SHALL perform it server-side within the backend authentication route after the password is verified, before issuing a JWT token or session.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user submits a login request with a `selectedRole` that exactly matches their role in the database AND the password is correct THEN the system SHALL CONTINUE TO issue a valid JWT token and return the user profile as before.

3.2 WHEN a user submits a login request with correct credentials and matching role but the account is deactivated THEN the system SHALL CONTINUE TO reject login with the existing deactivation error message.

3.3 WHEN a user submits a login request with an incorrect password regardless of the selected role THEN the system SHALL CONTINUE TO increment the failed login attempt counter and apply brute-force lockout logic as before.

3.4 WHEN an account is temporarily locked due to too many failed attempts THEN the system SHALL CONTINUE TO return the lockout error before performing any password or role check.

3.5 WHEN a user with role `"employee"` selects the `"employee"` tab and provides correct credentials THEN the system SHALL CONTINUE TO return a token with the `employee` role claim.

3.6 WHEN a user with role `"manager"` selects the `"manager"` tab and provides correct credentials THEN the system SHALL CONTINUE TO return a token with the `manager` role claim.

3.7 WHEN a user with role `"hr"` selects the `"hr"` tab and provides correct credentials THEN the system SHALL CONTINUE TO return a token with the `hr` role claim.

---

## Bug Condition Pseudocode

**Bug Condition Function** — identifies login requests that trigger the role mismatch bug:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type LoginRequest { email, password, selectedRole }
  OUTPUT: boolean

  user ← lookupUserByEmail(X.email)
  IF user EXISTS AND passwordMatches(X.password, user.password_hash) THEN
    RETURN X.selectedRole ≠ user.role
  END IF
  RETURN false
END FUNCTION
```

**Property: Fix Checking** — correct behavior for all buggy inputs:

```pascal
// Property: Fix Checking — Role Mismatch Rejection
FOR ALL X WHERE isBugCondition(X) DO
  result ← login'(X)
  ASSERT result.status = 401
  ASSERT result.body.error = "Invalid credentials for the selected role. Please select the correct role and try again."
  ASSERT no_token_issued(result)
END FOR
```

**Property: Preservation Checking** — non-buggy inputs must behave identically before and after the fix:

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT login(X) = login'(X)
END FOR
```
