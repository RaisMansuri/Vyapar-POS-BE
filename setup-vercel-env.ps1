# setup-vercel-env.ps1
# This script sets up Vercel environment variables from your local .env file.
# Run this in your local terminal.

$envVars = @{
    "SUPABASE_URL" = "https://ygkxcbwsyvowvdrasmmx.supabase.co"
    "SUPABASE_KEY" = "your_supabase_anon_key"
    "POSTGRES_URL" = "postgresql://postgres.ygkxcbwsyvowvdrasmmx:XprjyW74VYRrwmGZ@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
    "JWT_SECRET" = "VyaparPOS_2026_JWT_7f9a2c3e8d1b4a5c6f8e9d2a3b7c1e4f9a6b2d3c5e7f8a1b9c4d6e2f7a3b5c1"
    "NODE_ENV" = "production"
    "FRONTEND_URL" = "https://vyapar-pos.vercel.app" # Production frontend URL
    "EMAIL_HOST" = "smtp.gmail.com"
    "EMAIL_PORT" = "587"
    "EMAIL_USER" = "raismansuri74059@gmail.com"
    "EMAIL_PASS" = "innyzgcukzeqqqyr"
    "EMAIL_FROM" = "Vyapar POS <raismansuri74059@gmail.com>"
    "GROQ_API_KEY" = "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"
    "GROQ_MODEL" = "llama-3.1-8b-instant"
    "S3_ENDPOINT" = "https://ygkxcbwsyvowvdrasmmx.supabase.co/storage/v1/s3"
    "S3_REGION" = "ap-northeast-2"
    "S3_ACCESS_KEY_ID" = "ea073a7dfaed14e4d40f31ed8c601c88"
    "S3_SECRET_ACCESS_KEY" = "2dfad8d371508660c621a01579fe6cbd0208e8d7995d9a553e26dc1c3256bd4f"
    "S3_BUCKET_NAME" = "vyapar_POS_Image"
}

Write-Host "--- Setting up Vercel Environment Variables ---" -ForegroundColor Cyan

foreach ($key in $envVars.Keys) {
    $val = $envVars[$key]
    Write-Host "Adding $key..." -ForegroundColor Yellow
    # Note: Using echo $val | npx vercel env add $key production
    echo $val | npx vercel env add $key production
}

Write-Host "`n--- Setup Complete! ---" -ForegroundColor Green
Write-Host "Please run 'npx vercel --prod' to deploy your application with the new environment variables." -ForegroundColor Gray
