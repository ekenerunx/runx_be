

resource "azurerm_virtual_network" "aci" {
  name                = "aci-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = data.azurerm_resource_group.aci.location
  resource_group_name = data.azurerm_resource_group.aci.name
}

resource "azurerm_subnet" "aci" {
  name                 = "aci-subnet"
  resource_group_name  = azurerm_resource_group.aci.name
  virtual_network_name = azurerm_virtual_network.aci.name
  address_prefixes     = ["10.0.1.0/24"]
}


