# variable "AWS_SECRET_ACCESS_KEY" {
#   type = string
# }

# variable "AWS_SECREY_KEY_ID" {
#   type = string
# }

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2" # Oregon
}

variable "db_identifier" {
  description = "Set identifier - can be the same as database name"
  type = string
  default = "tx-data-dev"
}

variable "db_name" {
  description = "Database to connect to (optional)"
  type = string
  default = "tx-data-dev"
}

variable "db_username" {
  description = "Username for the server connection"
  type = string
  default = "admin"
}

variable "db_password" {
  description = "Password for the server connection"
  type = string
  sensitive = true
}

variable "postgres_instance_name" {
  description = "A unique name for the DB instance that is unique for your account in the Region you selected"
  type = string
  default = "tx-data-dev"
}

variable "postgres_port" {
  description = "The port for the postgresql server connection"
  type = number
  default = 5432

}
