
provider "azurerm" {
  # ... other provider configuration ...
  features {}
  client_id            = var.ARM_CLIENT_ID
  client_secret        = var.ARM_CLIENT_SECRET
  tenant_id            = var.ARM_TENANT_ID
  subscription_id      = var.ARM_SUBSCRIPTION_ID
  # resource_group_name  = "runx-rg"
  # storage_account_name = "runxstorage"
  # container_name       = "tfstate"
  # key                  = "prod.terraform.tfstate"
}

resource "azurerm_resource_group" "aci" {
  name     = "aci-resource-group"
  location = var.location
}







