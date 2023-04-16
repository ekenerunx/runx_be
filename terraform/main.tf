
provider "azurerm" {
  # ... other provider configuration ...
  features {}
  client_id            = "f9e112f2-1762-48ff-ba9c-66273945a9ab"
  client_secret        = "wqz8Q~xONmch9DhQIOwpfPRhp4G3u9X_4uT6hawR"
  tenant_id            = "d4089321-fbce-468b-b16b-b3cc8e265717"
  subscription_id      = "5524a9f3-2588-4778-b99c-618dd11ae068"
#   export ARM_CLIENT_ID="f9e112f2-1762-48ff-ba9c-66273945a9ab"
# export ARM_CLIENT_SECRET="wqz8Q~xONmch9DhQIOwpfPRhp4G3u9X_4uT6hawR"
# export ARM_TENANT_ID="d4089321-fbce-468b-b16b-b3cc8e265717"
# export ARM_SUBSCRIPTION_ID="5524a9f3-2588-4778-b99c-618dd11ae068"
  # resource_group_name  = "runx-rg"
  # storage_account_name = "runxstorage"
  # container_name       = "tfstate"
  # key                  = "prod.terraform.tfstate"
}

resource "azurerm_resource_group" "aci" {
  name     = "aci-resource-group"
  location = var.location
}







