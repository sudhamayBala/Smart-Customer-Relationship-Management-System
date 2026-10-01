# Auth server

## One-time super-admin bootstrap

Super-admins cannot register through the public signup page. For a fresh local or controlled deployment, run the bootstrap once from this directory. It fails if any `SUPER_ADMIN` already exists and creates an internal platform tenant that is excluded from customer tenant counts.

PowerShell example:

```powershell
$env:BOOTSTRAP_SUPER_ADMIN_NAME = "Platform Operator"
$env:BOOTSTRAP_SUPER_ADMIN_EMAIL = "platform-admin@example.com"
$securePassword = Read-Host "Choose a strong super-admin password" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $env:BOOTSTRAP_SUPER_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  npm run bootstrap:super-admin
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  Remove-Item Env:BOOTSTRAP_SUPER_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  $securePassword.Dispose()
}
Remove-Item Env:BOOTSTRAP_SUPER_ADMIN_NAME, Env:BOOTSTRAP_SUPER_ADMIN_EMAIL -ErrorAction SilentlyContinue
```

Use a unique email and a 16-100 character password containing uppercase, lowercase, numeric, and symbol characters. The command creates the account, hashes the password, records the bootstrap event, and does not print the password. Afterward, open `http://localhost:9430/login`; a `SUPER_ADMIN` is sent to `/super-admin/tenants` after sign-in.