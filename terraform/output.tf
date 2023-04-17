output "aci_url" {
    value = azurerm_container_group.aci.dns_name_label
}