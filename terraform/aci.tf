
resource "azurerm_container_group" "aci" {
  name                = "myaci"
  location            = data.azurerm_resource_group.aci.location
  resource_group_name = data.azurerm_resource_group.aci.name
  #   subnet_ids          = [azurerm_subnet.aci.id]
  ip_address_type = "Public"

  os_type        = "Linux"
  dns_name_label = "fixas-dev-mci"

  container {
    name   = "nginx"
    image  = "emmanuelekama/runx:${var.image_tag}"
    cpu    = "0.5"
    memory = "1.5"
    ports {
      port     = 5000
      protocol = "TCP"
    }
    environment_variables = var.runx_env
  }

  exposed_port = [{
    port     = 5000
    protocol = "TCP"
  }]


  tags = {
    Environment = "Dev"
  }
}

