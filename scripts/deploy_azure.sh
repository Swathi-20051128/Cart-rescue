#!/bin/bash
# CartGuard AI - Azure Container Apps Deployment Script (Bash)
# Works on Azure for Students & Standard Subscriptions

RESOURCE_GROUP="rg-cartguard-ai"
LOCATION="eastus"
RAND_ID=$((RANDOM % 9000 + 1000))
APP_NAME="cartguard-ai-$RAND_ID"

echo "🚀 Starting CartGuard AI Azure Deployment..."

# 1. Check Azure Login
az account show > /dev/null 2>&1
if [ $? -ne 0 ]; then
    az login
fi

# 2. Create Resource Group
echo "2. Creating Resource Group '$RESOURCE_GROUP' in $LOCATION..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# 3. Create Azure Container Registry (ACR)
ACR_NAME="acr${RAND_ID}cartguard"
echo "3. Creating Azure Container Registry '$ACR_NAME'..."
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true

# Login to ACR
az acr login --name $ACR_NAME

# 4. Build & Push Docker Images
echo "4. Building & Pushing Backend Image..."
docker build -t "$ACR_NAME.azurecr.io/cartguard-backend:latest" ./backend
docker push "$ACR_NAME.azurecr.io/cartguard-backend:latest"

echo "Building & Pushing Dashboard Image..."
docker build -t "$ACR_NAME.azurecr.io/cartguard-dashboard:latest" ./dashboard
docker push "$ACR_NAME.azurecr.io/cartguard-dashboard:latest"

# 5. Create Azure Container Apps Environment
echo "5. Creating Container Apps Environment..."
az containerapp env create \
  --name "env-cartguard" \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# 6. Deploy Backend App
echo "6. Deploying Backend API Container App..."
az containerapp create \
  --name "cartguard-backend" \
  --resource-group $RESOURCE_GROUP \
  --environment "env-cartguard" \
  --image "$ACR_NAME.azurecr.io/cartguard-backend:latest" \
  --target-port 8000 \
  --ingress external \
  --registry-server "$ACR_NAME.azurecr.io" \
  --registry-username $ACR_NAME \
  --registry-password $ACRPassword \
  --env-vars "LLM_PROVIDER=groq"

BACKEND_URL=$(az containerapp show --name "cartguard-backend" --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)

# 7. Deploy Dashboard App
echo "7. Deploying Dashboard Container App..."
az containerapp create \
  --name "cartguard-dashboard" \
  --resource-group $RESOURCE_GROUP \
  --environment "env-cartguard" \
  --image "$ACR_NAME.azurecr.io/cartguard-dashboard:latest" \
  --target-port 8501 \
  --ingress external \
  --registry-server "$ACR_NAME.azurecr.io" \
  --registry-username $ACR_NAME \
  --registry-password $ACRPassword \
  --env-vars "API_BASE_URL=https://$BACKEND_URL"

DASHBOARD_URL=$(az containerapp show --name "cartguard-dashboard" --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)

echo "🎉 Deployment Complete!"
echo "🌐 Backend API URL:   https://$BACKEND_URL"
echo "🛒 Dashboard URL:     https://$DASHBOARD_URL"
