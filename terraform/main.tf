
provider "azurerm" {
  # ... other provider configuration ...
  features {}
  # client_id     = var.ARM_CLIENT_ID
  # client_secret = var.ARM_CLIENT_SECRET
  # tenant_id     = var.ARM_TENANT_ID
  # subscription_id = "5524a9f3-2588-4778-b99c-618dd11ae068"
}

resource "azurerm_resource_group" "aci" {
  name     = "aci-resource-group"
  location = var.location
}







