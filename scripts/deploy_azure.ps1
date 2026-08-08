# CartGuard AI - Azure Container Apps Deployment Script (PowerShell)
# Works on Azure for Students & Standard Subscriptions

Param(
    [string]$ResourceGroup = "rg-cartguard-ai",
    [string]$Location = "eastus",
    [string]$AppName = "cartguard-ai-$((Get-Random -Minimum 1000 -Maximum 9999))"
)

Write-Host "🚀 Starting CartGuard AI Azure Deployment..." -ForegroundColor Green

# 1. Login & Register Providers
Write-Host "1. Checking Azure Login..." -ForegroundColor Cyan
az account show | Out-Null
if ($LASTEXITCODE -ne 0) {
    az login
}

# 2. Create Resource Group
Write-Host "2. Creating Resource Group '$ResourceGroup' in $Location..." -ForegroundColor Cyan
az group create --name $ResourceGroup --location $Location

# 3. Create Azure Container Registry (ACR)
$ACRName = "acr" + ($AppName -replace '[^a-zA-Z0-9]', '').ToLower()
Write-Host "3. Creating Azure Container Registry '$ACRName'..." -ForegroundColor Cyan
az acr create --resource-group $ResourceGroup --name $ACRName --sku Basic --admin-enabled true

# Log into ACR
Write-Host "Logging into ACR..." -ForegroundColor Cyan
az acr login --name $ACRName

# 4. Build & Push Docker Images
Write-Host "4. Building & Pushing Backend Image..." -ForegroundColor Cyan
docker build -t "$ACRName.azurecr.io/cartguard-backend:latest" ./backend
docker push "$ACRName.azurecr.io/cartguard-backend:latest"

Write-Host "Building & Pushing Dashboard Image..." -ForegroundColor Cyan
docker build -t "$ACRName.azurecr.io/cartguard-dashboard:latest" ./dashboard
docker push "$ACRName.azurecr.io/cartguard-dashboard:latest"

# 5. Create Azure Container Apps Environment
Write-Host "5. Creating Container Apps Environment..." -ForegroundColor Cyan
az containerapp env create `
  --name "env-cartguard" `
  --resource-group $ResourceGroup `
  --location $Location

# Get ACR Password
$ACRPassword = az acr credential show --name $ACRName --query "passwords[0].value" -o tsv

# 6. Deploy Backend Container App
Write-Host "6. Deploying Backend API Container App..." -ForegroundColor Cyan
az containerapp create `
  --name "cartguard-backend" `
  --resource-group $ResourceGroup `
  --environment "env-cartguard" `
  --image "$ACRName.azurecr.io/cartguard-backend:latest" `
  --target-port 8000 `
  --ingress external `
  --registry-server "$ACRName.azurecr.io" `
  --registry-username $ACRName `
  --registry-password $ACRPassword `
  --env-vars "LLM_PROVIDER=groq" "GROQ_API_KEY=your_groq_key"

$BackendUrl = az containerapp show --name "cartguard-backend" --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv
Write-Host "✅ Backend API deployed at: https://$BackendUrl" -ForegroundColor Green

# 7. Deploy Dashboard Container App
Write-Host "7. Deploying Dashboard Container App..." -ForegroundColor Cyan
az containerapp create `
  --name "cartguard-dashboard" `
  --resource-group $ResourceGroup `
  --environment "env-cartguard" `
  --image "$ACRName.azurecr.io/cartguard-dashboard:latest" `
  --target-port 8501 `
  --ingress external `
  --registry-server "$ACRName.azurecr.io" `
  --registry-username $ACRName `
  --registry-password $ACRPassword `
  --env-vars "API_BASE_URL=https://$BackendUrl"

$DashboardUrl = az containerapp show --name "cartguard-dashboard" --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "🌐 Backend API URL:   https://$BackendUrl" -ForegroundColor Yellow
Write-Host "🛒 Dashboard URL:     https://$DashboardUrl" -ForegroundColor Yellow
