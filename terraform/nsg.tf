# resource "azurerm_network_security_group" "aci" {
#   name                = "aci-nsg"
#   location            = azurerm_resource_group.aci.location
#   resource_group_name = azurerm_resource_group.aci.name

#   security_rule {
#     name                       = "allow-http"
#     priority                   = 100
#     direction                  = "Inbound"
#     access                     = "Allow"
#     protocol                   = "Tcp"
#     source_port_range          = "*"
#     destination_port_range     = "80"
#     source_address_prefix      = "*"
#     destination_address_prefix = "*"
#   }
# }
