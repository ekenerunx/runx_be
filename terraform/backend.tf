terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "=3.0.0"

    }
  }
    backend "azurerm" {
    resource_group_name  = "runx-rg"
    storage_account_name = "runxstorage"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}