variable "location" {
  default = "westus2"
}

variable "image_tag" {
  description = "this tag is used to deploy the latest build"
}

variable "resource_group_name" {
  default = "dev-resource"
}

# variable "ARM_TENANT_ID" {

# }
# variable "ARM_CLIENT_SECRET" {

# }
# variable "ARM_CLIENT_ID" {

# }
# variable "ARM_SUBSCRIPTION_ID" {

# }

variable "runx_env" {
  default = {
    DATABASE_TYPE     = "postgres"
    DATABASE_HOST     = "isilo.db.elephantsql.com"
    DATABASE_PORT     = "5432"
    DATABASE_USERNAME = "pdoparcr"
    DATABASE_PASSWORD = "bjyTuyO4PuTGsIn2sAhUXIL1hLQVA0fo"
    DATABASE_NAME     = "pdoparcr"

    DATABASE_CONNECTION_URL = "postgres://pdoparcr:bjyTuyO4PuTGsIn2sAhUXIL1hLQVA0fo@isilo.db.elephantsql.com/pdoparcr"
    JWT_SECRET              = "tukuyoma"
    JWT_EXPIRE_IN           = "60s"
    TERMII_API_kEY          = "TL8XuX5Wg8AKNJtm7e293KvqGwViDjEJPlberqKKb8LWyGb0vAZgCFQw6mClXN"
    TERMII_SMS_FROM         = "odemru"
    REDIS_HOST              = "redis-19720.c276.us-east-1-2.ec2.cloud.redislabs.com"
    REDIS_PORT              = "19720"
    REDIS_USERNAME          = "default"
    REDIS_PASSWORD          = "C75W4bfBjjyHpg4TNEsxIDHIxRx2oX6E"
    PAYSTACK_SECRET_KEY     = "sk_test_c13f4d0501916157cf87b0a843da9a6129a4dbcd"
  }
}

