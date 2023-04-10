terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "=3.0.0"
    }
  }
  #   backend "azurerm" {
  #   resource_group_name  = "runx-rg"
  #   storage_account_name = "runxstorage"
  #   container_name       = "tfstate"
  #   key                  = "prod.terraform.tfstate"
  # }
}
provider "azurerm" {
  # ... other provider configuration ...
  features {}
}

resource "azurerm_resource_group" "aci" {
  name     = "aci-resource-group"
  location = var.location
}


# {
#   "appId": "eb2dc7c4-d00e-4e63-a2aa-ee0ad3b3adf0",
#   "displayName": "azure-cli-2023-04-01-14-56-51",
#   "password": "klA8Q~C4b8v2QwIa5vElnE35ldu8WNY8gpgDUcYT",
#   "tenant": "d4089321-fbce-468b-b16b-b3cc8e265717"
# }

# secret id : c8fda4db-6bae-4df3-a125-8d08fdf64b17
# value : YzY8Q~lLRvx_L2BPCQrWH-lumRsVE395noID5aVd


# export ARM_CLIENT_ID="YzY8Q~lLRvx_L2BPCQrWH-lumRsVE395noID5aVd"
# export ARM_CLIENT_SECRET="c8fda4db-6bae-4df3-a125-8d08fdf64b17"
# export ARM_TENANT_ID="d4089321-fbce-468b-b16b-b3cc8e265717"
# export ARM_SUBSCRIPTION_ID="5524a9f3-2588-4778-b99c-618dd11ae068"




