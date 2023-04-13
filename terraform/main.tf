
provider "azurerm" {
  # ... other provider configuration ...
  features {}
}

resource "azurerm_resource_group" "aci" {
  name     = "aci-resource-group"
  location = var.location
}







